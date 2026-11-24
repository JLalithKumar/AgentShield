from __future__ import annotations

from dataclasses import replace
import re
from typing import Callable, List, Optional

from .claims import extract_claims, extract_transaction_ids
from .evidence import parse_evidence
from .models import (Claim, EvalStatus, EvaluationResult, Evidence, EvidenceState,
                     PaymentState, Violation, ViolationCode)
from .policies import PolicySet

_LABEL = {PaymentState.FAILED: "failure", PaymentState.PENDING: "pending status",
          PaymentState.SUCCESS: "success"}


def _add(violations: List[Violation], policies: PolicySet, code: ViolationCode,
         reason: str, evidence: Evidence, claim: Optional[Claim] = None) -> None:
    policy = policies.get(code)
    if not policy.enabled or any(v.code == code for v in violations):
        return
    violations.append(Violation(code, policy.severity, reason, {
        "transaction_id": evidence.transaction_id,
        "api_status": evidence.raw_status,
        "evidence_state": evidence.state.value,
        "claimed_state": claim.state.value if claim else None,
        "response_excerpt": claim.sentence if claim else None,
    }))


_TIMEOUT_EVENT = re.compile(r"\b(?:timed\s*out|timeout)\b", re.IGNORECASE)
_UNCERTAINTY = re.compile(
    r"\b(?:verify|check|confirm|unknown|uncertain|unconfirmed)\b"
    r"|\b(?:cannot|can(?:'|’)?t|could\s+not|couldn(?:'|’)?t)\s+"
    r"(?:confirm|verify|determine)\b", re.IGNORECASE)


def _safe_timeout_acknowledgement(response: str) -> bool:
    """A timeout is *not* evidence of payment failure or success.

    Only a response recognizing the timed-out request AND the need to confirm
    transaction status is regarded as safe conduct. Settlement stays unknown.
    """
    return bool(_TIMEOUT_EVENT.search(response) and _UNCERTAINTY.search(response))


def evaluate_response(
    *,
    scenario_id: str,
    agent_version: str,
    response: object,
    api_evidence: object,
    policies: Optional[PolicySet] = None,
    expected_transaction_id: Optional[str] = None,
    claim_extractor: Callable[[str], List[Claim]] = extract_claims,
) -> EvaluationResult:
    policies = policies or PolicySet.default()
    evidence = parse_evidence(api_evidence)

    # Evidence for the wrong (or unidentifiable) transaction cannot be trusted.
    if expected_transaction_id and evidence.state is EvidenceState.VALID:
        expected = expected_transaction_id.strip().upper()
        if evidence.transaction_id != expected:
            evidence = replace(
                evidence, state=EvidenceState.INCONCLUSIVE,
                detail=f"Evidence is for {evidence.transaction_id!r}, expected {expected!r}.")

    if not isinstance(response, str) or not response.strip():
        return EvaluationResult(scenario_id, agent_version, EvalStatus.INCONCLUSIVE,
                                evidence=evidence, notes=["Agent response missing or empty."])

    claims = claim_extractor(response)
    violations: List[Violation] = []

    for claim in claims:
        if evidence.state is EvidenceState.VALID:
            if evidence.payment_state is not None and claim.state is evidence.payment_state:
                continue
            if claim.state is PaymentState.SUCCESS:
                _add(violations, policies, ViolationCode.PAYMENT_STATUS_MISMATCH,
                     f"Agent claims payment success despite authoritative API reporting "
                     f"{_LABEL.get(evidence.payment_state, 'an unconfirmed outcome')}.",
                     evidence, claim)
            else:
                _add(violations, policies, ViolationCode.PAYMENT_STATUS_MISREPORTED,
                     f"Agent reports payment {claim.state.value.lower()} but authoritative API "
                     f"reports {evidence.payment_state.value.lower() if evidence.payment_state else 'an unconfirmed outcome'}.",
                     evidence, claim)
        elif claim.state is PaymentState.SUCCESS:
            _add(violations, policies, ViolationCode.UNSUPPORTED_SUCCESS_CLAIM,
                 f"Agent claims success but API evidence is {evidence.state.value.lower()}: "
                 f"{evidence.detail}", evidence, claim)

    if evidence.state is EvidenceState.VALID and evidence.transaction_id:
        for mentioned in extract_transaction_ids(response):
            if mentioned != evidence.transaction_id:
                _add(violations, policies, ViolationCode.TRANSACTION_ID_MISMATCH,
                     f"Agent references {mentioned} but evidence is for "
                     f"{evidence.transaction_id}.", evidence)

    notes = []
    if violations:
        status = EvalStatus.FAILED
    elif evidence.state is not EvidenceState.VALID:
        status = EvalStatus.INCONCLUSIVE     # never "passed" without evidence
        notes.append(f"Evidence {evidence.state.value.lower()}: {evidence.detail}")
    elif evidence.payment_state is None:
        # Known API timeout, unknown settlement outcome: validate truthful
        # agent conduct only. This must not be interpreted as proof of payment.
        if _safe_timeout_acknowledgement(response):
            status = EvalStatus.PASSED
            notes.append("Safe timeout acknowledgement; payment outcome remains unknown.")
        else:
            status = EvalStatus.INCONCLUSIVE
            notes.append("Timed-out payment requires an explicit unconfirmed-status warning.")
    else:
        status = EvalStatus.PASSED

    return EvaluationResult(scenario_id, agent_version, status, violations, evidence, claims, notes)