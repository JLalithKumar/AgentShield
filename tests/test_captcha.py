from unittest.mock import MagicMock, patch
import pytest
import httpx
from fastapi import HTTPException
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.core.captcha import verify_turnstile_token
from backend.app.core.config import settings

def test_missing_captcha_token_rejected_on_registration(client):
    """Registration without a CAPTCHA token must fail with HTTP 400."""
    resp = client.post("/api/auth/register", json={
        "full_name": "No Captcha User",
        "email": "nocaptcha@example.com",
        "password": "Password123!"
        # turnstile_token omitted
    })
    assert resp.status_code == 400
    assert "captcha" in resp.json()["detail"].lower()

def test_empty_captcha_token_rejected_on_registration(client):
    """Registration with whitespace-only CAPTCHA token must fail with HTTP 400."""
    resp = client.post("/api/auth/register", json={
        "full_name": "Empty Captcha User",
        "email": "emptycaptcha@example.com",
        "password": "Password123!",
        "turnstile_token": "   "
    })
    assert resp.status_code == 400
    assert "captcha" in resp.json()["detail"].lower()

def test_missing_captcha_token_rejected_on_login(client):
    """Login without a CAPTCHA token must fail with HTTP 400."""
    resp = client.post("/api/auth/login", json={
        "email": "nocaptcha@example.com",
        "password": "Password123!"
        # turnstile_token omitted
    })
    assert resp.status_code == 400
    assert "captcha" in resp.json()["detail"].lower()

def test_invalid_captcha_token_rejected(client):
    """Submitting an invalid CAPTCHA token must be rejected with HTTP 400."""
    resp = client.post("/api/auth/register", json={
        "full_name": "Invalid Captcha",
        "email": "invalidcaptcha@example.com",
        "password": "Password123!",
        "turnstile_token": "invalid-token"
    })
    assert resp.status_code == 400
    assert "failed" in resp.json()["detail"].lower() or "invalid" in resp.json()["detail"].lower()

def test_expired_or_replayed_token_rejected(client):
    """Submitting an expired or replayed CAPTCHA token must be rejected with HTTP 400."""
    resp = client.post("/api/auth/login", json={
        "email": "expired@example.com",
        "password": "Password123!",
        "turnstile_token": "expired-token"
    })
    assert resp.status_code == 400
    assert "expired" in resp.json()["detail"].lower() or "challenge" in resp.json()["detail"].lower()

def test_captcha_provider_timeout_fails_closed(client):
    """When the CAPTCHA provider times out, verification fails closed (503 Service Unavailable)."""
    resp = client.post("/api/auth/login", json={
        "email": "timeout@example.com",
        "password": "Password123!",
        "turnstile_token": "mock-timeout"
    })
    assert resp.status_code == 503
    assert "timed out" in resp.json()["detail"].lower()

def test_captcha_provider_failure_rejected(client):
    """When the provider returns an error, the challenge fails closed with HTTP 400."""
    resp = client.post("/api/auth/register", json={
        "full_name": "Provider Fail",
        "email": "providerfail@example.com",
        "password": "Password123!",
        "turnstile_token": "mock-provider-error"
    })
    assert resp.status_code == 400
    assert "validation failed" in resp.json()["detail"].lower()

def test_valid_captcha_and_correct_credentials_succeeds(client):
    """A valid CAPTCHA token with valid registration and login credentials succeeds."""
    email = "valid.auth@example.com"
    reg_resp = client.post("/api/auth/register", json={
        "full_name": "Valid Auth User",
        "email": email,
        "password": "StrongPassword123!",
        "turnstile_token": "1x00000000000000000000AA"
    })
    assert reg_resp.status_code == 201
    assert "agentshield_session" in reg_resp.cookies

    login_resp = client.post("/api/auth/login", json={
        "email": email,
        "password": "StrongPassword123!",
        "turnstile_token": "1x00000000000000000000AA"
    })
    assert login_resp.status_code == 200
    assert "agentshield_session" in login_resp.cookies

