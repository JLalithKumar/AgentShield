"""
Automated Security Tests: Authentication, Session Management, CSRF Enforcement,
and Persistent Brute-Force Rate Limiting (replaces obsolete CAPTCHA tests).
"""
import uuid
from datetime import datetime, timedelta
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.core.config import settings
from backend.app.core.rate_limit import get_client_ip, rate_limiter
from backend.app.database.models import RateLimitRecord

def test_registration_without_captcha_succeeds(client):
    """User registration succeeds cleanly without supplying any CAPTCHA token."""
    email = f"user_{uuid.uuid4().hex[:6]}@agentshield.org"
    resp = client.post("/api/auth/register", json={
        "full_name": "Autonomous Agent QA",
        "email": email,
        "password": "StrongPassword123!"
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == email
    assert data["full_name"] == "Autonomous Agent QA"
    assert "agentshield_session" in resp.cookies
    assert "agentshield_csrf" in resp.cookies

def test_login_without_captcha_succeeds(client):
    """User login succeeds cleanly without supplying any CAPTCHA token."""
    email = f"user_{uuid.uuid4().hex[:6]}@agentshield.org"
    password = "StrongPassword123!"
    # Register first
    client.post("/api/auth/register", json={
        "full_name": "Login Tester",
        "email": email,
        "password": password
    })
    # Login without turnstile_token
    resp = client.post("/api/auth/login", json={
        "email": email,
        "password": password
    })
    assert resp.status_code == 200
    assert resp.json()["email"] == email
    assert "agentshield_session" in resp.cookies

def test_rejection_of_invalid_credentials(client):
    """Submitting invalid credentials returns generic, non-revealing 401 Unauthorized."""
    email = f"user_{uuid.uuid4().hex[:6]}@agentshield.org"
    client.post("/api/auth/register", json={
        "full_name": "Invalid Creds Tester",
        "email": email,
        "password": "CorrectPassword123!"
    })

    bad_login = client.post("/api/auth/login", json={
        "email": email,
        "password": "WrongPassword999!"
    })
    assert bad_login.status_code == 401
    assert "invalid" in bad_login.json()["detail"].lower()

def test_duplicate_email_registration_rejected(client):
    """Registering with an already existing email returns 400 Bad Request."""
    email = f"dup_{uuid.uuid4().hex[:6]}@agentshield.org"
    reg_payload = {
        "full_name": "Original User",
        "email": email,
        "password": "Password123!"
    }
    resp1 = client.post("/api/auth/register", json=reg_payload)
    assert resp1.status_code == 201

    resp2 = client.post("/api/auth/register", json=reg_payload)
    assert resp2.status_code == 400
    assert "already exists" in resp2.json()["detail"].lower()

def test_csrf_protection_on_state_mutating_endpoints(client):
    """Cookie-authenticated state-mutating requests require a matching X-CSRF-Token header."""
    email = f"csrf_{uuid.uuid4().hex[:6]}@agentshield.org"
    reg_resp = client.post("/api/auth/register", json={
        "full_name": "CSRF Tester",
        "email": email,
        "password": "SecurePassword123!"
    })
    assert reg_resp.status_code == 201
    csrf_token = reg_resp.cookies.get("agentshield_csrf")
    assert csrf_token is not None

    payload = {"baseline_version": "v1.0", "candidate_version": "v1.1"}

    # 1. Mutating request with missing X-CSRF-Token header must return 403 Forbidden
    resp_no_csrf = client.post("/api/evaluations", json=payload)
    assert resp_no_csrf.status_code == 403
    assert "csrf" in resp_no_csrf.json()["detail"].lower()

    # 2. Mutating request with incorrect X-CSRF-Token header must return 403 Forbidden
    resp_bad_csrf = client.post("/api/evaluations", json=payload, headers={"X-CSRF-Token": "tampered-token"})
    assert resp_bad_csrf.status_code == 403

    # 3. Mutating request with matching X-CSRF-Token header succeeds
    resp_good_csrf = client.post("/api/evaluations", json=payload, headers={"X-CSRF-Token": csrf_token})
    assert resp_good_csrf.status_code == 200

def test_rate_limiting_enforcement_on_login(client):
    """Repeated rapid login attempts from the same client are rate limited with HTTP 429."""
    fake_ip = f"198.51.100.{uuid.uuid4().int % 200 + 10}"
    headers = {"X-Forwarded-For": fake_ip}

    # Perform requests up to the configured limit
    max_requests = settings.RATE_LIMIT_LOGIN_MAX
    for i in range(max_requests):
        resp = client.post("/api/auth/login", json={
            "email": "test@nonexistent.com",
            "password": "WrongPassword123!"
        }, headers=headers)
        # Should be 401 Unauthorized (normal authentication failure)
        assert resp.status_code in (401, 200)

    # The (max_requests + 1)-th request must be blocked by rate limiting
    blocked_resp = client.post("/api/auth/login", json={
        "email": "test@nonexistent.com",
        "password": "WrongPassword123!"
    }, headers=headers)
    assert blocked_resp.status_code == 429
    assert "too many requests" in blocked_resp.json()["detail"].lower()

def test_rate_limiting_enforcement_on_register(client):
    """Repeated rapid registration attempts from the same client are rate limited with HTTP 429."""
    fake_ip = f"203.0.113.{uuid.uuid4().int % 200 + 10}"
    headers = {"X-Forwarded-For": fake_ip}

    max_requests = settings.RATE_LIMIT_REGISTER_MAX
    for i in range(max_requests):
        resp = client.post("/api/auth/register", json={
            "full_name": f"User {i}",
            "email": f"rate_user_{i}_{uuid.uuid4().hex[:4]}@example.com",
            "password": "Password123!"
        }, headers=headers)
        assert resp.status_code == 201

    # Next attempt should be blocked
    blocked_resp = client.post("/api/auth/register", json={
        "full_name": "Blocked User",
        "email": f"blocked_{uuid.uuid4().hex[:4]}@example.com",
        "password": "Password123!"
    }, headers=headers)
    assert blocked_resp.status_code == 429
    assert "too many requests" in blocked_resp.json()["detail"].lower()

def test_unit_client_ip_extraction():
    """Unit test verify client IP resolution priority."""
    from unittest.mock import MagicMock
    req = MagicMock()
    req.headers = {"x-forwarded-for": "203.0.113.195, 10.0.0.1"}
    assert get_client_ip(req) == "203.0.113.195"

    req.headers = {"x-real-ip": "198.51.100.5"}
    assert get_client_ip(req) == "198.51.100.5"

    req.headers = {}
    req.client.host = "192.168.1.100"
    assert get_client_ip(req) == "192.168.1.100"
