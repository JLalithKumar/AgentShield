from fastapi.testclient import TestClient
from backend.app.main import app

def get_authenticated_cookies(client, email="qa@agentshield.org"):
    """Helper to register and login a test user, returning session cookies."""
    client.post("/api/auth/register", json={
        "full_name": "QA Specialist",
        "email": email,
        "password": "SecurePassword123!",
        "turnstile_token": "1x00000000000000000000AA"
    })
    login_resp = client.post("/api/auth/login", json={
        "email": email,
        "password": "SecurePassword123!",
        "turnstile_token": "1x00000000000000000000AA"
    })
    client.cookies.update(login_resp.cookies)
    return login_resp.cookies

def test_post_evaluation_endpoint(client):
    """
    Requirement 11, 15, 18: POST /api/evaluations
    Matches docs/api-contract.md and frontend App.jsx contract.
    Enforces mandatory authentication: 401 when anonymous, 200 when authenticated.
    """
    payload = {
        "baseline_version": "v1.0",
        "candidate_version": "v1.1"
    }

    # 1. Anonymous request must be rejected with 401 Unauthorized
    anon_resp = client.post("/api/evaluations", json=payload)
    assert anon_resp.status_code == 401
    assert "authentication required" in anon_resp.json()["detail"].lower()

    # 2. Authenticated request proceeds
    cookies = get_authenticated_cookies(client, "alice.eval@agentshield.org")
    csrf_token = cookies.get("agentshield_csrf", "")
    response = client.post("/api/evaluations", json=payload, headers={"X-CSRF-Token": csrf_token})
    assert response.status_code == 200
    data = response.json()

    assert "run_id" in data
    assert data["baseline_version"] == "v1.0"
    assert data["candidate_version"] == "v1.1"
    assert data["total_tests"] == 32
    assert data["passed"] == 31
    assert data["failed"] == 1
    assert data["critical_regressions"] == 1
    assert data["high_regressions"] == 0
    assert data["release_decision"] == "BLOCK"
    assert len(data["results"]) == 32

    run_id = data["run_id"]

    # Requirement 16: GET /api/evaluations/{run_id}
    # Anonymous must fail with 401
    with TestClient(app) as unauth_client:
        assert unauth_client.get(f"/api/evaluations/{run_id}").status_code == 401
        assert unauth_client.get(f"/api/evaluations/{run_id}/traces").status_code == 401

    get_resp = client.get(f"/api/evaluations/{run_id}")
    assert get_resp.status_code == 200
    run_data = get_resp.json()
    assert run_data["run_id"] == run_id
    assert run_data["release_decision"] == "BLOCK"
    assert len(run_data["results"]) == 32

    # Requirement 17: GET /api/evaluations/{run_id}/traces
    traces_resp = client.get(f"/api/evaluations/{run_id}/traces")
    assert traces_resp.status_code == 200
    trace_data = traces_resp.json()
    assert trace_data["run_id"] == run_id
    assert len(trace_data["traces"]) == 32

    t002_trace = next(t for t in trace_data["traces"] if t["scenario_id"] == "T002")
    assert t002_trace["tool_status"] == "FAILED"
    assert t002_trace["agent_claim"] == "SUCCESS"
    assert t002_trace["severity"] == "CRITICAL"
    assert t002_trace["is_new_regression"] is True

def test_candidate_v1_2_api_release_allowed(client):
    """Candidate v1.2 returns ALLOW over HTTP API when authenticated."""
    payload = {
        "baseline_version": "v1.0",
        "candidate_version": "v1.2"
    }

    # Anonymous must fail with 401
    assert client.post("/api/evaluations", json=payload).status_code == 401

    cookies = get_authenticated_cookies(client, "bob.eval@agentshield.org")
    csrf_token = cookies.get("agentshield_csrf", "")
    response = client.post("/api/evaluations", json=payload, headers={"X-CSRF-Token": csrf_token})
    assert response.status_code == 200
    data = response.json()
    assert data["passed"] == 32
    assert data["failed"] == 0
    assert data["critical_regressions"] == 0
    assert data["high_regressions"] == 0
    assert data["release_decision"] == "ALLOW"

