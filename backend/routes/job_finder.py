import os
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from starlette.concurrency import run_in_threadpool

from config import job_searches_col, job_search_results_col, scheduled_job_links_col, preferences_col, users_col
from firebase_auth import verify_token
from models.job_finder import InterpretSearchRequest, InterpretSearchResponse, JobSearchFilters, RunSearchRequest, SearchScheduleRequest
from services.email_sender import send_email
from services.job_finder.interpreter import interpret_filters
from services.job_finder.pipeline import score_jobs, canonical_link, discover_jobs
from services.cover_letter import generate_cover_letter
from services.rate_limiter import check_and_increment
from services.resume_parser import get_resume_text
from scheduler import calculate_next_run

router = APIRouter()
saved_search_router = APIRouter()


async def ensure_job_finder_indexes():
    await job_searches_col.create_index([("user_id", 1), ("updated_at", -1)])
    await job_search_results_col.create_index([("user_id", 1), ("search_id", 1), ("created_at", -1)])
    await job_search_results_col.create_index([("search_id", 1), ("dedupe_key", 1)], unique=True)
    await job_searches_col.create_index([("schedule.enabled", 1), ("schedule.timezone", 1)])
    await scheduled_job_links_col.create_index([("user_id", 1), ("search_id", 1), ("link", 1)], unique=True)


