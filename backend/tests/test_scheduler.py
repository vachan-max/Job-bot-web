from datetime import datetime, timezone

from scheduler import calculate_next_run, dedupe_new_jobs


def test_next_run_uses_fixed_kolkata_timezone_even_for_legacy_timezone():
    now = datetime(2026, 1, 15, 13, 0, tzinfo=timezone.utc)
    result = calculate_next_run("09:00", "America/Los_Angeles", now)
    assert result == datetime(2026, 1, 16, 3, 30, tzinfo=timezone.utc)


def test_next_run_moves_to_tomorrow_when_local_time_passed():
    now = datetime(2026, 1, 15, 18, 0, tzinfo=timezone.utc)
    result = calculate_next_run("09:00", None, now)
    assert result == datetime(2026, 1, 16, 3, 30, tzinfo=timezone.utc)


def test_next_run_defaults_for_missing_and_empty_timezone():
    now = datetime(2026, 1, 15, 5, 0, tzinfo=timezone.utc)
    expected = datetime(2026, 1, 15, 5, 30, tzinfo=timezone.utc)
    assert calculate_next_run("11:00", None, now) == expected
    assert calculate_next_run("11:00", "", now) == expected


def test_schedule_request_accepts_null_timezone_but_defaults_to_kolkata():
    from models.job_finder import SearchScheduleRequest

    request = SearchScheduleRequest(timezone=None)
    assert request.timezone is None
    assert SearchScheduleRequest().timezone == "Asia/Kolkata"


def test_dedupe_drops_seen_and_duplicate_job_links():
    jobs = [
        {"job_title": "Already seen", "apply_link": "https://jobs.example/a"},
        {"job_title": "New", "apply_link": "https://jobs.example/b?ref=1"},
        {"job_title": "Duplicate", "apply_link": "https://jobs.example/b?ref=1"},
    ]
    fresh, ids = dedupe_new_jobs(jobs, {"https://jobs.example/a"})
    assert [job["job_title"] for job in fresh] == ["New"]
    assert ids == ["https://jobs.example/b?ref=1"]


