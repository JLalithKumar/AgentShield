from typing import Optional
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.main import app
from backend.app.database.session import Base, get_db
from backend.app.database import models  # Ensure all models are registered on Base
from backend.app.banking.simulator import banking_simulator
from backend.app.core.captcha import get_captcha_verifier

def mock_captcha_verifier(token: Optional[str], remote_ip: Optional[str] = None) -> bool:
    """
    Isolated test double for CAPTCHA verification in automated tests.
    - Rejects missing or whitespace-only tokens with HTTP 400.
    - Rejects simulated failure/expired tokens with HTTP 400.
    - Rejects simulated timeout tokens with HTTP 503.
    - Rejects simulated provider error tokens with HTTP 400.
    - Accepts valid test tokens (1x..., mock-..., valid-test-token) without making network calls.
    """
    if not token or not str(token).strip():
        raise HTTPException(
            status_code=400,
            detail="CAPTCHA verification is required. Please complete the security challenge."
        )
    clean = str(token).strip()
    if clean in ("mock-turnstile-fail-token", "invalid-token", "expired-token"):
        raise HTTPException(
            status_code=400,
            detail="CAPTCHA challenge failed or expired. Please solve the challenge again."
        )
    if clean == "mock-timeout":
        raise HTTPException(
            status_code=503,
            detail="CAPTCHA verification service timed out. Please try again."
        )
    if clean == "mock-provider-error":
        raise HTTPException(
            status_code=400,
            detail="CAPTCHA provider validation failed. Please try again."
        )
    if clean.startswith("mock-") or clean.startswith("1x") or clean == "valid-test-token":
        return True
    raise HTTPException(
        status_code=400,
        detail="Invalid CAPTCHA token."
    )

# In-memory test database with StaticPool so all connections share the same memory database
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db():
    """Create fresh tables for every test function."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db):
    """FastAPI TestClient with overridden database and mock CAPTCHA dependencies."""
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_captcha_verifier] = lambda: mock_captcha_verifier
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def reset_simulator():
    """Reset simulated banking environment before every test."""
    banking_simulator.reset()
    yield
    banking_simulator.reset()
