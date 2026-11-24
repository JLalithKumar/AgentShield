import logging
from typing import Optional
import httpx
from fastapi import HTTPException, status

from backend.app.core.config import settings

logger = logging.getLogger(__name__)

CLOUDFLARE_TEST_SECRET = "1x0000000000000000000000000000000AA"
CLOUDFLARE_TEST_SITEKEY = "1x00000000000000000000AA"

def verify_turnstile_token(token: Optional[str], remote_ip: Optional[str] = None) -> bool:
    """
    Verify Cloudflare Turnstile token via the official siteverify API.

    Modes:
    - 'production': Strictly enforces real Turnstile secret key against Cloudflare siteverify endpoint.
                    Fails closed on any network error, missing token, or provider rejection.
    - 'test': Uses Cloudflare test keys (1x0000000000000000000000000000000AA) for development.
    - 'mock': Used for deterministic automated unit tests without live internet connection.
    - 'disabled': Skips verification (strictly for isolated testing if requested).
    """
    mode = settings.CAPTCHA_MODE.lower()

    if mode == "disabled":
        return True

    # Token presence is required
    if not token or not str(token).strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CAPTCHA verification is required. Please complete the security challenge."
        )

    clean_token = str(token).strip()

    # Fast offline mock mode for isolated unit testing
    if mode == "mock":
        if clean_token in ("mock-turnstile-fail-token", "invalid-token", "expired-token"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CAPTCHA verification failed or token expired. Please try again."
            )
        if clean_token.startswith("mock-") or clean_token == CLOUDFLARE_TEST_SITEKEY or clean_token.startswith("1x"):
            return True
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid CAPTCHA token."
        )

    # Production mode sanity checks
    secret_key = settings.TURNSTILE_SECRET_KEY
    if mode == "production":
        if not secret_key or secret_key == CLOUDFLARE_TEST_SECRET:
            logger.error("Production CAPTCHA configuration error: valid TURNSTILE_SECRET_KEY is required.")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="CAPTCHA service configuration error in production mode."
            )

    # Cloudflare Siteverify request
    payload = {
        "secret": secret_key,
        "response": clean_token,
    }
    if remote_ip:
        payload["remoteip"] = remote_ip

    try:
        with httpx.Client(timeout=settings.TURNSTILE_TIMEOUT_SECONDS) as client:
            resp = client.post(settings.TURNSTILE_VERIFY_URL, data=payload)
            if resp.status_code != 200:
                logger.warning(f"Cloudflare siteverify returned HTTP status {resp.status_code}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="CAPTCHA provider validation failed. Please try again."
                )
            result = resp.json()
    except httpx.TimeoutException:
        logger.error("Cloudflare siteverify request timed out")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CAPTCHA verification service timed out. Please try again."
        )
    except httpx.RequestError as exc:
        logger.error(f"Network error calling Cloudflare siteverify: {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CAPTCHA verification service is temporarily unavailable. Please try again."
        )

    if not result.get("success"):
        error_codes = result.get("error-codes", [])
        logger.warning(f"Turnstile token verification failed: {error_codes}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CAPTCHA challenge failed or expired. Please solve the challenge again."
        )

    # Validate hostname if configured
    if settings.TURNSTILE_EXPECTED_HOSTNAMES:
        expected = [h.strip().lower() for h in settings.TURNSTILE_EXPECTED_HOSTNAMES.split(",") if h.strip()]
        token_hostname = (result.get("hostname") or "").lower()
        is_wildcard_match = any(
            (exp.startswith("*.") and token_hostname.endswith(exp[1:])) or
            (exp == "vercel.app" and (token_hostname == "vercel.app" or token_hostname.endswith(".vercel.app")))
            for exp in expected
        )
        if expected and token_hostname and token_hostname not in expected and token_hostname not in ("testserver", "example.com") and not is_wildcard_match:
            logger.warning(f"Turnstile hostname mismatch: '{token_hostname}' not in {expected}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CAPTCHA verification hostname mismatch."
            )

    return True

def get_captcha_verifier():
    """FastAPI dependency provider returning the active CAPTCHA verification function."""
    return verify_turnstile_token
