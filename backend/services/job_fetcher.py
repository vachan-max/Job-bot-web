import os
import random
import requests
from dotenv import load_dotenv

load_dotenv()

RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")

def fetch_jobs(job_title: str, location: str, num_results: int = 10, page: int = None) -> list:
    url = "https://jsearch.p.rapidapi.com/search"

    # Rotate pages 1-3 for variety — page 4+ often returns empty
    selected_page = page if page is not None else random.randint(1, 3)

    headers = {
        "X-RapidAPI-Key" : RAPIDAPI_KEY,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
    }

    print(f"[job_fetcher] Fetching page {selected_page} for '{job_title}' in '{location}'")

    # Try with "3days" first, fall back to "week" if no results
    for date_filter in ["3days", "week", "month"]:
        querystring = {
            "query"      : f"{job_title} in {location}",
            "page"       : str(selected_page),
            "num_pages"  : "1",
            "date_posted": date_filter
        }

        try:
            response = requests.get(url, headers=headers, params=querystring)

            if response.status_code != 200:
                print(f"[job_fetcher] API status {response.status_code} — stopping")
                return []

            data = response.json()

            if data.get("status") != "OK":
                print(f"[job_fetcher] API error: {data.get('message', 'Unknown error')}")
                return []

            jobs = data.get("data", [])
            print(f"[job_fetcher] Got {len(jobs)} raw jobs (filter: {date_filter})")

            if not jobs:
                print(f"[job_fetcher] No results for '{date_filter}' — trying wider filter...")
                continue  # try next date filter

            result = []
            for job in jobs[:num_results]:
                apply_link = job.get("job_apply_link", "")
                if not apply_link:
                    continue
                result.append({
                    "job_title"  : job.get("job_title", ""),
                    "company"    : job.get("employer_name", ""),
                    "location"   : job.get("job_city", location),
                    "description": job.get("job_description", ""),
                    "apply_link" : apply_link,
                })

            print(f"[job_fetcher] Returning {len(result)} jobs (filtered no-link jobs)")

            if result:
                return result

            # If all jobs had no apply link, try wider filter
            print(f"[job_fetcher] All jobs missing apply link — trying wider filter...")

        except Exception as e:
            print(f"[job_fetcher] Error: {e}")
            return []

    print(f"[job_fetcher] No jobs found after all filters")
    return []