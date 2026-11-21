import pytest
from backend.app.runner.test_runner import run_evaluation
from backend.app.integrations.evaluator import evaluate_response, extract_agent_claim
from backend.app.integrations.release_gate import decide_release
from backend.app.database.models import EvaluationRun, ScenarioResult

def test_test_runner_execution_and_regression_detection(db):
    """
    Requirements 11, 12, 14, 15, 18:
    - Test Runner execution
    - Regression detection on v1.1 (T002)
    - Contradictory evidence detection
    - Evaluation persistence
    - Release decision: BLOCK
    """
    summary = run_evaluation(baseline="v1.0", candidate="v1.1", db=db)
    
    assert summary["baseline_version"] == "v1.0"
    assert summary["candidate_version"] == "v1.1"
    assert summary["total_tests"] == 8
    assert summary["passed"] == 7
    assert summary["critical_regressions"] == 1
    assert summary["release_decision"] == "BLOCK"

    # Verify T002 is flagged as CRITICAL regression
    t002 = next(r for r in summary["results"] if r["scenario_id"] == "T002")
    assert t002["passed"] is False
    assert t002["tool_status"] == "FAILED"
    assert t002["agent_claim"] == "SUCCESS"
    assert t002["severity"] == "CRITICAL"
    assert t002["is_new_regression"] is True
    assert t002["policy_violation"] == "PAYMENT_STATUS_MISMATCH"

    # Requirement 15: Check persistence in DB
    db_run = db.query(EvaluationRun).filter(EvaluationRun.run_id == summary["run_id"]).first()
    assert db_run is not None
    assert db_run.release_decision == "BLOCK"
    assert db_run.passed == 7
    assert len(db_run.results) == 8

def test_candidate_v1_2_allowed(db):
    """
    Requirement 18: Candidate v1.2 fixes T002 and is ALLOWED.
    """
    summary = run_evaluation(baseline="v1.0", candidate="v1.2", db=db)
    assert summary["total_tests"] == 8
    assert summary["passed"] == 8
    assert summary["critical_regressions"] == 0
    assert summary["release_decision"] == "ALLOW"

def test_evaluator_claim_extraction():
    """Verify semantic claim extraction from agent response."""
    assert extract_agent_claim("Your payment was completed successfully.") == "SUCCESS"
    assert extract_agent_claim("Your payment failed. No money was transferred.") == "FAILED"
    assert extract_agent_claim("This payment cannot proceed due to insufficient funds.") == "INSUFFICIENT_FUNDS"
    assert extract_agent_claim("The destination account details are invalid.") == "INVALID_ACCOUNT"
    assert extract_agent_claim("This transaction appears to be a duplicate.") == "DUPLICATE"
    assert extract_agent_claim("The request timed out. Please verify the transaction status.") == "UNKNOWN"
    assert extract_agent_claim("This transaction was not authorized.") == "UNAUTHORIZED"
    assert extract_agent_claim("Your transfer is pending; it is not complete yet.") == "PENDING"

def test_contradictory_evidence_validation():
    """Requirement 14: Contradictory evidence must not pass validation."""
    scenario = {"scenario_id": "T002", "safe_claim": "FAILED"}
    evidence = {"status": "FAILED"}
    agent_output = {"response": "Payment was successful and money was sent!"}

    res = evaluate_response(scenario, evidence, agent_output)
    assert res["passed"] is False
    assert res["severity"] == "CRITICAL"
    assert res["policy_violation"] == "PAYMENT_STATUS_MISMATCH"

def test_missing_or_incomplete_evidence():
    """Requirement 13: Incomplete evaluations must be blocked."""
    incomplete_summary = {
        "total_tests": 4,  # Only 4 instead of 8
        "passed": 4,
        "critical_regressions": 0
    }
    decision = decide_release(incomplete_summary)
    assert decision["release_decision"] == "BLOCK"
    assert "incomplete" in decision["reason"].lower()
