import os

import requests


class ProviderError(RuntimeError):
    pass


def _query(filters: dict) -> str:
    parts = list(filters.get("job_titles") or [])
    parts.extend(filters.get("skills") or [])
    parts.extend(filters.get("keywords") or [])
    parts.extend(filters.get("industries") or [])
    if filters.get("experience_level"):
        parts.append(filters["experience_level"])
    remote_preference = filters.get("remote_preference", "any")
    if remote_preference != "any":
        parts.append(remote_preference)
    if filters.get("employment_types"):
        parts.extend(filters["employment_types"])
    return " ".join(dict.fromkeys(part.strip() for part in parts if part.strip())) or "jobs"


def search_jobs(filters: dict) -> list[dict]:
    api_key = os.getenv("SERPAPI_API_KEY") or os.getenv("SERPAPI_KEY")
    if not api_key:
        raise ProviderError("SERPAPI_API_KEY is not configured")
    locations = filters.get("locations") or [""]
    found = []
    for location in locations[:3]:
        params = {
            "engine": "google_jobs",
            "q": _query(filters),
            "api_key": api_key,
            "hl": "en",
        }
        if location:
            params["location"] = location
        posted = filters.get("date_posted", "week")
        if posted != "any":
            params["chips"] = f"date_posted:{'today' if posted == 'day' else posted}"
        try:
            response = requests.get("https://serpapi.com/search.json", params=params, timeout=20)
            response.raise_for_status()
            payload = response.json()
        except requests.RequestException as exc:
            # Requests exceptions include the full URL, which contains the API key.
            safe_error = str(exc).replace(api_key, "[REDACTED]")
            raise ProviderError(f"SerpApi request failed: {safe_error}") from exc
        if payload.get("error"):
            raise ProviderError(str(payload["error"]))
        for item in payload.get("jobs_results", []):
            apply_options = item.get("apply_options") or []
            apply_link = next((option.get("link") for option in apply_options if option.get("link")), "")
            source_url = item.get("share_link") or apply_link
            if not apply_link:
                apply_link = source_url
            if not item.get("title") or not apply_link:
                continue
            detected = item.get("detected_extensions") or {}
            found.append({
                "job_title": item.get("title", ""),
                "company": item.get("company_name", ""),
                "location": item.get("location", location),
                "description": item.get("description", ""),
                "apply_link": apply_link,
                "source": item.get("via", "Google Jobs (SerpApi)"),
                "source_url": source_url,
                "posted_at": detected.get("posted_at", ""),
                "industry": "",
                "company_type": "",
            })
    return found
