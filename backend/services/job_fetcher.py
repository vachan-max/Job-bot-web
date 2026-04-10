import os
import requests
from dotenv import load_dotenv

load_dotenv()

RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")


def fetch_jobs(job_title: str, location: str, num_results: int = 10) -> list:
    """
    Fetches jobs from JSearch API.
    Parameters come from user preferences (not .env)
    """
    url = "https://jsearch.p.rapidapi.com/search"

    querystring = {
        "query"     : f"{job_title} in {location}",
        "page"      : "1",
        "num_pages" : "1",
        "date_posted": "today"
    }

    headers = {
        "X-RapidAPI-Key" : RAPIDAPI_KEY,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
    }

    try:
        response = requests.get(url, headers=headers, params=querystring)
        data     = response.json()
        jobs     = data.get("data", [])

        result = []
        for job in jobs[:num_results]:
            result.append({
                "job_title"  : job.get("job_title", ""),
                "company"    : job.get("employer_name", ""),
                "location"   : job.get("job_city", location),
                "description": job.get("job_description", ""),
                "apply_link" : job.get("job_apply_link", ""),
            })
        return result

    except Exception as e:
        print(f"[job_fetcher] Error: {e}")
        return []