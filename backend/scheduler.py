import os
from datetime import datetime, timedelta, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from config import users_col, preferences_col, job_alerts_col, job_links_col
from services.job_fetcher import fetch_jobs
from services.ai_filter import filter_jobs
from services.cover_letter import generate_cover_letter
from services.whatsapp_sender import send_whatsapp
from services.rate_limiter import check_and_increment

IST = timezone(timedelta(hours=5, minutes=30))


async def cleanup_old_alerts():
    cutoff_alerts = datetime.utcnow() - timedelta(days=6)
    cutoff_links  = datetime.utcnow() - timedelta(days=30)
    r1 = await job_alerts_col.delete_many({"sent_at": {"$lt": cutoff_alerts}})
    r2 = await job_links_col.delete_many({"sent_at":  {"$lt": cutoff_links}})
    print(f"[scheduler] Deleted {r1.deleted_count} alerts (6d) | {r2.deleted_count} links (30d)")


async def run_for_user(user: dict, prefs: dict):
    name      = user.get("name", "User")
    phone     = user.get("phone", "")
    user_id   = str(user["_id"])
    your_name = os.getenv("YOUR_NAME", name)

    use_ai_filter    = prefs.get("use_ai_filter",    True)
    use_cover_letter = prefs.get("use_cover_letter", True)
    send_wa          = prefs.get("send_whatsapp",    True)

    print(f"\n[scheduler] Running for {name}")
    print(f"[scheduler] Toggles: AI:{use_ai_filter} | CoverLetter:{use_cover_letter} | WhatsApp:{send_wa}")

    if not phone:
        print(f"[scheduler] No phone for {name} — skipping")
        return

    try:
        # rate limit checks
        jsearch_check = await check_and_increment("jsearch", cost=1)
        if not jsearch_check["allowed"]:
            print(f"[scheduler] {jsearch_check['reason']} — skipping {name}")
            return

        if use_ai_filter or use_cover_letter:
            groq_check = await check_and_increment("groq", cost=10)
            if not groq_check["allowed"]:
                print(f"[scheduler] {groq_check['reason']} — skipping {name}")
                return

        if send_wa:
            twilio_check = await check_and_increment("twilio", cost=6)
            if not twilio_check["allowed"]:
                print(f"[scheduler] {twilio_check['reason']} — skipping {name}")
                return

        # Step 1: Fetch
        jobs = fetch_jobs(job_title=prefs["job_title"], location=prefs["location"])
        if not jobs:
            print(f"[scheduler] No jobs found for {name}")
            return

        # Step 2: Deduplicate
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
            return

        # Step 3: AI filter
        if use_ai_filter:
            jobs = filter_jobs(jobs, prefs)
            if not jobs:
                print(f"[scheduler] No jobs passed min_score for {name}")
                return
        else:
            print(f"[scheduler] AI filter SKIPPED")

        # Step 4: Cover letters
        if use_cover_letter:
            jobs = [generate_cover_letter(job, prefs, your_name) for job in jobs]
        else:
            print(f"[scheduler] Cover letter SKIPPED")

        # Step 5: WhatsApp
        if send_wa:
            send_whatsapp(jobs, phone)
        else:
            print(f"[scheduler] WhatsApp SKIPPED")

        # Step 6: Save full job data
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

        # Step 7: Save lightweight links
        link_docs = [
            {"user_id": user_id, "link": job.get("apply_link", "").strip(), "sent_at": now}
            for job in jobs if job.get("apply_link", "").strip()
        ]
        if link_docs:
            await job_links_col.insert_many(link_docs)

        action = "sent via WhatsApp" if send_wa else "saved to history"
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