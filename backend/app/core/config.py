import os
from typing import List

class Settings:
    PROJECT_NAME: str = "AgentShield Backend"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./agentshield.db")
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]
    
    # Execution
    DEFAULT_TIMEOUT_SECONDS: int = 5
    ENABLE_LIVE_LLM: bool = os.getenv("ENABLE_LIVE_LLM", "false").lower() == "true"

    # Authentication & Session Security
    SESSION_COOKIE_NAME: str = "agentshield_session"
    CSRF_COOKIE_NAME: str = "agentshield_csrf"
    SESSION_MAX_AGE_SECONDS: int = 60 * 60 * 24 * 7  # 7 days
    COOKIE_SECURE: bool = os.getenv("COOKIE_SECURE", "false").lower() == "true"
    COOKIE_SAMESITE: str = os.getenv("COOKIE_SAMESITE", "lax")

settings = Settings()
