import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Tuple
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError

# Configure Argon2id hasher with secure parameters
_hasher = PasswordHasher(
    time_cost=2,
    memory_cost=65536,  # 64 MB
    parallelism=1,
    hash_len=32
)

def hash_password(plain_password: str) -> str:
    """Hash password using Argon2id."""
    return _hasher.hash(plain_password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against stored Argon2id hash."""
    try:
        return _hasher.verify(hashed_password, plain_password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False

def generate_session_token() -> str:
    """Generate a cryptographically secure opaque session token."""
    return secrets.token_urlsafe(32)

def hash_session_token(token: str) -> str:
    """Hash session token using SHA-256 for secure database storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

def generate_csrf_token() -> str:
    """Generate a cryptographically secure CSRF token."""
    return secrets.token_urlsafe(32)
