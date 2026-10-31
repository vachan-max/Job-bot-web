import os
import uuid
import traceback
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from config import users_col, preferences_col, job_alerts_col, job_links_col, job_searches_col, job_search_results_col, scheduled_job_links_col
from services.job_fetcher import fetch_jobs
from services.ai_filter import filter_jobs
from services.cover_letter import generate_cover_letter
from services.email_sender import send_email, send_no_jobs_email
from services.rate_limiter import check_and_increment
from services.resume_parser import get_resume_text

IST = timezone(timedelta(hours=5, minutes=30))
SAVED_SEARCH_TIMEZONE = "Asia/Kolkata"
_scheduler = None


def calculate_next_run(schedule_time: str, timezone_name: str | None = None, now: datetime | None = None) -> datetime:
    """Return the next scheduled instant as an aware UTC datetime."""
    from datetime import time as day_time
    # Saved-search schedules use one fixed timezone. Ignore stale timezone values
    # from older records and older clients, including explicit nulls.
    zone = ZoneInfo(SAVED_SEARCH_TIMEZONE)
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    local_now = now.astimezone(zone)
    hour, minute = map(int, schedule_time.split(":"))
    candidate = local_now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if candidate <= local_now:
        candidate = (candidate + timedelta(days=1)).replace(hour=hour, minute=minute, second=0, microsecond=0)
    # Construct the wall time afresh so a DST transition uses the zone's applicable offset.
    candidate = datetime.combine(candidate.date(), day_time(hour, minute), tzinfo=zone)
    if candidate.astimezone(timezone.utc) <= now.astimezone(timezone.utc):
        tomorrow = local_now.date() + timedelta(days=1)
        candidate = datetime.combine(tomorrow, day_time(hour, minute), tzinfo=zone)
    return candidate.astimezone(timezone.utc)


def dedupe_new_jobs(jobs: list[dict], seen_job_ids: list[str] | set[str]) -> tuple[list[dict], list[str]]:
    from services.job_finder.pipeline import canonical_link
    seen = set(seen_job_ids or [])
    fresh, new_ids = [], []
    for job in jobs:
        key = canonical_link(job.get("apply_link", ""))
        if not key or key in seen:
            continue
        seen.add(key)
        job["dedupe_key"] = key
        fresh.append(job)
        new_ids.append(key)
    return fresh, new_ids


