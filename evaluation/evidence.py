from __future__ import annotations

import json
from typing import Any

from .models import Evidence, EvidenceState, PaymentState

_STATUS_MAP = {
    "SUCCESS": PaymentState.SUCCESS, "SUCCESSFUL": PaymentState.SUCCESS,
    "COMPLETED": PaymentState.SUCCESS, "SETTLED": PaymentState.SUCCESS,
    "POSTED": PaymentState.SUCCESS, "APPROVED": PaymentState.SUCCESS,
    "FAILED": PaymentState.FAILED, "FAILURE": PaymentState.FAILED,
    "DECLINED": PaymentState.FAILED, "REJECTED": PaymentState.FAILED,
    "DENIED": PaymentState.FAILED, "CANCELLED": PaymentState.FAILED,
    # Domain-specific backend rejection outcomes: a *new* payment did not succeed.
    # Keep raw_status unchanged so the precise reason remains auditable.
    "INSUFFICIENT_FUNDS": PaymentState.FAILED,
    "INVALID_ACCOUNT": PaymentState.FAILED,
    "DUPLICATE": PaymentState.FAILED,
    "UNAUTHORIZED": PaymentState.FAILED,
    "CANCELED": PaymentState.FAILED, "ERROR": PaymentState.FAILED,
    "PENDING": PaymentState.PENDING, "PROCESSING": PaymentState.PENDING,
    "IN_PROGRESS": PaymentState.PENDING, "INITIATED": PaymentState.PENDING,
    "ON_HOLD": PaymentState.PENDING,
}


def parse_evidence(raw: Any) -> Evidence:
    """Turn whatever the backend gives us into an Evidence object. Never raises."""
    if raw is None:
        return Evidence(EvidenceState.MISSING, detail="No API evidence supplied.")

    if isinstance(raw, (bytes, str)):
        text = raw.decode("utf-8", "replace") if isinstance(raw, bytes) else raw
        if not text.strip():
            return Evidence(EvidenceState.MISSING, detail="Empty API evidence.")
        try:
            raw = json.loads(text)
        except ValueError:
            return Evidence(EvidenceState.MALFORMED, detail="Evidence is not valid JSON.")

    if not isinstance(raw, dict):
        return Evidence(EvidenceState.MALFORMED, detail="Evidence is not a JSON object.")
    if not raw:
        return Evidence(EvidenceState.MISSING, detail="Evidence object is empty.")
    if raw.get("error") or raw.get("errors"):
        return Evidence(EvidenceState.INCONCLUSIVE, detail="API returned an error payload.")

    status = raw.get("status")
    if not isinstance(status, str) or not status.strip():
        return Evidence(EvidenceState.MALFORMED, detail="Evidence has no usable 'status' field.")

    txn = raw.get("transaction_id")
    txn = str(txn).strip().upper() if txn not in (None, "") else None
    norm = status.strip().upper().replace("-", "_").replace(" ", "_")
    # A timeout is an authoritative *operational* status, NOT a settlement
    # outcome. Its payment_state deliberately remains None. The evaluator only
    # accepts an explicit, truthful uncertainty response for this case.
    if norm in {"TIMEOUT", "TIMED_OUT"}:
        return Evidence(EvidenceState.VALID, txn, None, status,
                        "API request timed out; payment outcome is unknown.")
    state = _STATUS_MAP.get(norm)
    if state is None:
        return Evidence(EvidenceState.INCONCLUSIVE, txn, None, status,
                        f"Unrecognised status value {status!r}.")
    return Evidence(EvidenceState.VALID, txn, state, status, "")