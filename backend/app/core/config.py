import os
from typing import List

class Settings:
    PROJECT_NAME: str = "AgentShield Backend"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./agentshield.db")
    DB_POOL_SIZE: int = int(os.getenv("DB_POOL_SIZE", "5"))
    DB_MAX_OVERFLOW: int = int(os.getenv("DB_MAX_OVERFLOW", "10"))
    DB_POOL_RECYCLE: int = int(os.getenv("DB_POOL_RECYCLE", "300"))
    
    # CORS
    @property
    def CORS_ORIGINS(self) -> List[str]:
        base = [
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
            "http://localhost:8000",
        ]
        extra = os.getenv("CORS_ORIGINS", "")
        if extra:
            for item in extra.split(","):
                item = item.strip()
                if item and item not in base:
                    base.append(item)
        return base
    
    # Execution
    DEFAULT_TIMEOUT_SECONDS: int = 5
    ENABLE_LIVE_LLM: bool = os.getenv("ENABLE_LIVE_LLM", "false").lower() == "true"

    # Authentication & Session Security
    SESSION_COOKIE_NAME: str = "agentshield_session"
    CSRF_COOKIE_NAME: str = "agentshield_csrf"
    SESSION_MAX_AGE_SECONDS: int = 60 * 60 * 24 * 7  # 7 days
    # When deployed to Vercel (HTTPS), default COOKIE_SECURE to True automatically
    COOKIE_SECURE: bool = os.getenv("COOKIE_SECURE", "true" if os.getenv("VERCEL") else "false").lower() == "true"
    COOKIE_SAMESITE: str = os.getenv("COOKIE_SAMESITE", "lax")

    # Brute-force & Abuse Rate Limiting (Serverless & Persistent)
    RATE_LIMIT_LOGIN_MAX: int = int(os.getenv("RATE_LIMIT_LOGIN_MAX", "10"))
    RATE_LIMIT_LOGIN_WINDOW_SECONDS: int = int(os.getenv("RATE_LIMIT_LOGIN_WINDOW_SECONDS", "60"))
    RATE_LIMIT_REGISTER_MAX: int = int(os.getenv("RATE_LIMIT_REGISTER_MAX", "5"))
    RATE_LIMIT_REGISTER_WINDOW_SECONDS: int = int(os.getenv("RATE_LIMIT_REGISTER_WINDOW_SECONDS", "60"))
    RATE_LIMIT_EVALUATIONS_MAX: int = int(os.getenv("RATE_LIMIT_EVALUATIONS_MAX", "30"))
    RATE_LIMIT_EVALUATIONS_WINDOW_SECONDS: int = int(os.getenv("RATE_LIMIT_EVALUATIONS_WINDOW_SECONDS", "60"))

settings = Settings()
