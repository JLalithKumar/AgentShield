import uuid
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

def test_auth_workflow_and_session_cookies(client):
    suffix = uuid.uuid4().hex[:6]
    test_email = f"sarah.{suffix}@skydefense.ai"
    reg_payload = {
        "full_name": "Sarah Connor",
        "email": test_email,
        "password": "SecurePassword123!",
        "turnstile_token": "1x00000000000000000000AA"
    }
    reg_resp = client.post("/api/auth/register", json=reg_payload)
    assert reg_resp.status_code == 201, reg_resp.text
    reg_data = reg_resp.json()
    assert reg_data["email"] == test_email
    assert reg_data["full_name"] == "Sarah Connor"
    assert "password_hash" not in reg_data

    # Verify cookies were set
    cookies = reg_resp.cookies
    assert "agentshield_session" in cookies
    assert "agentshield_csrf" in cookies
    csrf_token = cookies.get("agentshield_csrf")

    # 2. Duplicate registration should be rejected
    dup_resp = client.post("/api/auth/register", json=reg_payload)
    assert dup_resp.status_code == 400
    assert "already exists" in dup_resp.json()["detail"].lower()

    # 3. Test /me with active session cookie
    me_resp = client.get("/api/auth/me")
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["authenticated"] is True
    assert me_data["user"]["email"] == test_email

    # 4. Logout with valid CSRF token header
    logout_resp = client.post("/api/auth/logout", headers={"X-CSRF-Token": csrf_token})
    assert logout_resp.status_code == 200

    # 5. /me after logout should report unauthenticated
    me_after_resp = client.get("/api/auth/me")
    assert me_after_resp.status_code == 200
    assert me_after_resp.json()["authenticated"] is False

    # 6. Login with valid credentials
    login_resp = client.post("/api/auth/login", json={
        "email": test_email,
        "password": "SecurePassword123!",
        "turnstile_token": "1x00000000000000000000AA"
    })
    assert login_resp.status_code == 200
    new_cookies = login_resp.cookies
    assert "agentshield_session" in new_cookies

    # 7. Login with invalid password
    bad_login = client.post("/api/auth/login", json={
        "email": test_email,
        "password": "WrongPassword!",
        "turnstile_token": "1x00000000000000000000AA"
    })
    assert bad_login.status_code == 401
    assert "invalid" in bad_login.json()["detail"].lower()

def test_evaluations_ownership_and_idor_protection(client):
    suffix = uuid.uuid4().hex[:6]
    with TestClient(app) as client_a, TestClient(app) as client_b:
        # Register User A
        user_a = {
            "full_name": "Alice QA",
            "email": f"alice.{suffix}@agentshield.org",
            "password": "PasswordAlice123!",
            "turnstile_token": "1x00000000000000000000AA"
        }
        reg_a = client_a.post("/api/auth/register", json=user_a)
        assert reg_a.status_code == 201
        login_a = client_a.post("/api/auth/login", json={
            "email": user_a["email"],
            "password": user_a["password"],
            "turnstile_token": "1x00000000000000000000AA"
        })
        assert login_a.status_code == 200
        csrf_a = client_a.cookies.get("agentshield_csrf", "")

        # Register User B
        user_b = {
            "full_name": "Bob Compliance",
            "email": f"bob.{suffix}@agentshield.org",
            "password": "PasswordBob123!",
            "turnstile_token": "1x00000000000000000000AA"
        }
        reg_b = client_b.post("/api/auth/register", json=user_b)
        assert reg_b.status_code == 201
        login_b = client_b.post("/api/auth/login", json={
            "email": user_b["email"],
            "password": user_b["password"],
            "turnstile_token": "1x00000000000000000000AA"
        })
        assert login_b.status_code == 200
        csrf_b = client_b.cookies.get("agentshield_csrf", "")

        # User A triggers an evaluation
        eval_resp = client_a.post("/api/evaluations", json={
            "baseline_version": "v1.0",
            "candidate_version": "v1.2"
        }, headers={"X-CSRF-Token": csrf_a})
        assert eval_resp.status_code == 200
        run_id = eval_resp.json()["run_id"]

        # User A can access their own evaluation
        get_a = client_a.get(f"/api/evaluations/{run_id}")
        assert get_a.status_code == 200
        assert get_a.json()["run_id"] == run_id

        # User B attempting to view User A's private run gets 404 Not Found (IDOR prevention)
        get_b = client_b.get(f"/api/evaluations/{run_id}")
        assert get_b.status_code == 404
        assert "not found" in get_b.json()["detail"].lower()

        # User B attempting to view User A's traces also gets 404 Not Found
        traces_b = client_b.get(f"/api/evaluations/{run_id}/traces")
        assert traces_b.status_code == 404

        # User A lists evaluations and sees their run
        list_a = client_a.get("/api/evaluations")
        assert list_a.status_code == 200
        run_ids_a = [r["run_id"] for r in list_a.json()]
        assert run_id in run_ids_a

        # User B lists evaluations and does NOT see User A's run (Strict User Isolation)
        list_b = client_b.get("/api/evaluations")
        assert list_b.status_code == 200
        run_ids_b = [r["run_id"] for r in list_b.json()]
        assert run_id not in run_ids_b
        assert len(run_ids_b) == 0

        # User B triggers their own evaluation
        eval_b = client_b.post("/api/evaluations", json={
            "baseline_version": "v1.0",
            "candidate_version": "v1.1"
        }, headers={"X-CSRF-Token": csrf_b})
        assert eval_b.status_code == 200
        run_b_id = eval_b.json()["run_id"]

        # User B sees only run_b_id
        list_b_updated = client_b.get("/api/evaluations")
        assert [r["run_id"] for r in list_b_updated.json()] == [run_b_id]

        # User A does NOT see run_b_id
        list_a_check = client_a.get("/api/evaluations")
        assert run_b_id not in [r["run_id"] for r in list_a_check.json()]

        # User A attempting to view User B's run gets 404
        assert client_a.get(f"/api/evaluations/{run_b_id}").status_code == 404
        assert client_a.get(f"/api/evaluations/{run_b_id}/traces").status_code == 404

