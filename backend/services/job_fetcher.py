import os
import random
import requests
from dotenv import load_dotenv

load_dotenv()

# Load all API keys dynamically (RAPIDAPI_KEY_1, RAPIDAPI_KEY_2, ...).
RAPIDAPI_KEYS = [os.getenv(key) for key in os.environ if key.startswith("RAPIDAPI_KEY_")]
RAPIDAPI_KEYS = [key for key in RAPIDAPI_KEYS if key]


def fetch_jobs(
    job_title: str,
    location: str,
    experience: str = "",
    num_results: int = 10,
    page: int | None = None,
) -> list[dict]:
    url = "https://jsearch.p.rapidapi.com/search"
    selected_page = page if page is not None else random.randint(1, 3)
    print(f"[job_fetcher] Fetching page {selected_page} for '{job_title}' in '{location}'")

    experience_map = {
        "Any level": "",
        "0-1 years": "entry level fresher 0-1 years",
        "0-2 years": "junior entry level 0-2 years",
        "2-4 years": "mid level 2-4 years experience",
        "4-7 years": "senior level 4-7 years experience",
        "7+ years": "lead expert principal 7+ years experience",
    }
    exp_term = experience_map.get(experience or "Any level", "")

    for api_key in RAPIDAPI_KEYS:
        headers = {
            "X-RapidAPI-Key": api_key,
            "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        }
        print(f"[job_fetcher] Using key: {api_key[:5]}****")

        for date_filter in ("3days", "week", "month"):
            params = {
                "query": f"{job_title} {exp_term} in {location}",
                "page": str(selected_page),
                "num_pages": "1",
                "date_posted": date_filter,
            }
            try:
                response = requests.get(url, headers=headers, params=params, timeout=30)
                if response.status_code in (429, 403):
                    print(f"[job_fetcher] Key hit limit ({response.status_code}) → switching key")
                    break
                if response.status_code != 200:
                    print(f"[job_fetcher] API status {response.status_code} → trying next key")
                    break

                data = response.json()
                if data.get("status") != "OK":
                    print(f"[job_fetcher] API error: {data.get('message', 'Unknown error')}")
                    return []

                jobs = data.get("data", [])
                print(f"[job_fetcher] Got {len(jobs)} jobs (filter: {date_filter})")
                results = []
                for job in jobs[:num_results]:
                    apply_link = job.get("job_apply_link", "")
                    if apply_link:
                        results.append({
                            "job_title": job.get("job_title", ""),
                            "company": job.get("employer_name", ""),
                            "location": job.get("job_city", location),
                            "description": job.get("job_description", ""),
                            "apply_link": apply_link,
                            "posted_at": job.get("job_posted_at_datetime_utc", ""),
                        })
                if results:
                    print(f"[job_fetcher] Returning {len(results)} jobs")
                    return results
            except Exception as exc:
                print(f"[job_fetcher] Error: {exc}")
                return []

    print("[job_fetcher] All API keys exhausted or no jobs found")
    return []
