from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.security import (
    hash_password,
    verify_password,
    generate_session_token,
    hash_session_token,
    generate_csrf_token,
)
from backend.app.database.session import get_db
from backend.app.database.models import User, AuthSession
from backend.app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    UserResponse,
    AuthStatusResponse,
)
from backend.app.api.deps import get_current_user_optional, get_current_user, get_session_token_from_request

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    req: UserRegisterRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Register a new user account with Argon2id password hashing and establish a secure session.
    """
    normalized_email = req.email.strip().lower()

    # Check for existing user
    existing_user = db.query(User).filter(User.email == normalized_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # Hash password with Argon2id
    password_hash = hash_password(req.password)

    user = User(
        full_name=req.full_name.strip(),
        email=normalized_email,
        password_hash=password_hash,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create opaque session token
    raw_token = generate_session_token()
    token_hash = hash_session_token(raw_token)
    expires_at = datetime.utcnow() + timedelta(seconds=settings.SESSION_MAX_AGE_SECONDS)

    session_record = AuthSession(
        user_id=user.id,
        session_token_hash=token_hash,
        expires_at=expires_at
    )
    db.add(session_record)
    db.commit()

    # Set secure cookies
    csrf_token = generate_csrf_token()
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=raw_token,
        max_age=settings.SESSION_MAX_AGE_SECONDS,
        httponly=True,
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.COOKIE_SECURE,
        path="/"
    )
    response.set_cookie(
        key=settings.CSRF_COOKIE_NAME,
        value=csrf_token,
        max_age=settings.SESSION_MAX_AGE_SECONDS,
        httponly=False,
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.COOKIE_SECURE,
        path="/"
    )

    return user

@router.post("/login", response_model=UserResponse)
def login_user(
    req: UserLoginRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Authenticate user credentials, issue an opaque session token, and set HttpOnly cookies.
    """
    normalized_email = req.email.strip().lower()

    user = db.query(User).filter(User.email == normalized_email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact support."
        )

    # Create session
    raw_token = generate_session_token()
    token_hash = hash_session_token(raw_token)
    expires_at = datetime.utcnow() + timedelta(seconds=settings.SESSION_MAX_AGE_SECONDS)

    session_record = AuthSession(
        user_id=user.id,
        session_token_hash=token_hash,
        expires_at=expires_at
    )
    db.add(session_record)
    db.commit()

    csrf_token = generate_csrf_token()
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=raw_token,
        max_age=settings.SESSION_MAX_AGE_SECONDS,
        httponly=True,
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.COOKIE_SECURE,
        path="/"
    )
    response.set_cookie(
        key=settings.CSRF_COOKIE_NAME,
        value=csrf_token,
        max_age=settings.SESSION_MAX_AGE_SECONDS,
        httponly=False,
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.COOKIE_SECURE,
        path="/"
    )

    return user

@router.get("/me", response_model=AuthStatusResponse)
def get_auth_status(
    current_user: User = Depends(get_current_user_optional)
):
    """
    Check current session status and return authenticated user profile.
    """
    if not current_user:
        return {"authenticated": False, "user": None}
    return {"authenticated": True, "user": current_user}

@router.post("/logout")
def logout_user(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Revoke active session token in the database and clear authentication cookies.
    """
    token = get_session_token_from_request(request)
    if token:
        token_hash = hash_session_token(token)
        session_record = (
            db.query(AuthSession)
            .filter(
                AuthSession.session_token_hash == token_hash,
                AuthSession.revoked_at.is_(None)
            )
            .first()
        )
        if session_record:
            session_record.revoked_at = datetime.utcnow()
            db.commit()

    response.delete_cookie(key=settings.SESSION_COOKIE_NAME, path="/")
    response.delete_cookie(key=settings.CSRF_COOKIE_NAME, path="/")
    return {"message": "Logged out successfully"}