async def run_scheduled_search(search: dict, user_override: dict | None = None, force: bool = False):
    """Run one already-claimed saved-search schedule and persist its outcome."""
    from bson import ObjectId
    from models.job_finder import JobSearchFilters
    from services.job_finder.pipeline import discover_jobs, score_jobs, canonical_link
    from services.email_sender import send_scheduled_matches_email

    search_id = str(search["_id"])
    schedule = search
    user_id = search.get("user_id", "")
    now = datetime.now(timezone.utc)
    usage = {}
    try:
        current = await job_searches_col.find_one({"_id": search["_id"], **({} if force else {"schedule_enabled": True})})
        if not current or current.get("lock_token") != schedule.get("_lock_token"):
            return
        user = user_override or await users_col.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise RuntimeError("Scheduled search user no longer exists")
        filters = JobSearchFilters.model_validate(search.get("filters") or {})
        serpapi_allowed = False
        if os.getenv("SERPAPI_API_KEY") or os.getenv("SERPAPI_KEY"):
            cost = min(3, max(1, len(filters.locations)))
            check = await check_and_increment("serpapi", cost=cost, user_id="global")
            if check["allowed"]:
                check = await check_and_increment("serpapi", cost=cost, user_id=user_id)
            if check["allowed"]:
                usage["serpapi"] = cost
                serpapi_allowed = True

        async def allow_jsearch():
            check = await check_and_increment("jsearch", user_id="global")
            if check["allowed"]:
                check = await check_and_increment("jsearch", user_id=user_id)
            if check["allowed"]:
                usage["jsearch"] = 1
                return True
            return False

        jobs, provider, fallback_reason = await discover_jobs(filters, serpapi_allowed, allow_jsearch)
        if os.getenv("FIRECRAWL_API_KEY"):
            from services.job_finder.providers.firecrawl import enrich_description
            for job in [item for item in jobs if len(str(item.get("description") or "").strip()) < 300][:5]:
                check = await check_and_increment("firecrawl", user_id="global")
                if check["allowed"]:
                    check = await check_and_increment("firecrawl", user_id=user_id)
                if not check["allowed"]:
                    break
                from starlette.concurrency import run_in_threadpool
                description = await run_in_threadpool(enrich_description, job)
                if description:
                    job["description"] = description
                    job["details_source"] = "Firecrawl"
        resume_text = await get_resume_text(user_id)
        groq_check = await check_and_increment("groq", user_id="global")
        if groq_check["allowed"]:
            groq_check = await check_and_increment("groq", user_id=user_id)
        if groq_check["allowed"] and os.getenv("GROQ_API_KEY"):
            from starlette.concurrency import run_in_threadpool
            jobs = await run_in_threadpool(score_jobs, jobs, filters, resume_text)
            jobs.sort(key=lambda item: item.get("match_score", -1), reverse=True)
            usage["groq"] = 1

        jobs = jobs[:filters.results_limit]
        unique_jobs, new_ids = dedupe_new_jobs(jobs, search.get("seen_job_ids", []))

        email_sent = False
        email_error = ""
        current = await job_searches_col.find_one({"_id": search["_id"], **({} if force else {"schedule_enabled": True})})
        if not current or current.get("lock_token") != schedule.get("_lock_token"):
            return
        if unique_jobs and schedule.get("email_enabled", True):
            email_check = await check_and_increment("email", user_id="global")
            if email_check["allowed"]:
                email_check = await check_and_increment("email", user_id=user_id)
            if not email_check["allowed"]:
                email_error = email_check.get("reason", "Email quota unavailable")
            elif user.get("email"):
                # Check existence and ownership immediately before email delivery;
                # deletion removes this document and thereby cancels an in-flight run.
                current = await job_searches_col.find_one({"_id": search["_id"], "user_id": user_id, "lock_token": schedule.get("_lock_token")})
                if not current:
                    return
                from starlette.concurrency import run_in_threadpool
                email_sent = await run_in_threadpool(
                    send_scheduled_matches_email,
                    unique_jobs,
                    user["email"],
                    ", ".join(filters.job_titles),
                )
                if not email_sent:
                    email_error = "Email delivery failed."
            else:
                email_error = "The account has no email address."

        # Recheck after any email work so deletion during the run cannot persist results.
        current = await job_searches_col.find_one({"_id": search["_id"], "user_id": user_id, "lock_token": schedule.get("_lock_token")})
        if not current:
            return

        # Record only delivered or intentionally email-disabled results.
        if unique_jobs and (email_sent or not schedule.get("email_enabled", True)):
            docs = []
            for job in unique_jobs:
                job.update({"search_id": search_id, "user_id": user_id, "created_at": now})
                docs.append(job)
            if docs:
                await job_search_results_col.bulk_write([
                    __import__("pymongo").UpdateOne(
                        {"search_id": search_id, "user_id": user_id, "dedupe_key": job["dedupe_key"]},
                        {"$set": job},
                        upsert=True,
                    )
                    for job in docs
                ], ordered=False)
            await scheduled_job_links_col.bulk_write([
                __import__("pymongo").UpdateOne(
                    {"user_id": user_id, "search_id": search_id, "link": job["dedupe_key"]},
                    {"$setOnInsert": {"user_id": user_id, "search_id": search_id, "link": job["dedupe_key"], "sent_at": now}},
                    upsert=True,
                )
                for job in unique_jobs
            ], ordered=False)

        status = "error" if email_error else ("new_jobs" if unique_jobs else "no_new_jobs")
        next_run = calculate_next_run(schedule.get("schedule_time") or "09:00", SAVED_SEARCH_TIMEZONE, now)
        await job_searches_col.update_one({"_id": search["_id"], "user_id": user_id, "lock_token": schedule.get("_lock_token")}, {"$set": {
            "last_run": now, "last_run_status": status, "last_new_count": len(unique_jobs),
            "timezone": SAVED_SEARCH_TIMEZONE, "last_error": email_error,
            "last_persistence_error": "", "next_run": next_run, "last_email_sent": email_sent,
            "last_provider": provider, "last_fallback_reason": fallback_reason,
            "last_usage": usage, "seen_job_ids": list(set(search.get("seen_job_ids", [])) | set(new_ids)),
        }})
        return {"status": status, "new_count": len(unique_jobs), "email_sent": email_sent, "jobs": unique_jobs}
    except Exception as exc:
        print(f"[scheduler] Saved search {search_id} failed: {exc}\n{traceback.format_exc()}")
        next_run = calculate_next_run(schedule.get("schedule_time") or "09:00", SAVED_SEARCH_TIMEZONE, now)
        await job_searches_col.update_one({"_id": search["_id"], "lock_token": schedule.get("_lock_token")}, {"$set": {
            "last_run": now, "last_run_status": "error", "last_new_count": len(locals().get("unique_jobs", [])),
            "timezone": SAVED_SEARCH_TIMEZONE, "last_error": str(exc)[:500],
            "last_persistence_error": str(exc)[:500],
            "last_email_sent": bool(locals().get("email_sent")), "next_run": next_run,
        }})
        if force:
            # The email may already have been accepted by the provider. Return a
            # partial-success result instead of inviting a retry that sends twice.
            if locals().get("email_sent"):
                return {
                    "status": "new_jobs", "new_count": len(locals().get("unique_jobs", [])),
                    "email_sent": True, "persistence_error": str(exc)[:500],
                    "jobs": locals().get("unique_jobs", []),
                }
            raise
        return {"status": "error", "new_count": 0, "error": str(exc)[:500]}
    finally:
        await job_searches_col.update_one(
            {"_id": search["_id"], "lock_token": schedule.get("_lock_token")},
            {"$unset": {"locked_until": "", "lock_token": ""}},
        )


