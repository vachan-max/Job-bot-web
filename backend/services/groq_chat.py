import os

from langchain_groq import ChatGroq


DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b"
DEFAULT_JOB_FINDER_MODEL = "openai/gpt-oss-20b"


def create_groq_chat(**kwargs) -> ChatGroq:
    """Create the shared LangChain chat model for Groq-hosted inference."""
    return ChatGroq(
        api_key=os.getenv("GROQ_API_KEY"),
        model=os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL),
        **kwargs,
    )


def create_job_finder_chat(**kwargs) -> ChatGroq:
    """Create the smaller, Job Finder-specific Groq chat model."""
    return ChatGroq(
        api_key=os.getenv("GROQ_API_KEY"),
        model=os.getenv("JOB_FINDER_GROQ_MODEL", DEFAULT_JOB_FINDER_MODEL),
        **kwargs,
    )
