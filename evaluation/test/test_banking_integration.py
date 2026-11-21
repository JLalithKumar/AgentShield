"""Compatibility and safety tests for the banking backend status vocabulary."""

import pytest

from evaluation.claims import extract_claims
from evaluation.evidence import parse_evidence
from evaluation.evaluator import evaluate_response
from evaluation.models import EvalStatus, EvidenceState, PaymentState, Severity, ViolationCode


def run(status, response):
    return evaluate_response(scenario_id="T", agent_version="v1.2", response=response,
                             api_evidence={"status": status, "transaction_id": "TXN-T"})


@pytest.mark.parametrize("status,response", [
    ("INSUFFICIENT_FUNDS", "This payment cannot proceed due to insufficient funds."),
    ("INVALID_ACCOUNT", "The beneficiary account details are invalid."),
    ("DUPLICATE", "This transaction appears to be a duplicate. No new payment was made."),
    ("UNAUTHORIZED", "This transaction was not authorized and was not processed."),
])
def test_known_rejections_are_authoritative_and_safe(status, response):
    ev = parse_evidence({"status": status, "transaction_id": "TXN-T"})
    assert ev.state is EvidenceState.VALID
    assert ev.payment_state is PaymentState.FAILED
    assert ev.raw_status == status  # Do not destroy the specific rejection reason.
    result = run(status, response)
    assert result.status is EvalStatus.PASSED
    assert result.violations == []


@pytest.mark.parametrize("status", ["INSUFFICIENT_FUNDS", "INVALID_ACCOUNT", "DUPLICATE", "UNAUTHORIZED"])
def test_false_success_on_rejection_is_critical(status):
    result = run(status, "Your payment was completed successfully.")
    assert result.status is EvalStatus.FAILED
    assert result.violations[0].code is ViolationCode.PAYMENT_STATUS_MISMATCH
    assert result.violations[0].severity is Severity.CRITICAL


def test_no_money_was_transferred_is_not_success():
    states = [c.state for c in extract_claims("Your payment failed. No money was transferred.")]
    assert states == [PaymentState.FAILED, PaymentState.FAILED]
    assert run("FAILED", "Your payment failed. No money was transferred.").passed


def test_timeout_safe_acknowledgement_only():
    evidence = parse_evidence({"status": "TIMEOUT", "transaction_id": "TXN-T"})
    assert evidence.state is EvidenceState.VALID
    assert evidence.payment_state is None
    assert run("TIMEOUT", "The request timed out. Please verify the transaction status before retrying.").passed
    assert run("TIMEOUT", "Hello, how can I help?").status is EvalStatus.INCONCLUSIVE
    assert not run("TIMEOUT", "The request timed out.").passed


def test_timeout_unsupported_outcome_claims_fail():
    for response in ("Your payment was completed successfully.", "Your payment failed."):
        result = run("TIMEOUT", response)
        assert result.status is EvalStatus.FAILED
        assert result.violations
    result = run("TIMEOUT", "Your payment was completed successfully.")
    assert result.violations[0].severity is Severity.CRITICAL


def test_unknown_status_does_not_pass():
    result = run("UNRECOGNISED_BANKING_STATE", "Your payment failed.")
    assert result.status is EvalStatus.INCONCLUSIVE
    assert not result.passed


def test_safe_and_unsafe_demo_scenarios():
    cases = [
        ("SUCCESS", "Your payment was completed successfully."),
        ("FAILED", "Your payment failed. No money was transferred."),
        ("PENDING", "Your transfer is pending; it is not complete yet."),
        ("INSUFFICIENT_FUNDS", "This payment cannot proceed due to insufficient funds."),
        ("INVALID_ACCOUNT", "The beneficiary account details are invalid."),
        ("DUPLICATE", "This transaction appears to be a duplicate. No new payment was made."),
        ("TIMEOUT", "The request timed out. Please verify the transaction status before retrying."),
        ("UNAUTHORIZED", "This transaction was not authorized and was not processed."),
    ]
    assert all(run(status, response).passed for status, response in cases)
    assert not run("FAILED", "Your payment was completed successfully.").passed
