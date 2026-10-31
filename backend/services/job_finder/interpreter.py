import json
import os
import re

from models.job_finder import JobSearchFilters
from services.groq_chat import create_job_finder_chat


OFF_TOPIC_MESSAGE = "Sorry, I’m only used to search for jobs. Tell me the role and location you’re interested in."


def is_job_related(message: str) -> bool:
    """Classify a message before it can create or update a saved draft."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("Natural-language search is unavailable because GROQ_API_KEY is not configured.")

    prompt = f'''Classify whether the user's message is about finding jobs or refining a job search.
Return JSON with exactly one boolean key: job_related.
Job-related includes job titles, employment, career opportunities, locations for jobs, and changes to job search filters.
Unrelated includes requests about hotels, travel, restaurants, weather, general knowledge, and other non-job topics.
When ambiguous, classify as job-related only if the user clearly refers to a job search or career opportunity.
User message: {message}'''
    try:
        response = create_job_finder_chat(
            model_kwargs={"response_format": {"type": "json_object"}},
            temperature=0,
            max_tokens=100,
        ).invoke(prompt)
        data = json.loads(response.content or "{}")
        value = data.get("job_related")
        if not isinstance(value, bool):
            raise ValueError("Classifier response did not contain a boolean job_related value")
        return value
    except Exception as exc:
        raise RuntimeError("The request could not be classified. Please try again.") from exc


def interpret_filters(message: str, current: dict, defaults: dict) -> tuple[JobSearchFilters, str]:
    """Turn a user request into a complete filter object without executing search tools."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("Natural-language search is unavailable because GROQ_API_KEY is not configured.")

    baseline = {**defaults, **current}
    schema = JobSearchFilters.model_json_schema()
    prompt = f"""You interpret job search requests for a general-purpose job finder. Support all occupations, industries, and employer types.
Return a JSON object with exactly these keys: filters and assistant_message.
filters must follow this schema: {json.dumps(schema)}
Start from the existing filter object and preserve every existing value unless the user explicitly changes it.
Apply defaults only for missing values. Extract only facts requested or clearly implied by the user; do not invent requirements.
If no role is known, leave job_titles empty. Keep locations, skills, industries, keywords, and employment_types as arrays of short strings.
remote_preference must be any, remote, hybrid, or on-site. date_posted must be any, day, 3days, week, or month. results_limit must be 1 through 30.
Write a short conversational assistant_message summarizing the interpreted request and noting that the user should review the filters before search.

Existing filters/defaults: {json.dumps(baseline, ensure_ascii=False)}
User message: {message}
"""
    response = create_job_finder_chat(
        model_kwargs={"response_format": {"type": "json_object"}},
        temperature=0,
        max_tokens=1200,
    ).invoke(prompt)
    raw = response.content or "{}"
    try:
        data = json.loads(raw)
        parsed = JobSearchFilters.model_validate({**baseline, **data.get("filters", {})})
        assistant_message = str(data.get("assistant_message", "Review the filters, then confirm to search."))[:500]
    except Exception as exc:
        raise RuntimeError("The search request could not be interpreted. Please rephrase it and try again.") from exc

    # Explicit location/job/experience and number expressions receive a final deterministic safeguard.
    # It prevents conversational follow-ups from accidentally dropping values the user just specified.
    lower_message = message.lower()
    if any(term in lower_message for term in ("location", "in ", "near ", "remote", "hybrid", "on-site", "onsite")):
        if "remote" in lower_message and parsed.remote_preference == "any":
            parsed.remote_preference = "remote"
        if "hybrid" in lower_message:
            parsed.remote_preference = "hybrid"
        if "on-site" in lower_message or "onsite" in lower_message:
            parsed.remote_preference = "on-site"
    number_match = re.search(r"\b(?:find|show|top)\s+(\d{1,2})\b", lower_message)
    if number_match:
        parsed.results_limit = max(1, min(30, int(number_match.group(1))))
    return parsed, assistant_message
