import os
from datetime import datetime, timedelta, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from config import users_col, preferences_col, job_alerts_col, job_links_col
from services.job_fetcher import fetch_jobs
from services.ai_filter import filter_jobs
from services.cover_letter import generate_cover_letter
from services.email_sender import send_email, send_no_jobs_email
from services.rate_limiter import check_and_increment
from services.resume_parser import get_resume_text

IST = timezone(timedelta(hours=5, minutes=30))


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

        jobs = fetch_jobs(job_title=prefs["job_title"], location=prefs["location"])
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
    now_time = datetime.now().strftime("%H:%M")
    print(f"[scheduler] Tick at {now_time}")

    cursor = users_col.find({"active": True})
    async for user in cursor:
        user_id = str(user["_id"])
        prefs   = await preferences_col.find_one({"user_id": user_id})
        if not prefs:
            continue
        if now_time == prefs.get("schedule_time", "09:00"):
            print(f"[scheduler] Time matched for {user.get('name')} at {now_time}")
            await run_for_user(user, prefs)


def start_scheduler():
    scheduler = AsyncIOScheduler()

    scheduler.add_job(
        scheduled_job,
        trigger          = "interval",
        minutes          = 1,
        id               = "job_bot_scheduler",
        name             = "Job Bot Scheduler",
        replace_existing = True,
    )

    scheduler.add_job(
        cleanup_old_alerts,
        trigger          = "cron",
        hour             = 0,
        minute           = 0,
        id               = "cleanup_scheduler",
        name             = "Cleanup Old Alerts",
        replace_existing = True,
    )

    scheduler.start()
    print("[scheduler] Scheduler started — checking every minute")
    print("[scheduler] Cleanup job scheduled — runs daily at midnight")
    return scheduler