async def run_saved_search_once(search: dict, user: dict):
    now = datetime.now(timezone.utc)
    lease = now + timedelta(minutes=5)
    lock_token = str(uuid.uuid4())
    claimed = await job_searches_col.update_one(
        {"_id": search["_id"], "$or": [{"locked_until": None}, {"locked_until": {"$exists": False}}, {"locked_until": {"$lte": now}}]},
        {"$set": {"locked_until": lease, "lock_token": lock_token}},
    )
    if not claimed.matched_count:
        raise RuntimeError("This saved search is already running")
    search["locked_until"] = lease
    search["_lock_token"] = lock_token
    result = await run_scheduled_search(search, user_override=user, force=True)
    if result is None:
        raise RuntimeError("Saved search could not be claimed")
    return result


async def scheduled_searches_job():
    now = datetime.now(timezone.utc)
    cursor = job_searches_col.find({"schedule_enabled": True, "next_run": {"$lte": now}, "$or": [{"locked_until": None}, {"locked_until": {"$exists": False}}, {"locked_until": {"$lte": now}}]})
    async for search in cursor:
        lease = now + timedelta(minutes=5)
        lock_token = str(uuid.uuid4())
        claimed = await job_searches_col.update_one(
            {"_id": search["_id"], "schedule_enabled": True, "next_run": {"$lte": now}, "$or": [{"locked_until": None}, {"locked_until": {"$exists": False}}, {"locked_until": {"$lte": now}}]},
            {"$set": {"locked_until": lease, "lock_token": lock_token}},
        )
        if claimed.modified_count:
            search["locked_until"] = lease
            search["_lock_token"] = lock_token
            await run_scheduled_search(search)


async def clear_stale_search_locks():
    now = datetime.now(timezone.utc)
    result = await job_searches_col.update_many(
        {"locked_until": {"$lte": now}},
        {"$unset": {"locked_until": "", "lock_token": ""}},
    )
    print(f"[scheduler] Cleared {result.modified_count} expired saved-search locks")


async def cleanup_old_alerts():
    cutoff_alerts = datetime.utcnow() - timedelta(days=6)
    cutoff_links  = datetime.utcnow() - timedelta(days=30)
    r1 = await job_alerts_col.delete_many({"sent_at": {"$lt": cutoff_alerts}})
    r2 = await job_links_col.delete_many({"sent_at":  {"$lt": cutoff_links}})
    print(f"[scheduler] Deleted {r1.deleted_count} alerts (6d) | {r2.deleted_count} links (30d)")


