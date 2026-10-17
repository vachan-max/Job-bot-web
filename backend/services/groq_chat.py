import os

from langchain_groq import ChatGroq


DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b"


def create_groq_chat(**kwargs) -> ChatGroq:
    """Create the shared LangChain chat model for Groq-hosted inference."""
    return ChatGroq(
        api_key=os.getenv("GROQ_API_KEY"),
        model=os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL),
        **kwargs,
    )
