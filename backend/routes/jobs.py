from fastapi import APIRouter, Depends, HTTPException
from firebase_auth import verify_token
from config import users_col, preferences_col, job_alerts_col, job_links_col
from services.job_fetcher import fetch_jobs
from services.ai_filter import filter_jobs
from services.cover_letter import generate_cover_letter
from services.email_sender import send_email
from services.rate_limiter import check_and_increment, get_usage
from services.resume_parser import get_resume_text
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import os

router = APIRouter()
IST = timezone(timedelta(hours=5, minutes=30))


def serialize_doc(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


@router.post("/run")
async def run_job_fetch(user_data: dict = Depends(verify_token)):
    firebase_uid = user_data.get("uid")

    user = await users_col.find_one({"firebase_uid": firebase_uid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_id    = str(user["_id"])
    user_email = user.get("email", "")

    if not user_email:
        raise HTTPException(status_code=400, detail="No email found for this account")

    prefs = await preferences_col.find_one({"user_id": user_id})
    if not prefs:
        raise HTTPException(status_code=400, detail="Please set your job preferences first")

    your_name         = os.getenv("YOUR_NAME", user.get("name", "Candidate"))
    use_ai_filter     = prefs.get("use_ai_filter",    True)
    use_cover_letter  = prefs.get("use_cover_letter", True)
    send_email_toggle = prefs.get("send_whatsapp",    True)

    # ── Fetch resume text for this user ──────────────────
    resume_text = await get_resume_text(user_id)
    if not resume_text:
        print("[jobs/run] No resume uploaded — match % will be 0")

    print(f"[jobs/run] Fetching jobs for {user.get('name')} → {user_email}")
    print(f"[jobs/run] Toggles → AI:{use_ai_filter} | CoverLetter:{use_cover_letter} | Email:{send_email_toggle}")

    # ── Step 1: JSearch rate limit + Fetch ───────────────
    jsearch_check = await check_and_increment("jsearch", cost=1, user_id=user_id)
    if not jsearch_check["allowed"]:
        return {"message": f"⚠️ {jsearch_check['reason']}", "jobs_sent": 0}

    print(f"[jobs/run] JSearch {jsearch_check['daily_used']}/3 today")

    jobs = fetch_jobs(job_title=prefs["job_title"], location=prefs["location"])
    if not jobs:
        return {"message": "No jobs found right now. Try again later.", "jobs_sent": 0}

    # ── Step 2: Deduplicate ──────────────────────────────
    sent_cursor  = job_links_col.find({"user_id": user_id}, {"link": 1})
    already_sent = set()
    async for doc in sent_cursor:
        link = doc.get("link", "").strip()
        if link:
            already_sent.add(link)

    print(f"[jobs/run] Dedup: {len(already_sent)} links already sent")

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
        return {"message": "All matching jobs were already sent to you. Check back tomorrow!", "jobs_sent": 0}

    # ── Step 3: AI filter — only increment if toggle ON ──
    if use_ai_filter:
        groq_check = await check_and_increment("groq", cost=5, user_id=user_id)
        if not groq_check["allowed"]:
            return {"message": f"⚠️ {groq_check['reason']}", "jobs_sent": 0}
        print("[jobs/run] Running AI filter...")
        jobs = filter_jobs(jobs, prefs, resume_text=resume_text)
        if not jobs:
            return {"message": "No jobs matched your minimum score. Try lowering min_score.", "jobs_sent": 0}
    else:
        print("[jobs/run] AI filter SKIPPED")

    # ── Step 4: Cover letters — only increment if toggle ON
    if use_cover_letter:
        cover_check = await check_and_increment("groq", cost=5, user_id=user_id)
        if not cover_check["allowed"]:
            return {"message": f"⚠️ {cover_check['reason']}", "jobs_sent": 0}
        print("[jobs/run] Generating cover letters...")
        jobs = [generate_cover_letter(job, prefs, your_name, resume_text=resume_text) for job in jobs]
    else:
        print("[jobs/run] Cover letter SKIPPED")

    # ── Step 5: Email — only increment if toggle ON ───────
    if send_email_toggle:
        email_check = await check_and_increment("email", cost=1, user_id=user_id)
        if not email_check["allowed"]:
            return {"message": f"⚠️ {email_check['reason']}", "jobs_sent": 0}
        print(f"[jobs/run] Sending email to {user_email}...")
        send_email(jobs, user_email, prefs=prefs)
    else:
        print("[jobs/run] Email SKIPPED — saving to history only")

    # ── Step 6: Save full job data ───────────────────────
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

    # ── Step 7: Save links for dedup ─────────────────────
    link_docs = [
        {"user_id": user_id, "link": job.get("apply_link", "").strip(), "sent_at": now}
        for job in jobs if job.get("apply_link", "").strip()
    ]
    if link_docs:
        await job_links_col.insert_many(link_docs)
        print(f"[jobs/run] Saved {len(link_docs)} links for dedup")

    action = "sent to your email" if send_email_toggle else "saved to History"
    return {"message": f"✅ {len(jobs)} jobs {action}!", "jobs_sent": len(jobs)}


# ── DELETE all history ───────────────────────────────────
@router.delete("/history/all")
async def delete_all_job_alerts(user_data: dict = Depends(verify_token)):
    firebase_uid = user_data.get("uid")
    user = await users_col.find_one({"firebase_uid": firebase_uid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    result = await job_alerts_col.delete_many({"user_id": str(user["_id"])})
    return {"message": f"Deleted {result.deleted_count} job alerts"}


# ── DELETE single alert ──────────────────────────────────
@router.delete("/history/{alert_id}")
async def delete_job_alert(alert_id: str, user_data: dict = Depends(verify_token)):
    firebase_uid = user_data.get("uid")
    user = await users_col.find_one({"firebase_uid": firebase_uid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    result = await job_alerts_col.delete_one({
        "_id"    : ObjectId(alert_id),
        "user_id": str(user["_id"]),
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Job deleted successfully"}


# ── GET history ──────────────────────────────────────────
@router.get("/history")
async def get_job_history(user_data: dict = Depends(verify_token)):
    firebase_uid = user_data.get("uid")
    user = await users_col.find_one({"firebase_uid": firebase_uid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    cursor = job_alerts_col.find({"user_id": str(user["_id"])}).sort("sent_at", -1).limit(50)
    alerts = []
    async for doc in cursor:
        alerts.append(serialize_doc(doc))
    return {"count": len(alerts), "alerts": alerts}


# ── GET usage ────────────────────────────────────────────
@router.get("/usage")
async def api_usage(user_data: dict = Depends(verify_token)):
    firebase_uid = user_data.get("uid")
    user = await users_col.find_one({"firebase_uid": firebase_uid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return await get_usage(user_id=str(user["_id"]))


# ── GET scheduler status ─────────────────────────────────
@router.get("/scheduler-status")
async def scheduler_status(user_data: dict = Depends(verify_token)):
    return {
        "status"     : "running",
        "server_time": datetime.utcnow().strftime("%H:%M"),
        "local_time" : datetime.now().strftime("%H:%M"),
        "message"    : "Scheduler checks every minute for matching schedule times",
    }