def test_valid_captcha_and_incorrect_credentials_fails(client):
    """Valid CAPTCHA token but incorrect credentials returns 401 Unauthorized."""
    email = "registered.user@example.com"
    client.post("/api/auth/register", json={
        "full_name": "Registered User",
        "email": email,
        "password": "CorrectPassword123!",
        "turnstile_token": "1x00000000000000000000AA"
    })

    bad_login = client.post("/api/auth/login", json={
        "email": email,
        "password": "IncorrectPassword999!",
        "turnstile_token": "1x00000000000000000000AA"
    })
    assert bad_login.status_code == 401
    assert "invalid" in bad_login.json()["detail"].lower()

def test_csrf_protection_on_state_mutating_endpoints(client):
    """Cookie-authenticated state-mutating requests require a matching X-CSRF-Token header."""
    # 1. Register user
    reg_resp = client.post("/api/auth/register", json={
        "full_name": "CSRF Tester",
        "email": "csrf.tester@example.com",
        "password": "SecurePassword123!",
        "turnstile_token": "1x00000000000000000000AA"
    })
    assert reg_resp.status_code == 201
    csrf_token = reg_resp.cookies.get("agentshield_csrf")
    assert csrf_token is not None

    payload = {"baseline_version": "v1.0", "candidate_version": "v1.1"}

    # 2. Mutating request with missing X-CSRF-Token header must return 403 Forbidden
    resp_no_csrf = client.post("/api/evaluations", json=payload)
    assert resp_no_csrf.status_code == 403
    assert "csrf" in resp_no_csrf.json()["detail"].lower()

    # 3. Mutating request with incorrect X-CSRF-Token header must return 403 Forbidden
    resp_bad_csrf = client.post("/api/evaluations", json=payload, headers={"X-CSRF-Token": "tampered-token"})
    assert resp_bad_csrf.status_code == 403

    # 4. Mutating request with matching X-CSRF-Token header succeeds
    resp_good_csrf = client.post("/api/evaluations", json=payload, headers={"X-CSRF-Token": csrf_token})
    assert resp_good_csrf.status_code == 200

# =========================================================================
# Unit tests directly verifying backend/app/core/captcha.py logic with mocks
# =========================================================================

def test_unit_verify_turnstile_token_missing():
    with pytest.raises(HTTPException) as exc:
        verify_turnstile_token(None)
    assert exc.value.status_code == 400

    with pytest.raises(HTTPException) as exc:
        verify_turnstile_token("   ")
    assert exc.value.status_code == 400

def test_unit_verify_turnstile_timeout(monkeypatch):
    monkeypatch.setattr(settings, "CAPTCHA_MODE", "production")
    monkeypatch.setattr(settings, "TURNSTILE_SECRET_KEY", "real-prod-secret-key-12345")

    with patch("httpx.Client.post", side_effect=httpx.TimeoutException("Connection timed out")):
        with pytest.raises(HTTPException) as exc:
            verify_turnstile_token("some-token")
        assert exc.value.status_code == 503
        assert "timed out" in exc.value.detail.lower()

def test_unit_verify_turnstile_network_error(monkeypatch):
    monkeypatch.setattr(settings, "CAPTCHA_MODE", "production")
    monkeypatch.setattr(settings, "TURNSTILE_SECRET_KEY", "real-prod-secret-key-12345")

    with patch("httpx.Client.post", side_effect=httpx.ConnectError("Network unreachable")):
        with pytest.raises(HTTPException) as exc:
            verify_turnstile_token("some-token")
        assert exc.value.status_code == 503
        assert "temporarily unavailable" in exc.value.detail.lower()

def test_unit_verify_turnstile_provider_rejection(monkeypatch):
    monkeypatch.setattr(settings, "CAPTCHA_MODE", "production")
    monkeypatch.setattr(settings, "TURNSTILE_SECRET_KEY", "real-prod-secret-key-12345")

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "success": False,
        "error-codes": ["invalid-input-response"]
    }

    with patch("httpx.Client.post", return_value=mock_resp):
        with pytest.raises(HTTPException) as exc:
            verify_turnstile_token("rejected-token")
        assert exc.value.status_code == 400
        assert "failed or expired" in exc.value.detail.lower()

def test_unit_verify_turnstile_success(monkeypatch):
    monkeypatch.setattr(settings, "CAPTCHA_MODE", "production")
    monkeypatch.setattr(settings, "TURNSTILE_SECRET_KEY", "real-prod-secret-key-12345")

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "success": True,
        "hostname": "localhost"
    }

    with patch("httpx.Client.post", return_value=mock_resp):
        assert verify_turnstile_token("good-valid-token") is True
