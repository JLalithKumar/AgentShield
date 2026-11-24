from datetime import datetime
from typing import Optional
from fastapi import Request, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.security import hash_session_token
from backend.app.database.session import get_db
from backend.app.database.models import User, AuthSession

def get_session_token_from_request(request: Request) -> Optional[str]:
    """Extract session token from HttpOnly cookie or Authorization header fallback."""
    # 1. Primary: HttpOnly cookie
    token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if token:
        return token

    # 2. Secondary: Authorization: Bearer <token>
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:].strip()

    return None

def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Retrieve current user from session if present and valid; returns None otherwise."""
    token = get_session_token_from_request(request)
    if not token:
        return None

    token_hash = hash_session_token(token)
    now = datetime.utcnow()

    auth_session = (
        db.query(AuthSession)
        .filter(
            AuthSession.session_token_hash == token_hash,
            AuthSession.revoked_at.is_(None),
            AuthSession.expires_at > now
        )
        .first()
    )

    if not auth_session or not auth_session.user or not auth_session.user.is_active:
        return None

    return auth_session.user

def get_current_user(
    current_user: Optional[User] = Depends(get_current_user_optional)
) -> User:
    """Enforce authentication, raising 401 if unauthenticated."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in to access this resource."
        )
    return current_user
