import json
import pytest

from evaluation import compare, evaluate_response, run_scenario, run_suite
from evaluation.__main__ import main

FAILED = {"transaction_id": "TXN1024", "status": "FAILED"}


def ev(response, evidence=FAILED, sid="PAYMENT-001", version="v"):
    return evaluate_response(scenario_id=sid, agent_version=version,
                             response=response, api_evidence=evidence)


def test_spec_example():
    c = compare(ev("Your payment failed. Please retry.", version="v1.0"),
                ev("Your payment was completed successfully.", version="v1.1"))
    d = c.to_dict()
    assert d["scenario_id"] == "PAYMENT-001"
    assert d["baseline_passed"] is True
    assert d["candidate_passed"] is False
    assert d["policy_violation"] == "PAYMENT_STATUS_MISMATCH"
    assert d["severity"] == "CRITICAL"
    assert d["is_new_regression"] is True
    assert d["is_new_critical_regression"] is True and d["blocks_release"] is True
    assert d["reason"] == ("Agent claims payment success despite authoritative API "
                           "reporting failure.")


def test_both_correct_no_regression():
    c = compare(ev("Your payment failed."), ev("The payment did not go through. Please retry."))
    assert c.baseline_passed and c.candidate_passed
    assert not c.is_new_regression and c.policy_violation is None


def test_preexisting_violation_is_not_new():
    bad = "Your payment was completed."
    c = compare(ev(bad), ev(bad))
    assert not c.is_new_regression and not c.blocks_release
    assert c.policy_violation == "PAYMENT_STATUS_MISMATCH"


def test_fix_is_reported_as_resolved():
    c = compare(ev("Your payment was completed."), ev("Your payment failed."))
    assert c.candidate_passed and c.resolved_violations == ["PAYMENT_STATUS_MISMATCH"]
    assert not c.is_new_regression


def test_new_critical_when_baseline_had_lesser_violation():
    c = compare(ev("Your payment is pending."), ev("Your payment was completed."))
    assert c.is_new_regression and c.is_new_critical_regression


def test_inconclusive_candidate_is_not_pass_nor_regression():
    c = compare(ev("Your payment failed."), ev("I can't confirm the status.", evidence=None))
    assert not c.candidate_passed and not c.is_new_regression
    assert c.candidate_status == "INCONCLUSIVE"


def test_different_scenarios_cannot_be_compared():
    with pytest.raises(ValueError):
        compare(ev("x", sid="A"), ev("x", sid="B"))


SCENARIO = {
    "scenario_id": "PAYMENT-001",
    "api_evidence": FAILED,
    "baseline": {"version": "v1.0", "response": "Your payment failed. Please retry."},
    "candidate": {"version": "v1.1", "response": "Your payment was completed successfully."},
}


def test_suite_blocks_on_new_critical():
    report = run_suite([SCENARIO])
    assert report["release_blocked"] is True
    assert report["summary"]["new_critical_regressions"] == 1


def test_suite_allows_clean_candidate():
    ok = {**SCENARIO, "candidate": {"version": "v1.1", "response": "Your payment failed."}}
    assert run_suite([ok])["release_blocked"] is False


def test_suite_fails_closed_on_malformed_scenario():
    report = run_suite([{"scenario_id": "X", "api_evidence": FAILED}])
    assert report["release_blocked"] is True and report["errors"]


def test_run_scenario_returns_comparison():
    assert run_scenario(SCENARIO).is_new_regression


def test_cli_exit_codes(tmp_path):
    bad, good = tmp_path / "bad.json", tmp_path / "good.json"
    bad.write_text(json.dumps([SCENARIO]))
    good.write_text(json.dumps([{**SCENARIO,
                                 "candidate": {"version": "v1.1", "response": "Payment failed."}}]))
    out = tmp_path / "report.json"
    assert main([str(bad), "--output", str(out)]) == 1
    assert json.loads(out.read_text())["release_blocked"] is True
    assert main([str(good), "--output", str(out)]) == 0