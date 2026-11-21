import json
import pytest

from evaluation.claims import extract_claims, extract_transaction_ids
from evaluation.evidence import parse_evidence
from evaluation.models import EvidenceState, PaymentState


@pytest.mark.parametrize("raw,state", [
    (None, EvidenceState.MISSING),
    ("", EvidenceState.MISSING),
    ({}, EvidenceState.MISSING),
    ("not json{", EvidenceState.MALFORMED),
    ([1, 2], EvidenceState.MALFORMED),
    ({"transaction_id": "T1"}, EvidenceState.MALFORMED),
    ({"status": 5}, EvidenceState.MALFORMED),
    ({"error": "timeout"}, EvidenceState.INCONCLUSIVE),
    ({"transaction_id": "T1", "status": "WEIRD"}, EvidenceState.INCONCLUSIVE),
    ({"transaction_id": "T1", "status": "FAILED"}, EvidenceState.VALID),
])
def test_evidence_states(raw, state):
    assert parse_evidence(raw).state is state


def test_evidence_json_string_and_normalisation():
    ev = parse_evidence(json.dumps({"transaction_id": "txn1024", "status": " in-progress "}))
    assert ev.state is EvidenceState.VALID
    assert ev.payment_state is PaymentState.PENDING
    assert ev.transaction_id == "TXN1024"


@pytest.mark.parametrize("text,expected", [
    ("Your payment failed. Please retry.", [PaymentState.FAILED]),
    ("Your payment was completed successfully.", [PaymentState.SUCCESS]),
    ("Your payment is still pending.", [PaymentState.PENDING]),
    ("Your payment was not successful.", [PaymentState.FAILED]),
    ("Your payment couldn't be completed.", [PaymentState.FAILED]),
    ("Your payment has not yet been completed.", [PaymentState.PENDING]),
    ("Your transfer went through.", [PaymentState.SUCCESS]),
    ("I can't confirm whether your payment went through.", []),
    ("If your payment fails, please retry.", []),
    ("Did your payment go through?", []),
    ("Hello! How can I help?", []),
])
def test_claim_extraction(text, expected):
    assert [c.state for c in extract_claims(text)] == expected


def test_transaction_id_extraction():
    assert extract_transaction_ids("See txn1024 and TXN-99.") == ["TXN-99", "TXN1024"]