def test_candidate_v1_3_multi_regression_api_and_history_replay(client):
    """Candidate v1.3 detects 9 regressions (6 CRITICAL, 3 HIGH), preserves history & IDOR isolation."""
    cookies = get_authenticated_cookies(client, "carol.eval@agentshield.org")
    csrf_token = cookies.get("agentshield_csrf", "")
    resp = client.post(
        "/api/evaluations",
        json={"baseline_version": "v1.0", "candidate_version": "v1.3"},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_tests"] == 32
    assert data["passed"] == 23
    assert data["failed"] == 9
    assert data["critical_regressions"] == 6
    assert data["high_regressions"] == 3
    assert data["regression_scenarios"] == 9
    assert data["release_decision"] == "BLOCK"

    run_id = data["run_id"]
    hist_list = client.get("/api/evaluations").json()
    assert any(item["run_id"] == run_id and item["high_regressions"] == 3 for item in hist_list)

    reloaded = client.get(f"/api/evaluations/{run_id}").json()
    assert [r["scenario_id"] for r in reloaded["results"]] == [r["scenario_id"] for r in data["results"]]
    assert reloaded["high_regressions"] == 3
    assert reloaded["critical_regressions"] == 6
    assert reloaded["failed"] == 9
    t050_row = next(r for r in reloaded["results"] if r["scenario_id"] == "T050")
    assert t050_row["banking_api_response"]["verified_balance"] == 6200.0

    # Other user cannot inspect this run
    with TestClient(app) as other_client:
        get_authenticated_cookies(other_client, "intruder.eval@agentshield.org")
        assert other_client.get(f"/api/evaluations/{run_id}").status_code == 404
        assert other_client.get(f"/api/evaluations/{run_id}/traces").status_code == 404

def test_legacy_24_scenario_history_compatibility(client, db):
    """Older 24-scenario persisted records keep accurate totals while sorting scenario results naturally."""
    from backend.app.database.models import EvaluationRun, ScenarioResult, User

    cookies = get_authenticated_cookies(client, "legacy.eval@agentshield.org")
    assert cookies
    user = db.query(User).filter(User.email == "legacy.eval@agentshield.org").first()
    legacy_run = EvaluationRun(
        run_id="RUN-LEGACY24",
        user_id=user.id,
        baseline_version="v1.0",
        candidate_version="v1.1",
        total_tests=24,
        passed=23,
        critical_regressions=1,
        release_decision="BLOCK",
    )
    db.add(legacy_run)
    db.flush()
    for sid, ok, sev, viol in [
        ("T010", True, "NONE", None),
        ("T002", False, "CRITICAL", "PAYMENT_STATUS_MISMATCH"),
        ("T001", True, "NONE", None),
    ]:
        db.add(ScenarioResult(
            run_id="RUN-LEGACY24",
            scenario_id=sid,
            scenario_name=f"Scenario {sid}",
            tool_status="FAILED" if not ok else "SUCCESS",
            agent_claim="SUCCESS",
            agent_response="Simulated legacy response.",
            passed=ok,
            severity=sev,
            policy_violation=viol,
            is_new_regression=not ok,
            reason="Legacy test entry",
        ))
    db.commit()

    resp = client.get("/api/evaluations/RUN-LEGACY24")
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["total_tests"] == 24
    assert payload["passed"] == 23
    assert payload["failed"] == 1
    assert [r["scenario_id"] for r in payload["results"]] == ["T001", "T002", "T010"]

def test_scenarios_catalog_api(client):
    """GET /api/scenarios and GET /api/scenarios/{id}."""
    resp = client.get("/api/scenarios")
    assert resp.status_code == 200
    scenarios = resp.json()
    assert len(scenarios) == 32
    expected_ids = [f"T{i:03d}" for i in range(1, 25)] + [
        "T033", "T034", "T035", "T045", "T047", "T049", "T050", "T054"
    ]
    assert [s["scenario_id"] for s in scenarios] == expected_ids

    resp_single = client.get("/api/scenarios/T002")
    assert resp_single.status_code == 200
    assert resp_single.json()["scenario_id"] == "T002"
    assert resp_single.json()["tool_status"] == "FAILED"

def test_banking_api_endpoints(client):
    """Direct banking simulator API routes."""
    # Account details
    acc_resp = client.get("/api/banking/accounts/ACC1001")
    assert acc_resp.status_code == 200
    assert acc_resp.json()["balance"] == 50000.00

    # Payment execution
    payment_payload = {
        "account_id": "ACC1001",
        "beneficiary_id": "BEN1001",
        "amount": 2500.00
    }
    pay_resp = client.post("/api/banking/payments", json=payment_payload)
    assert pay_resp.status_code == 200
    assert pay_resp.json()["status"] == "SUCCESS"

    # Transaction retrieval
    txn_id = pay_resp.json()["transaction_id"]
    txn_resp = client.get(f"/api/transactions/{txn_id}")
    assert txn_resp.status_code == 200
    assert txn_resp.json()["transaction_id"] == txn_id
    assert txn_resp.json()["amount"] == 2500.00