async def _get_user(firebase_uid: str) -> dict:
    user = await users_col.find_one({"firebase_uid": firebase_uid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _default_filters(prefs: dict) -> dict:
    return {
        "job_titles": [prefs["job_title"]] if prefs.get("job_title") else [],
        "industries": [],
        "locations": [prefs["location"]] if prefs.get("location") else [],
        "experience_level": prefs.get("experience", ""),
        "skills": [value.strip() for value in (prefs.get("skills") or "").split(",") if value.strip()],
        "keywords": [],
        "employment_types": [],
        "remote_preference": "any",
        "date_posted": "week",
        "results_limit": 20,
    }


def _serialize(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    return doc


async def _check_provider_budget(service: str, user_id: str, cost: int = 1) -> dict:
    """Apply both a per-user budget and a shared backend-key budget."""
    global_check = await check_and_increment(service, cost=cost, user_id="global")
    if not global_check["allowed"]:
        return global_check
    return await check_and_increment(service, cost=cost, user_id=user_id)


@router.post("/interpret", response_model=InterpretSearchResponse)
async def interpret_search(payload: InterpretSearchRequest, user_data: dict = Depends(verify_token)):
    user = await _get_user(user_data.get("uid", ""))
    user_id = str(user["_id"])
    prefs = await preferences_col.find_one({"user_id": user_id}) or {}
    search_doc = None
    if payload.search_id:
        if not ObjectId.is_valid(payload.search_id):
            raise HTTPException(status_code=400, detail="Invalid search id")
        search_doc = await job_searches_col.find_one({"_id": ObjectId(payload.search_id), "user_id": user_id})
        if not search_doc:
            raise HTTPException(status_code=404, detail="Search not found")

    current = search_doc.get("filters", {}) if search_doc else {}
    defaults = _default_filters(prefs)
    groq_check = await check_and_increment("groq", user_id=user_id)
    if not groq_check["allowed"]:
        raise HTTPException(status_code=429, detail=groq_check["reason"])
    try:
        filters, assistant_message = await run_in_threadpool(
            interpret_filters, payload.message, current, defaults
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    now = datetime.now(timezone.utc)
    conversation = (search_doc or {}).get("conversation", [])[-19:]
    conversation.extend([
        {"role": "user", "content": payload.message[:2000], "at": now},
        {"role": "assistant", "content": assistant_message, "at": now},
    ])
    update = {
        "user_id": user_id,
        "filters": filters.model_dump(),
        "conversation": conversation,
        "status": "draft",
        "assistant_message": assistant_message,
        "updated_at": now,
    }
    if not search_doc:
        update.update({
            "schedule_enabled": False, "schedule_time": "09:00", "timezone": None,
            "email_enabled": True, "next_run": None, "last_run": None,
            "last_run_status": None, "last_new_count": 0, "last_error": "",
            "seen_job_ids": [],
        })
    if search_doc:
        # A refinement changes the filters, so previous matches must not appear
        # as though they were found for the new draft.
        await job_search_results_col.delete_many({"search_id": str(search_doc["_id"]), "user_id": user_id})
        update["result_count"] = 0
        update["provider"] = ""
        update["fallback_reason"] = ""
        await job_searches_col.update_one({"_id": search_doc["_id"], "user_id": user_id}, {"$set": update})
        search_id = str(search_doc["_id"])
    else:
        update.update({"created_at": now, "provider_usage": {}})
        result = await job_searches_col.insert_one(update)
        search_id = str(result.inserted_id)

    needs_role = not filters.job_titles
    return InterpretSearchResponse(
        search_id=search_id,
        assistant_message=assistant_message,
        filters=filters,
        requires_clarification=needs_role,
        clarification_question="Which role or job title should I search for?" if needs_role else None,
    )


@router.post("/searches/{search_id}/run")
async def run_search(search_id: str, payload: RunSearchRequest, user_data: dict = Depends(verify_token)):
    if not ObjectId.is_valid(search_id):
        raise HTTPException(status_code=400, detail="Invalid search id")
    user = await _get_user(user_data.get("uid", ""))
    user_id = str(user["_id"])
    search = await job_searches_col.find_one({"_id": ObjectId(search_id), "user_id": user_id})
    if not search:
        raise HTTPException(status_code=404, detail="Search not found")
    filters = payload.filters
    if not filters.job_titles:
        raise HTTPException(status_code=422, detail="Add at least one job title before searching")
    user_email = user.get("email", "")
    prefs = await preferences_col.find_one({"user_id": user_id}) or {}
    if payload.send_email and not user_email:
        raise HTTPException(status_code=400, detail="Your account does not have an email address")

    now = datetime.now(timezone.utc)
    stale_before = now - timedelta(minutes=10)
    claimed = await job_searches_col.update_one(
        {
            "_id": search["_id"],
            "user_id": user_id,
            "$or": [
                {"status": {"$ne": "running"}},
                {"run_started_at": {"$lte": stale_before}},
                {"run_started_at": {"$exists": False}, "updated_at": {"$lte": stale_before}},
            ],
        },
        {"$set": {"filters": filters.model_dump(), "status": "running", "run_started_at": now, "updated_at": now}},
    )
    if not claimed.modified_count:
        raise HTTPException(status_code=409, detail="This search is already running")
    usage = {}
    try:
        serpapi_configured = bool(os.getenv("SERPAPI_API_KEY") or os.getenv("SERPAPI_KEY"))
        serpapi_allowed = False
        if serpapi_configured:
            serpapi_cost = min(3, max(1, len(filters.locations)))
            serp_check = await _check_provider_budget("serpapi", user_id, cost=serpapi_cost)
            if serp_check["allowed"]:
                usage["serpapi"] = serpapi_cost
                serpapi_allowed = True
            else:
                usage["serpapi_limited"] = 1

        async def allow_jsearch():
            jsearch_check = await check_and_increment("jsearch", user_id=user_id)
            if not jsearch_check["allowed"]:
                return False
            usage["jsearch"] = 1
            return True

        try:
            jobs, provider, fallback_reason = await discover_jobs(filters, serpapi_allowed, allow_jsearch)
        except RuntimeError as exc:
            if "quota is unavailable" in str(exc):
                raise HTTPException(status_code=429, detail=str(exc)) from exc
            raise

        async def consume_firecrawl():
            check = await _check_provider_budget("firecrawl", user_id)
            if check["allowed"]:
                usage["firecrawl"] = usage.get("firecrawl", 0) + 1
                return True
            return False

        # Provider is capped to five records per search in the pipeline. Check the user's
        # remaining daily budget before each individual Firecrawl request.
        if os.getenv("FIRECRAWL_API_KEY"):
            eligible = [job for job in jobs if len(job.get("description", "").strip()) < 300][:5]
            for job in eligible:
                if not await consume_firecrawl():
                    break
                from services.job_finder.providers.firecrawl import enrich_description
                description = await run_in_threadpool(enrich_description, job)
                if description:
                    job["description"] = description
                    job["details_source"] = "Firecrawl"

        resume_text = await get_resume_text(user_id)
        if os.getenv("GROQ_API_KEY"):
            groq_check = await check_and_increment("groq", user_id=user_id)
            if groq_check["allowed"]:
                jobs = await run_in_threadpool(score_jobs, jobs, filters, resume_text)
                usage["groq"] = 1

        jobs = jobs[:filters.results_limit]
        await job_search_results_col.delete_many({"search_id": search_id, "user_id": user_id})
        docs = []
        for job in jobs:
            if not job.get("job_title") or not job.get("apply_link"):
                continue
            job.update({
                "search_id": search_id,
                "user_id": user_id,
                "dedupe_key": canonical_link(job["apply_link"]),
                "created_at": now,
            })
            docs.append(job)
        if docs:
            await job_search_results_col.insert_many(docs, ordered=False)

        email_sent = False
        email_error = ""
        if payload.send_email and docs:
            email_check = await check_and_increment("email", user_id=user_id)
            if not email_check["allowed"]:
                email_error = email_check["reason"]
            else:
                usage["email"] = 1
                try:
                    email_sent = bool(await run_in_threadpool(send_email, jobs, user_email, prefs))
                    if not email_sent:
                        email_error = "Results were saved, but email delivery failed."
                except Exception as exc:
                    email_error = f"Results were saved, but email delivery failed: {exc}"

        await job_searches_col.update_one(
            {"_id": search["_id"], "user_id": user_id},
            {"$set": {
                "status": "completed",
                "result_count": len(docs),
                "provider": provider,
                "fallback_reason": fallback_reason,
                "provider_usage": usage,
                "email_sent": email_sent,
                "email_error": email_error,
                "completed_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }, "$unset": {"run_started_at": ""}},
        )
        return {
            "search_id": search_id,
            "status": "completed",
            "provider": provider,
            "result_count": len(docs),
            "fallback_reason": fallback_reason,
            "email_sent": email_sent,
            "email_error": email_error,
            "message": f"Found {len(docs)} jobs." if docs else "No jobs matched this search. Try widening the filters.",
        }
    except HTTPException:
        await job_searches_col.update_one(
            {"_id": search["_id"], "user_id": user_id},
            {"$set": {"status": "failed", "provider_usage": usage, "updated_at": datetime.now(timezone.utc)}, "$unset": {"run_started_at": ""}},
        )
        raise
    except Exception as exc:
        await job_searches_col.update_one(
            {"_id": search["_id"], "user_id": user_id},
            {"$set": {"status": "failed", "error": str(exc)[:500], "provider_usage": usage, "updated_at": datetime.now(timezone.utc)}, "$unset": {"run_started_at": ""}},
        )
        raise HTTPException(status_code=502, detail=f"Job search failed: {exc}") from exc


@router.get("/searches")
async def list_searches(
    user_data: dict = Depends(verify_token),
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
):
    user = await _get_user(user_data.get("uid", ""))
    user_filter = {"user_id": str(user["_id"])}
    total = await job_searches_col.count_documents(user_filter)
    cursor = job_searches_col.find(user_filter).sort("updated_at", -1).skip(offset).limit(limit)
    return {
        "searches": [_serialize(doc) async for doc in cursor],
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.delete("/searches/{search_id}")
async def delete_search(search_id: str, user_data: dict = Depends(verify_token)):
    if not ObjectId.is_valid(search_id):
        raise HTTPException(status_code=400, detail="Invalid search id")
    user = await _get_user(user_data.get("uid", ""))
    user_id = str(user["_id"])
    result = await job_searches_col.delete_one({"_id": ObjectId(search_id), "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Search not found")
    await job_search_results_col.delete_many({"search_id": search_id, "user_id": user_id})
    await scheduled_job_links_col.delete_many({"search_id": search_id, "user_id": user_id})
    return {"message": "Search deleted successfully"}


@router.get("/searches/{search_id}/results")
async def get_search_results(
    search_id: str,
    user_data: dict = Depends(verify_token),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
):
    if not ObjectId.is_valid(search_id):
        raise HTTPException(status_code=400, detail="Invalid search id")
    user = await _get_user(user_data.get("uid", ""))
    user_id = str(user["_id"])
    search = await job_searches_col.find_one({"_id": ObjectId(search_id), "user_id": user_id})
    if not search:
        raise HTTPException(status_code=404, detail="Search not found")
    cursor = job_search_results_col.find({"search_id": search_id, "user_id": user_id}).sort("match_score", -1).skip(offset).limit(limit)
    results = [_serialize(doc) async for doc in cursor]
    return {"search_id": search_id, "total": search.get("result_count", len(results)), "offset": offset, "results": results}


@router.delete("/searches/{search_id}/results/{result_id}")
async def delete_search_result(search_id: str, result_id: str, user_data: dict = Depends(verify_token)):
    if not ObjectId.is_valid(search_id) or not ObjectId.is_valid(result_id):
        raise HTTPException(status_code=400, detail="Invalid search or result id")
    user = await _get_user(user_data.get("uid", ""))
    user_id = str(user["_id"])
    search_filter = {"_id": ObjectId(search_id), "user_id": user_id}
    if not await job_searches_col.find_one(search_filter):
        raise HTTPException(status_code=404, detail="Search not found")
    result = await job_search_results_col.delete_one({
        "_id": ObjectId(result_id), "search_id": search_id, "user_id": user_id,
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Job result not found")
    await job_searches_col.update_one(search_filter, {"$inc": {"result_count": -1}})
    return {"message": "Job result deleted successfully"}


@router.post("/searches/{search_id}/results/{result_id}/cover-letter")
async def create_result_cover_letter(search_id: str, result_id: str, user_data: dict = Depends(verify_token)):
    if not ObjectId.is_valid(search_id) or not ObjectId.is_valid(result_id):
        raise HTTPException(status_code=400, detail="Invalid search or result id")
    user = await _get_user(user_data.get("uid", ""))
    user_id = str(user["_id"])
    result = await job_search_results_col.find_one({
        "_id": ObjectId(result_id), "search_id": search_id, "user_id": user_id,
    })
    if not result:
        raise HTTPException(status_code=404, detail="Job result not found")
    if result.get("cover_letter"):
        return {"cover_letter": result["cover_letter"]}

    usage = await check_and_increment("groq", user_id=user_id)
    if not usage["allowed"]:
        raise HTTPException(status_code=429, detail=usage["reason"])
    preferences = await preferences_col.find_one({"user_id": user_id}) or {}
    resume_text = await get_resume_text(user_id)
    candidate_name = user.get("name") or user.get("display_name") or "Candidate"
    generated = await run_in_threadpool(
        generate_cover_letter, result, preferences, candidate_name, resume_text=resume_text or ""
    )
    cover_letter = generated.get("cover_letter", "")
    if not cover_letter or cover_letter == "Could not generate a cover letter.":
        raise HTTPException(status_code=503, detail="Could not generate a cover letter right now. Please try again.")
    await job_search_results_col.update_one(
        {"_id": ObjectId(result_id), "search_id": search_id, "user_id": user_id},
        {"$set": {"cover_letter": cover_letter, "cover_letter_generated_at": datetime.now(timezone.utc)}},
    )
    return {"cover_letter": cover_letter}


@router.get("/searches/{search_id}/schedule")
async def get_search_schedule(search_id: str, user_data: dict = Depends(verify_token)):
    if not ObjectId.is_valid(search_id):
        raise HTTPException(status_code=400, detail="Invalid search id")
    user = await _get_user(user_data.get("uid", ""))
    search = await job_searches_col.find_one({"_id": ObjectId(search_id), "user_id": str(user["_id"])})
    if not search:
        raise HTTPException(status_code=404, detail="Search not found")
    return {"schedule": _schedule_view(search)}


def _schedule_view(search: dict) -> dict:
    legacy = search.get("schedule") or {}
    next_run = search.get("next_run")
    if next_run is not None:
        if next_run.tzinfo is None:
            next_run = next_run.replace(tzinfo=timezone.utc)
        next_run = next_run.astimezone(timezone.utc).isoformat()
    last_run = search.get("last_run", legacy.get("last_run_at"))
    if last_run is not None:
        if last_run.tzinfo is None:
            last_run = last_run.replace(tzinfo=timezone.utc)
        last_run = last_run.astimezone(timezone.utc).isoformat()
    return {
        "schedule_enabled": search.get("schedule_enabled", legacy.get("enabled", False)),
        "schedule_time": search.get("schedule_time", legacy.get("time", "09:00")),
        "timezone": search.get("timezone") or legacy.get("timezone") or "",
        "email_enabled": search.get("email_enabled", legacy.get("send_email", True)),
        "next_run": next_run, "last_run": last_run,
        "last_run_status": search.get("last_run_status", legacy.get("last_run_status")),
        "last_new_count": search.get("last_new_count", legacy.get("last_run_count", 0)),
        "last_error": search.get("last_error", legacy.get("last_error", "")),
        "seen_job_ids": search.get("seen_job_ids", []),
    }


@saved_search_router.patch("/{search_id}/schedule")
@router.put("/searches/{search_id}/schedule")
async def update_search_schedule(search_id: str, payload: SearchScheduleRequest, user_data: dict = Depends(verify_token)):
    if not ObjectId.is_valid(search_id):
        raise HTTPException(status_code=400, detail="Invalid search id")
    try:
        ZoneInfo(payload.timezone)
    except (ZoneInfoNotFoundError, ValueError):
        raise HTTPException(status_code=422, detail="Choose a valid IANA timezone")
    user = await _get_user(user_data.get("uid", ""))
    user_id = str(user["_id"])
    search = await job_searches_col.find_one({"_id": ObjectId(search_id), "user_id": user_id})
    if not search:
        raise HTTPException(status_code=404, detail="Search not found")
    now = datetime.now(timezone.utc)
    fields = payload.model_dump()
    next_run = calculate_next_run(fields["schedule_time"], fields["timezone"], now) if fields["schedule_enabled"] else None
    await job_searches_col.update_one({"_id": search["_id"], "user_id": user_id}, {"$set": {
        **fields, "next_run": next_run, "updated_at": now,
    }, "$setOnInsert": {"seen_job_ids": []}})
    updated = await job_searches_col.find_one({"_id": search["_id"], "user_id": user_id})
    return {"schedule": _schedule_view(updated)}


@saved_search_router.delete("/{search_id}")
async def delete_saved_search(search_id: str, user_data: dict = Depends(verify_token)):
    if not ObjectId.is_valid(search_id):
        raise HTTPException(status_code=400, detail="Invalid search id")
    user = await _get_user(user_data.get("uid", ""))
    user_id = str(user["_id"])
    search = await job_searches_col.find_one_and_delete({"_id": ObjectId(search_id), "user_id": user_id})
    if not search:
        raise HTTPException(status_code=404, detail="Search not found")
    await job_search_results_col.delete_many({"search_id": search_id, "user_id": user_id})
    await scheduled_job_links_col.delete_many({"search_id": search_id, "user_id": user_id})
    return {"message": "Saved search deleted"}


@router.delete("/searches/{search_id}/schedule")
async def pause_search_schedule(search_id: str, user_data: dict = Depends(verify_token)):
    if not ObjectId.is_valid(search_id):
        raise HTTPException(status_code=400, detail="Invalid search id")
    user = await _get_user(user_data.get("uid", ""))
    result = await job_searches_col.update_one(
        {"_id": ObjectId(search_id), "user_id": str(user["_id"])},
        {"$set": {"schedule_enabled": False, "next_run": None, "schedule.enabled": False, "schedule.updated_at": datetime.now(timezone.utc)}},
    )
    if not result.matched_count:
        raise HTTPException(status_code=404, detail="Search not found")
    return {"message": "Schedule paused", "enabled": False}


@saved_search_router.post("/{search_id}/run-now")
async def run_saved_search_now(search_id: str, user_data: dict = Depends(verify_token)):
    if not ObjectId.is_valid(search_id):
        raise HTTPException(status_code=400, detail="Invalid search id")
    user = await _get_user(user_data.get("uid", ""))
    user_id = str(user["_id"])
    search = await job_searches_col.find_one({"_id": ObjectId(search_id), "user_id": user_id})
    if not search:
        raise HTTPException(status_code=404, detail="Search not found")
    from scheduler import run_saved_search_once
    try:
        result = await run_saved_search_once(search, user)
        return {key: value for key, value in result.items() if key != "jobs"} | {
            "message": f"Found {result.get('new_count', 0)} new matches." if result.get("status") == "new_jobs" else (result.get("error") or "Email delivery failed." if result.get("status") == "error" else "No new matches found.")
        }
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Saved search failed: {exc}") from exc
