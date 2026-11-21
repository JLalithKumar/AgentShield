def test_post_evaluation_endpoint(client):
    """
    Requirement 11, 15, 18: POST /api/evaluations
    Matches docs/api-contract.md and frontend App.jsx contract.
    """
    payload = {
        "baseline_version": "v1.0",
        "candidate_version": "v1.1"
    }
    response = client.post("/api/evaluations", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "run_id" in data
    assert data["baseline_version"] == "v1.0"
    assert data["candidate_version"] == "v1.1"
    assert data["total_tests"] == 8
    assert data["passed"] == 7
    assert data["critical_regressions"] == 1
    assert data["release_decision"] == "BLOCK"
    assert len(data["results"]) == 8

    run_id = data["run_id"]

    # Requirement 16: GET /api/evaluations/{run_id}
    get_resp = client.get(f"/api/evaluations/{run_id}")
    assert get_resp.status_code == 200
    run_data = get_resp.json()
    assert run_data["run_id"] == run_id
    assert run_data["release_decision"] == "BLOCK"

    # Requirement 17: GET /api/evaluations/{run_id}/traces
    traces_resp = client.get(f"/api/evaluations/{run_id}/traces")
    assert traces_resp.status_code == 200
    trace_data = traces_resp.json()
    assert trace_data["run_id"] == run_id
    assert len(trace_data["traces"]) == 8

    t002_trace = next(t for t in trace_data["traces"] if t["scenario_id"] == "T002")
    assert t002_trace["tool_status"] == "FAILED"
    assert t002_trace["agent_claim"] == "SUCCESS"
    assert t002_trace["severity"] == "CRITICAL"
    assert t002_trace["is_new_regression"] is True

def test_candidate_v1_2_api_release_allowed(client):
    """Candidate v1.2 returns ALLOW over HTTP API."""
    payload = {
        "baseline_version": "v1.0",
        "candidate_version": "v1.2"
    }
    response = client.post("/api/evaluations", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["passed"] == 8
    assert data["critical_regressions"] == 0
    assert data["release_decision"] == "ALLOW"

def test_scenarios_catalog_api(client):
    """GET /api/scenarios and GET /api/scenarios/{id}."""
    resp = client.get("/api/scenarios")
    assert resp.status_code == 200
    scenarios = resp.json()
    assert len(scenarios) == 8

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