def test_anonymous_access_rejected_across_all_evaluation_endpoints(client):
    """
    Mandatory authentication verification:
    Every evaluation endpoint must reject unauthenticated requests with HTTP 401.
    """
    # POST /api/evaluations
    resp_post = client.post("/api/evaluations", json={
        "baseline_version": "v1.0",
        "candidate_version": "v1.1"
    })
    assert resp_post.status_code == 401
    assert "authentication required" in resp_post.json()["detail"].lower()

    # GET /api/evaluations
    resp_list = client.get("/api/evaluations")
    assert resp_list.status_code == 401
    assert "authentication required" in resp_list.json()["detail"].lower()

    # GET /api/evaluations/{run_id}
    resp_get = client.get("/api/evaluations/non-existent-or-any-run-id")
    assert resp_get.status_code == 401
    assert "authentication required" in resp_get.json()["detail"].lower()

    # GET /api/evaluations/{run_id}/traces
    resp_traces = client.get("/api/evaluations/non-existent-or-any-run-id/traces")
    assert resp_traces.status_code == 401
    assert "authentication required" in resp_traces.json()["detail"].lower()

def test_revoked_session_cookie_cannot_access_evaluations(client):
    """Logging out revokes session on server, preventing any subsequent evaluation access."""
    suffix = uuid.uuid4().hex[:6]
    email = f"session.test.{suffix}@agentshield.org"
    client.post("/api/auth/register", json={
        "full_name": "Session Tester",
        "email": email,
        "password": "Password123!",
        "turnstile_token": "1x00000000000000000000AA"
    })
    login_resp = client.post("/api/auth/login", json={
        "email": email,
        "password": "Password123!",
        "turnstile_token": "1x00000000000000000000AA"
    })
    assert login_resp.status_code == 200
    saved_cookies = dict(login_resp.cookies)
    csrf = saved_cookies.get("agentshield_csrf", "")

    # Valid session can list evaluations
    assert client.get("/api/evaluations").status_code == 200

    # Logout
    logout_resp = client.post("/api/auth/logout", headers={"X-CSRF-Token": csrf})
    assert logout_resp.status_code == 200

    # Put revoked cookie back on client to test access
    client.cookies.clear()
    client.cookies.update(saved_cookies)

    # Subsequent access with same cookie must be rejected with 401
    assert client.get("/api/evaluations").status_code == 401
    assert client.post("/api/evaluations", json={
        "baseline_version": "v1.0",
        "candidate_version": "v1.1"
    }, headers={"X-CSRF-Token": csrf}).status_code == 401