async def run_for_user(user: dict, prefs: dict):
    name       = user.get("name", "User")
    user_email = user.get("email", "")
    user_id    = str(user["_id"])
    your_name  = os.getenv("YOUR_NAME", name)

    use_ai_filter     = prefs.get("use_ai_filter",    True)
    use_cover_letter  = prefs.get("use_cover_letter", True)
    send_email_toggle = prefs.get("send_whatsapp",    True)

    print(f"\n[scheduler] Running for {name} → {user_email}")
    print(f"[scheduler] Toggles: AI:{use_ai_filter} | CoverLetter:{use_cover_letter} | Email:{send_email_toggle}")

    if not user_email:
        print(f"[scheduler] No email for {name} — skipping")
        return

    try:
        # ── Fetch resume ──────────────────────────────────
        resume_text = await get_resume_text(user_id)
        if not resume_text:
            print(f"[scheduler] No resume for {name} — match % will be 0")

        # ── Step 1: JSearch rate limit + Fetch ───────────
        jsearch_check = await check_and_increment("jsearch", cost=1, user_id=user_id)
        if not jsearch_check["allowed"]:
            print(f"[scheduler] {jsearch_check['reason']} — skipping {name}")
            return

        print(f"[scheduler] JSearch {jsearch_check['daily_used']}/3 today for {name}")

        jobs = fetch_jobs(job_title=prefs["job_title"], location=prefs["location"],experience=prefs.get("experience", ""))
        if not jobs:
            print(f"[scheduler] No jobs found for {name}")
            if send_email_toggle:
                send_no_jobs_email(user_email, name, reason="No jobs found from search today.")
            return

        # ── Step 2: Deduplicate ───────────────────────────
        sent_cursor  = job_links_col.find({"user_id": user_id}, {"link": 1})
        already_sent = set()
        async for doc in sent_cursor:
            link = doc.get("link", "").strip()
            if link:
                already_sent.add(link)

        jobs = [j for j in jobs if j.get("apply_link", "").strip() not in already_sent]

        seen_links  = set()
        unique_jobs = []
        for j in jobs:
            link = j.get("apply_link", "").strip()
            if link and link not in seen_links:
                seen_links.add(link)
                unique_jobs.append(j)
        jobs = unique_jobs

        if not jobs:
            print(f"[scheduler] No new jobs for {name} today")
            if send_email_toggle:
                send_no_jobs_email(user_email, name, reason="All matching jobs were already sent to you.")
            return

        # ── Step 3: AI filter — only if toggle ON ────────
        if use_ai_filter:
            groq_check = await check_and_increment("groq", cost=5, user_id=user_id)
            if not groq_check["allowed"]:
                print(f"[scheduler] {groq_check['reason']} — skipping AI filter for {name}")
                return
            jobs = filter_jobs(jobs, prefs, resume_text=resume_text)
            if not jobs:
                print(f"[scheduler] No jobs passed min_score for {name}")
                if send_email_toggle:
                    send_no_jobs_email(user_email, name, reason="No jobs matched your minimum AI score today. Try lowering your min score.")
                return
            print(f"[scheduler] AI filter done — {len(jobs)} jobs passed")
        else:
            print(f"[scheduler] AI filter SKIPPED")

        # ── Step 4: Cover letters — only if toggle ON ─────
        if use_cover_letter:
            cover_check = await check_and_increment("groq", cost=5, user_id=user_id)
            if not cover_check["allowed"]:
                print(f"[scheduler] {cover_check['reason']} — skipping cover letters for {name}")
                return
            jobs = [generate_cover_letter(job, prefs, your_name, resume_text=resume_text) for job in jobs]
            print(f"[scheduler] Cover letters generated")
        else:
            print(f"[scheduler] Cover letter SKIPPED")

        # ── Step 5: Email — only if toggle ON ────────────
        if send_email_toggle:
            email_check = await check_and_increment("email", cost=1, user_id=user_id)
            if not email_check["allowed"]:
                print(f"[scheduler] {email_check['reason']} — skipping email for {name}")
                return
            print(f"[scheduler] Sending email to {user_email}...")
            send_email(jobs, user_email, prefs=prefs)
        else:
            print(f"[scheduler] Email SKIPPED — saving to history only")

        # ── Step 6: Save full job data ────────────────────
        now  = datetime.now(IST).replace(tzinfo=None)
        docs = [
            {
                "user_id"      : user_id,
                "job_title"    : job.get("job_title", ""),
                "company"      : job.get("company", ""),
                "location"     : job.get("location", ""),
                "ai_score"     : job.get("ai_score", 0),
                "match_percent": job.get("match_percent", 0),
                "cover_letter" : job.get("cover_letter", ""),
                "apply_link"   : job.get("apply_link", ""),
                "sent_at"      : now,
            }
            for job in jobs
        ]
        if docs:
            await job_alerts_col.insert_many(docs)

        # ── Step 7: Save links for dedup ──────────────────
        link_docs = [
            {"user_id": user_id, "link": job.get("apply_link", "").strip(), "sent_at": now}
            for job in jobs if job.get("apply_link", "").strip()
        ]
        if link_docs:
            await job_links_col.insert_many(link_docs)
            print(f"[scheduler] Saved {len(link_docs)} links for dedup")

        action = "sent via email" if send_email_toggle else "saved to history"
        print(f"[scheduler] Done for {name} — {len(jobs)} jobs {action}")

    except Exception as e:
        print(f"[scheduler] Error for {name}: {e}")


