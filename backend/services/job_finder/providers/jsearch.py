from services.job_fetcher import RAPIDAPI_KEYS, fetch_jobs


def search_jobs(filters: dict) -> list[dict]:
    if not RAPIDAPI_KEYS:
        raise RuntimeError("JSearch fallback is unavailable because no RAPIDAPI_KEY_* credential is configured.")
    titles = filters.get("job_titles") or ["jobs"]
    modifiers = list(filters.get("skills") or []) + list(filters.get("keywords") or []) + list(filters.get("industries") or [])
    if filters.get("remote_preference") != "any":
        modifiers.append(filters["remote_preference"])
    if filters.get("employment_types"):
        modifiers.extend(filters["employment_types"])
    locations = filters.get("locations") or [""]
    jobs = []
    for title in titles[:2]:
        for location in locations[:2]:
            for item in fetch_jobs(
                job_title=" ".join([title] + modifiers),
                location=location,
                experience=filters.get("experience_level", ""),
                num_results=min(filters.get("results_limit", 20), 10),
                page=1,
            ):
                if item.get("apply_link"):
                    jobs.append({
                        "job_title": item.get("job_title", ""),
                        "company": item.get("company", ""),
                        "location": item.get("location", location),
                        "description": item.get("description", ""),
                        "apply_link": item["apply_link"],
                        "source": "JSearch (RapidAPI)",
                        "source_url": item["apply_link"],
                        "posted_at": item.get("posted_at", ""),
                        "industry": "",
                        "company_type": "",
                    })
    return jobs
