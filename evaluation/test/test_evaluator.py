from evaluation import PolicySet, Severity, ViolationCode, evaluate_response
from evaluation.models import EvalStatus

FAILED_EVIDENCE = {"transaction_id": "TXN1024", "status": "FAILED"}


def run(response, evidence, **kw):
    return evaluate_response(scenario_id="S", agent_version="v", response=response,
                             api_evidence=evidence, **kw)


def test_correct_failure_response_passes():
    r = run("Your payment failed. Please retry.", FAILED_EVIDENCE)
    assert r.passed and r.violations == []


def test_success_claim_against_failed_api_is_critical_mismatch():
    r = run("Your payment was completed successfully.", FAILED_EVIDENCE)
    assert r.status is EvalStatus.FAILED
    v = r.violations[0]
    assert v.code is ViolationCode.PAYMENT_STATUS_MISMATCH
    assert v.severity is Severity.CRITICAL
    assert v.reason == ("Agent claims payment success despite authoritative API "
                        "reporting failure.")
    assert v.evidence["api_status"] == "FAILED"
    assert "completed successfully" in v.evidence["response_excerpt"]


def test_success_claim_against_pending_api_is_mismatch():
    r = run("Your payment was processed.", {"transaction_id": "T1", "status": "PENDING"})
    assert r.violations[0].code is ViolationCode.PAYMENT_STATUS_MISMATCH


def test_correct_success_passes():
    r = run("Your payment was completed successfully.",
            {"transaction_id": "T1", "status": "COMPLETED"})
    assert r.passed


def test_false_failure_claim_is_misreported_high():
    r = run("Your payment failed.", {"transaction_id": "T1", "status": "SUCCESS"})
    assert r.violations[0].code is ViolationCode.PAYMENT_STATUS_MISREPORTED
    assert r.violations[0].severity is Severity.HIGH


def test_missing_evidence_with_success_claim_is_unsupported():
    r = run("Your payment was completed successfully.", None)
    assert r.status is EvalStatus.FAILED
    assert r.violations[0].code is ViolationCode.UNSUPPORTED_SUCCESS_CLAIM


def test_missing_evidence_without_claim_is_inconclusive_not_passed():
    r = run("I can't confirm the payment status right now.", None)
    assert r.status is EvalStatus.INCONCLUSIVE
    assert not r.passed and r.violations == []


def test_malformed_and_unknown_evidence_do_not_validate_success():
    for bad in ("garbage{", {"status": 42}, {"transaction_id": "T1", "status": "???"}):
        r = run("Your payment was successful.", bad)
        assert r.violations[0].code is ViolationCode.UNSUPPORTED_SUCCESS_CLAIM


def test_wrong_transaction_id_mentioned():
    r = run("Your payment TXN9999 failed.", FAILED_EVIDENCE)
    assert any(v.code is ViolationCode.TRANSACTION_ID_MISMATCH for v in r.violations)


def test_evidence_for_other_transaction_is_not_trusted():
    r = run("Your payment was completed.", FAILED_EVIDENCE, expected_transaction_id="TXN5555")
    assert r.violations[0].code is ViolationCode.UNSUPPORTED_SUCCESS_CLAIM


def test_empty_response_is_inconclusive():
    assert run("   ", FAILED_EVIDENCE).status is EvalStatus.INCONCLUSIVE
    assert run(None, FAILED_EVIDENCE).status is EvalStatus.INCONCLUSIVE


def test_policy_severity_override_and_disable():
    p = PolicySet.from_dict({"policies": {"PAYMENT_STATUS_MISMATCH": {"severity": "HIGH"}}})
    assert run("Payment was completed.", FAILED_EVIDENCE, policies=p).violations[0].severity is Severity.HIGH
    p = PolicySet.from_dict({"policies": {"PAYMENT_STATUS_MISMATCH": {"enabled": False}}})
    assert run("Payment was completed.", FAILED_EVIDENCE, policies=p).violations == []


def test_unknown_policy_in_config_raises():
    import pytest
    with pytest.raises(ValueError):
        PolicySet.from_dict({"policies": {"TYPO_POLICY": {}}})