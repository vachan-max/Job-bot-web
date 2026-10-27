from datetime import datetime, timezone

from scheduler import calculate_next_run, dedupe_new_jobs


def test_next_run_uses_configured_timezone():
    now = datetime(2026, 1, 15, 13, 0, tzinfo=timezone.utc)
    result = calculate_next_run("09:00", "America/Los_Angeles", now)
    assert result == datetime(2026, 1, 15, 17, 0, tzinfo=timezone.utc)


def test_next_run_moves_to_tomorrow_when_local_time_passed():
    now = datetime(2026, 1, 15, 18, 0, tzinfo=timezone.utc)
    result = calculate_next_run("09:00", "America/Los_Angeles", now)
    assert result == datetime(2026, 1, 16, 17, 0, tzinfo=timezone.utc)


def test_next_run_converts_multiple_iana_timezones():
    cases = [
        ("Asia/Kolkata", datetime(2026, 1, 15, 5, 0, tzinfo=timezone.utc), "11:00", datetime(2026, 1, 15, 5, 30, tzinfo=timezone.utc)),
        ("Europe/Paris", datetime(2026, 1, 15, 8, 0, tzinfo=timezone.utc), "10:00", datetime(2026, 1, 15, 9, 0, tzinfo=timezone.utc)),
        ("America/New_York", datetime(2026, 7, 15, 12, 0, tzinfo=timezone.utc), "09:00", datetime(2026, 7, 15, 13, 0, tzinfo=timezone.utc)),
        ("UTC", datetime(2026, 1, 15, 8, 0, tzinfo=timezone.utc), "09:00", datetime(2026, 1, 15, 9, 0, tzinfo=timezone.utc)),
    ]
    for zone, now, schedule_time, expected in cases:
        assert calculate_next_run(schedule_time, zone, now) == expected


def test_dedupe_drops_seen_and_duplicate_job_links():
    jobs = [
        {"job_title": "Already seen", "apply_link": "https://jobs.example/a"},
        {"job_title": "New", "apply_link": "https://jobs.example/b?ref=1"},
        {"job_title": "Duplicate", "apply_link": "https://jobs.example/b?ref=1"},
    ]
    fresh, ids = dedupe_new_jobs(jobs, {"https://jobs.example/a"})
    assert [job["job_title"] for job in fresh] == ["New"]
    assert ids == ["https://jobs.example/b?ref=1"]


