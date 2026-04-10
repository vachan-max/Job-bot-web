from fastapi import APIRouter, Depends, HTTPException
from firebase_auth import verify_token
from config import users_col, preferences_col, job_alerts_col, job_links_col
from services.job_fetcher import fetch_jobs
from services.ai_filter import filter_jobs
from services.cover_letter import generate_cover_letter
from services.whatsapp_sender import send_whatsapp
from datetime import datetime
import os

router = APIRouter()


def serialize_doc(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


# ── POST /jobs/run ───────────────────────────────────────────────────────────
@router.post("/run")
async def run_job_fetch(user_data: dict = Depends(verify_token)):
    firebase_uid = user_data.get("uid")

    # ── get user ──────────────────────────────────────────────────────────
    user = await users_col.find_one({"firebase_uid": firebase_uid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_id = str(user["_id"])
    phone   = user.get("phone", "")

    if not phone:
        raise HTTPException(
            status_code=400,
            detail="Please add your WhatsApp number in Profile first"
        )

    # ── get preferences ───────────────────────────────────────────────────
    prefs = await preferences_col.find_one({"user_id": user_id})
    if not prefs:
        raise HTTPException(
            status_code=400,
            detail="Please set your job preferences first"
        )

    your_name = os.getenv("YOUR_NAME", user.get("name", "Candidate"))

    use_ai_filter    = prefs.get("use_ai_filter",    True)
    use_cover_letter = prefs.get("use_cover_letter", True)
    send_wa          = prefs.get("send_whatsapp",    True)

    print(f"[jobs/run] Fetching jobs for {user.get('name')}...")
    print(f"[jobs/run] Toggles → AI:{use_ai_filter} | CoverLetter:{use_cover_letter} | WhatsApp:{send_wa}")

    # ── Step 1: Fetch ─────────────────────────────────────────────────────
    jobs = fetch_jobs(
        job_title = prefs["job_title"],
        location  = prefs["location"]
    )

    if not jobs:
        return {"message": "No jobs found right now. Try again later.", "jobs_sent": 0}

    # ── Step 2: Deduplicate using job_links_col (lightweight, 30 day store) ──
    sent_cursor  = job_links_col.find({"user_id": user_id}, {"link": 1})
    already_sent = set()
    async for doc in sent_cursor:
        link = doc.get("link", "").strip()
        if link:
            already_sent.add(link)

    print(f"[jobs/run] Dedup: {len(already_sent)} links already sent to this user")

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
        return {
            "message"  : "All matching jobs were already sent to you. Check back tomorrow!",
            "jobs_sent": 0,
        }

    # ── Step 3: AI Score + Filter ─────────────────────────────────────────
    if use_ai_filter:
        print("[jobs/run] Running AI filter...")
        jobs = filter_jobs(jobs, prefs)
        if not jobs:
            return {
                "message"  : "No jobs matched your minimum score. Try lowering min_score.",
                "jobs_sent": 0,
            }
    else:
        print("[jobs/run] AI filter SKIPPED")

    # ── Step 4: Cover letters ─────────────────────────────────────────────
    if use_cover_letter:
        print("[jobs/run] Generating cover letters...")
        jobs = [generate_cover_letter(job, prefs, your_name) for job in jobs]
    else:
        print("[jobs/run] Cover letter SKIPPED")

    # ── Step 5: WhatsApp ──────────────────────────────────────────────────
    if send_wa:
        print("[jobs/run] Sending WhatsApp...")
        send_whatsapp(jobs, phone)
    else:
        print("[jobs/run] WhatsApp SKIPPED — jobs saved to history only")

    # ── Step 6: Save full job data to MongoDB (deleted after 6 days) ──────
    now  = datetime.utcnow()
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

    # ── Step 7: Save lightweight links for dedup (deleted after 30 days) ──
    link_docs = [
        {
            "user_id": user_id,
            "link"   : job.get("apply_link", "").strip(),
            "sent_at": now,
        }
        for job in jobs
        if job.get("apply_link", "").strip()
    ]
    if link_docs:
        await job_links_col.insert_many(link_docs)
        print(f"[jobs/run] Saved {len(link_docs)} links to job_links for dedup")

    # ── Response ──────────────────────────────────────────────────────────
    action = "sent to your WhatsApp" if send_wa else "saved to History"
    return {
        "message"  : f"✅ {len(jobs)} jobs {action}!",
        "jobs_sent": len(jobs),
    }


# ── GET /jobs/history ────────────────────────────────────────────────────────
@router.get("/history")
async def get_job_history(user_data: dict = Depends(verify_token)):
    firebase_uid = user_data.get("uid")

    user = await users_col.find_one({"firebase_uid": firebase_uid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_id = str(user["_id"])

    cursor = job_alerts_col.find(
        {"user_id": user_id}
    ).sort("sent_at", -1).limit(50)

    alerts = []
    async for doc in cursor:
        alerts.append(serialize_doc(doc))

    return {"count": len(alerts), "alerts": alerts}


# ── GET /jobs/scheduler-status ───────────────────────────────────────────────
@router.get("/scheduler-status")
async def scheduler_status(user_data: dict = Depends(verify_token)):
    return {
        "status"     : "running",
        "server_time": datetime.utcnow().strftime("%H:%M"),
        "local_time" : datetime.now().strftime("%H:%M"),
        "message"    : "Scheduler checks every minute for matching schedule times",
    }