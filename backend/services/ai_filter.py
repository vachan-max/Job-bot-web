import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def _ask_groq(prompt: str, max_tokens: int = 5) -> str:
    response = client.chat.completions.create(
        model       = "llama-3.3-70b-versatile",
        messages    = [{"role": "user", "content": prompt}],
        max_tokens  = max_tokens,
        temperature = 0,
    )
    return response.choices[0].message.content.strip()


def _parse_score(raw: str, default: int = 60) -> int:
    digits = "".join(filter(str.isdigit, raw))
    if not digits:
        return default
    return min(int(digits[:3]), 100)


def score_job(job: dict, preferences: dict, resume_text: str = "") -> dict:
    title       = job.get("job_title", "")
    company     = job.get("company", "")
    description = job.get("description", "")[:400]

    # ── 1. Preference match score ─────────────────────────
    pref_prompt = f"""You are a job matching AI. Score this job from 0-100.
Candidate wants : {preferences.get('job_title')} role
Experience      : {preferences.get('experience')}
Skills          : {preferences.get('skills')}
Job Title       : {title}
Company         : {company}
Description     : {description}
Scoring guide:
85-100 = excellent match (same role, matching skills, right experience level)
70-84  = good match (similar role, most skills match)
50-69  = partial match (related role, some skills overlap)
0-49   = poor match
Reply with ONLY a number 0-100. Nothing else."""

    try:
        raw_pref = _ask_groq(pref_prompt)
        ai_score = _parse_score(raw_pref, default=60)
        print(f"[ai_filter] '{title}' at '{company}' -> AI score: {ai_score}")
    except Exception as e:
        print(f"[ai_filter] AI score error for '{title}': {e}")
        ai_score = 60

    job["ai_score"] = ai_score

    # ── 2. Resume match score ─────────────────────────────
    if not resume_text:
        print(f"[ai_filter] No resume — skipping match % for '{title}'")
        job["match_percent"] = job.get("match_percent", 0)
        return job

    resume_prompt = f"""You are a resume screening AI.
RESUME (candidate's actual experience and skills):
{resume_text[:800]}
JOB POSTING:
Title      : {title}
Company    : {company}
Description: {description}
How well does this resume match this job? Consider:
- Skills overlap (programming languages, frameworks, tools)
- Experience level match
- Domain/industry relevance
Reply with ONLY a number 0-100. Nothing else."""

    try:
        raw_match     = _ask_groq(resume_prompt)
        match_percent = _parse_score(raw_match, default=50)
        print(f"[ai_filter] '{title}' -> Resume match: {match_percent}%")
    except Exception as e:
        print(f"[ai_filter] Resume match error for '{title}': {e}")
        match_percent = 50

    job["match_percent"] = match_percent
    return job


def filter_jobs(jobs: list, preferences: dict, resume_text: str = "") -> list:
    min_score = int(preferences.get("min_score", 70))
    print(f"[ai_filter] Scoring {len(jobs)} jobs, min_score={min_score}")

    scored   = [score_job(job, preferences, resume_text) for job in jobs]
    passed   = [j for j in scored if j["ai_score"] >= min_score or j.get("match_percent", 0) >= 50]
    rejected = [j for j in scored if j["ai_score"] < min_score and j.get("match_percent", 0) < 50]

    print(f"[ai_filter] {len(passed)} passed, {len(rejected)} rejected")
    for j in rejected:
        print(f"[ai_filter]   REJECTED: '{j.get('job_title')}' "
              f"ai_score={j.get('ai_score')} match={j.get('match_percent')}% "
              f"(min={min_score})")

    passed.sort(key=lambda x: x["ai_score"], reverse=True)
    return passed[:10]