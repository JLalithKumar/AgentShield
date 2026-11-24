import random
from datetime import datetime, timedelta
from typing import Callable
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.database.session import get_db
from backend.app.database.models import RateLimitRecord

def get_client_ip(request: Request) -> str:
    """
    Extract the real client IP address, handling Render and reverse proxy headers.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # First entry is the original client IP
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    if request.client and request.client.host:
        return request.client.host.strip()
    return "127.0.0.1"

def rate_limiter(action: str, max_requests: int, window_seconds: int) -> Callable:
    """
    FastAPI dependency factory providing persistent, database-backed rate limiting
    suitable for serverless environments (Vercel + Neon / SQLite).

    Tracks request counts within a sliding time window per (action, client_ip).
    """
    def check_rate_limit(request: Request, db: Session = Depends(get_db)):
        client_ip = get_client_ip(request)
        rate_key = f"{action}:{client_ip}"
        now = datetime.utcnow()
        window_start = now - timedelta(seconds=window_seconds)

        # Count occurrences in the active time window
        recent_count = (
            db.query(RateLimitRecord)
            .filter(
                RateLimitRecord.key == rate_key,
                RateLimitRecord.created_at >= window_start
            )
            .count()
        )

        if recent_count >= max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many requests for {action}. Please try again later."
            )

        # Record this request
        record = RateLimitRecord(key=rate_key, created_at=now)
        db.add(record)
        db.commit()

        # Opportunistic cleanup: delete expired records (> 1 hour old) ~5% of requests
        if random.random() < 0.05:
            try:
                one_hour_ago = now - timedelta(hours=1)
                db.query(RateLimitRecord).filter(RateLimitRecord.created_at < one_hour_ago).delete(synchronize_session=False)
                db.commit()
            except Exception:
                pass  # Non-critical background maintenance

    return check_rate_limit
