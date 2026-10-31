from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


class JobSearchFilters(BaseModel):
    job_titles: list[str] = Field(default_factory=list, max_length=8)
    industries: list[str] = Field(default_factory=list, max_length=12)
    locations: list[str] = Field(default_factory=list, max_length=8)
    experience_level: str = Field(default="", max_length=80)
    skills: list[str] = Field(default_factory=list, max_length=20)
    keywords: list[str] = Field(default_factory=list, max_length=20)
    employment_types: list[str] = Field(default_factory=list, max_length=8)
    remote_preference: Literal["any", "remote", "hybrid", "on-site"] = "any"
    date_posted: Literal["any", "day", "3days", "week", "month"] = "any"
    results_limit: int = Field(default=20, ge=1, le=30)

    @field_validator("job_titles", "industries", "locations", "skills", "keywords", "employment_types")
    @classmethod
    def clean_list(cls, values: list[str]) -> list[str]:
        return list(dict.fromkeys(value.strip()[:120] for value in values if value and value.strip()))


class InterpretSearchRequest(BaseModel):
    message: str = Field(min_length=2, max_length=2000)
    search_id: Optional[str] = None


class InterpretSearchResponse(BaseModel):
    search_id: Optional[str] = None
    assistant_message: str
    filters: Optional[JobSearchFilters] = None
    job_related: bool = True
    requires_clarification: bool = False
    clarification_question: Optional[str] = None


class RunSearchRequest(BaseModel):
    filters: JobSearchFilters
    send_email: bool = False


class SearchScheduleRequest(BaseModel):
    schedule_enabled: bool = True
    schedule_time: str = Field(default="09:00", pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    timezone: str | None = Field(default="Asia/Kolkata", max_length=80)
    email_enabled: bool = True


class JobSearchResult(BaseModel):
    job_title: str
    company: str = ""
    location: str = ""
    description: str = ""
    apply_link: str
    source: str = ""
    source_url: str = ""
    posted_at: str = ""
    industry: str = ""
    company_type: str = ""
    match_score: Optional[int] = None
    match_reasons: list[str] = Field(default_factory=list)