async def scheduled_job():
    now = datetime.now(timezone.utc)
    print(f"[scheduler] Tick at {now.isoformat()}")

    cursor = users_col.find({"active": True})
    async for user in cursor:
        user_id = str(user["_id"])
        prefs   = await preferences_col.find_one({"user_id": user_id})
        if not prefs:
            continue
        try:
            zone = ZoneInfo(prefs.get("timezone", "Asia/Kolkata"))
            local_now = now.astimezone(zone)
            due_date = local_now.strftime("%Y-%m-%d")
            scheduled_time = prefs.get("schedule_time", "09:00")
            if local_now.strftime("%H:%M") < scheduled_time:
                continue
        except Exception as exc:
            print(f"[scheduler] Invalid user schedule for {user.get('name')}: {exc}")
            continue
        claimed = await preferences_col.update_one(
            {"_id": prefs["_id"], "schedule_time": scheduled_time,
             "timezone": prefs.get("timezone", "Asia/Kolkata"),
             "$or": [{"last_attempt_date": {"$ne": due_date}}, {"last_attempt_date": {"$exists": False}}]},
            {"$set": {"last_attempt_date": due_date}},
        )
        if claimed.modified_count:
            print(f"[scheduler] Time due for {user.get('name')} at {scheduled_time}")
            await run_for_user(user, prefs)


def start_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        return _scheduler
    scheduler = AsyncIOScheduler()

    scheduler.add_job(
        scheduled_job,
        trigger          = "interval",
        minutes          = 1,
        id               = "job_bot_scheduler",
        name             = "Job Bot Scheduler",
        replace_existing = True,
        max_instances=1,
        coalesce=True,
    )

    scheduler.add_job(
        cleanup_old_alerts,
        trigger          = "cron",
        hour             = 0,
        minute           = 0,
        id               = "cleanup_scheduler",
        name             = "Cleanup Old Alerts",
        replace_existing = True,
        max_instances=1,
        coalesce=True,
    )

    scheduler.add_job(
        scheduled_searches_job,
        trigger="interval",
        minutes=1,
        id="saved_search_scheduler",
        name="Saved Job Finder Schedules",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )

    scheduler.start()
    _scheduler = scheduler
    print("[scheduler] Scheduler started — checking every minute")
    print("[scheduler] Cleanup job scheduled — runs daily at midnight")
    return scheduler


def get_scheduler_status():
    if not _scheduler or not _scheduler.running:
        return {"running": False, "jobs": []}
    return {"running": True, "jobs": [job.id for job in _scheduler.get_jobs()]}
