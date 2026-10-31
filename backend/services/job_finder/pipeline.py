import json
import os
import asyncio
from urllib.parse import urlsplit, urlunsplit

from models.job_finder import JobSearchFilters
from services.job_finder.providers import firecrawl, jsearch, serpapi
from services.groq_chat import create_groq_chat


def canonical_link(value: str) -> str:
    try:
        parts = urlsplit(value.strip())
        return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), parts.path.rstrip("/"), parts.query, ""))
    except Exception:
        return value.strip().lower()


async def discover_jobs(filters: JobSearchFilters, serpapi_allowed: bool, allow_jsearch) -> tuple[list[dict], str, str]:
    """SerpApi is primary; fallback usage is authorized before JSearch is called."""
    filter_data = filters.model_dump()
    serpapi_error = ""
    if serpapi_allowed:
        try:
            jobs = await asyncio.to_thread(serpapi.search_jobs, filter_data)
            if jobs:
                return _dedupe(jobs)[:filters.results_limit], "serpapi", ""
            serpapi_error = "Google Jobs returned no results."
        except Exception as exc:
            serpapi_error = str(exc)
            print(f"[job_finder] SerpApi unavailable: {exc}")
    else:
        serpapi_error = "SerpApi is not configured or this account reached its provider limit."

    if not await allow_jsearch():
        raise RuntimeError(f"{serpapi_error} JSearch fallback quota is unavailable.")
    try:
        fallback_jobs = await asyncio.to_thread(jsearch.search_jobs, filter_data)
        return _dedupe(fallback_jobs)[:filters.results_limit], "jsearch", serpapi_error
    except Exception as exc:
        raise RuntimeError(f"{serpapi_error} JSearch fallback failed: {exc}") from exc


def _dedupe(jobs: list[dict]) -> list[dict]:
    seen = set()
    result = []
    for job in jobs:
        link = canonical_link(job.get("apply_link", ""))
        if not link or link in seen:
            continue
        seen.add(link)
        result.append(job)
    return result


def score_jobs(jobs: list[dict], filters: JobSearchFilters, resume_text: str = "") -> list[dict]:
    # These are resume match scores. Profile filters alone are not enough to
    # produce one, so leave the score unset when no resume was uploaded.
    if not resume_text or not resume_text.strip():
        for job in jobs:
            job.pop("match_score", None)
            job.pop("match_reasons", None)
            job["resume_missing"] = True
        return jobs

    for job in jobs:
        job["resume_missing"] = False
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or not jobs:
        return jobs
    candidates = [
        {
            "index": index,
            "title": job.get("job_title", ""),
            "company": job.get("company", ""),
            "location": job.get("location", ""),
            "description": job.get("description", "")[:1600],
        }
        for index, job in enumerate(jobs)
    ]
    prompt = f"""Score each job for this candidate from 0 to 100 and give up to three short match reasons grounded in the job text and candidate information.
Do not infer eligibility or say the employer is hiring beyond the supplied posting. Do not invent missing skills.
Return JSON exactly as {{"scores":[{{"index":0,"score":0,"reasons":["..."]}}]}}.
Candidate filters/profile: {json.dumps(filters.model_dump(), ensure_ascii=False)}
Resume excerpt: {resume_text[:3000]}
Jobs: {json.dumps(candidates, ensure_ascii=False)}
"""
    try:
        response = create_groq_chat(
            model_kwargs={"response_format": {"type": "json_object"}},
            temperature=0,
            max_tokens=1800,
        ).invoke(prompt)
        parsed = json.loads(response.content or "{}")
        by_index = {item.get("index"): item for item in parsed.get("scores", []) if isinstance(item, dict)}
        for index, job in enumerate(jobs):
            item = by_index.get(index)
            if not item:
                continue
            score = item.get("score")
            if isinstance(score, (int, float)):
                job["match_score"] = max(0, min(100, int(score)))
            job["match_reasons"] = [str(reason)[:180] for reason in item.get("reasons", [])[:3]]
    except Exception as exc:
        print(f"[job_finder] Scoring skipped: {exc}")
    return jobs
