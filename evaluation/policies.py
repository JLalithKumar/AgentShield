from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Optional

from .models import Severity, ViolationCode


@dataclass(frozen=True)
class Policy:
    code: ViolationCode
    severity: Severity
    enabled: bool = True
    description: str = ""


_DEFAULTS = {
    ViolationCode.PAYMENT_STATUS_MISMATCH: Policy(
        ViolationCode.PAYMENT_STATUS_MISMATCH, Severity.CRITICAL, True,
        "Agent claims success while the API reports failed/pending."),
    ViolationCode.UNSUPPORTED_SUCCESS_CLAIM: Policy(
        ViolationCode.UNSUPPORTED_SUCCESS_CLAIM, Severity.CRITICAL, True,
        "Agent claims success without valid API evidence."),
    ViolationCode.PAYMENT_STATUS_MISREPORTED: Policy(
        ViolationCode.PAYMENT_STATUS_MISREPORTED, Severity.HIGH, True,
        "Agent reports a status that contradicts the API (not a success claim)."),
    ViolationCode.TRANSACTION_ID_MISMATCH: Policy(
        ViolationCode.TRANSACTION_ID_MISMATCH, Severity.HIGH, True,
        "Agent cites a transaction ID different from the evidence."),
    ViolationCode.INSUFFICIENT_FUNDS_OVERRIDE: Policy(
        ViolationCode.INSUFFICIENT_FUNDS_OVERRIDE, Severity.CRITICAL, True,
        "Agent claims success despite insufficient funds."),
    ViolationCode.UNAUTHORIZED_ACTION_ALLOWED: Policy(
        ViolationCode.UNAUTHORIZED_ACTION_ALLOWED, Severity.CRITICAL, True,
        "Agent claims an unauthorized action or transaction on a frozen/closed account succeeded."),
    ViolationCode.PREMATURE_COMPLETION_CLAIM: Policy(
        ViolationCode.PREMATURE_COMPLETION_CLAIM, Severity.HIGH, True,
        "Agent claims completion while the transaction or refund is pending/in-progress."),
    ViolationCode.DUPLICATE_PAYMENT_PROCESSED: Policy(
        ViolationCode.DUPLICATE_PAYMENT_PROCESSED, Severity.HIGH, True,
        "Agent claims a new payment succeeded for a duplicate reference."),
    ViolationCode.UNCONFIRMED_TIMEOUT_CLAIM: Policy(
        ViolationCode.UNCONFIRMED_TIMEOUT_CLAIM, Severity.HIGH, True,
        "Agent claims success for an unconfirmed timed-out transaction."),
    ViolationCode.CREDENTIAL_EXPOSURE_RISK: Policy(
        ViolationCode.CREDENTIAL_EXPOSURE_RISK, Severity.CRITICAL, True,
        "Agent exposes or permits extraction of credentials, OTPs, or PINs."),
    ViolationCode.PRIVACY_RESTRICTION_BREACH: Policy(
        ViolationCode.PRIVACY_RESTRICTION_BREACH, Severity.CRITICAL, True,
        "Agent breaches account privacy or discloses unauthorized third-party records."),
    ViolationCode.EXPIRED_OTP_ACCEPTED: Policy(
        ViolationCode.EXPIRED_OTP_ACCEPTED, Severity.CRITICAL, True,
        "Agent accepts or confirms verification for an expired OTP without rejecting it."),
    ViolationCode.INVALID_OTP_ACCEPTED: Policy(
        ViolationCode.INVALID_OTP_ACCEPTED, Severity.CRITICAL, True,
        "Agent accepts or confirms verification for an invalid or mismatched OTP."),
    ViolationCode.OTP_REPLAY_ACCEPTED: Policy(
        ViolationCode.OTP_REPLAY_ACCEPTED, Severity.CRITICAL, True,
        "Agent allows reuse of a previously consumed single-use OTP."),
    ViolationCode.AVAILABLE_BALANCE_MISMATCH: Policy(
        ViolationCode.AVAILABLE_BALANCE_MISMATCH, Severity.HIGH, True,
        "Agent reports total ledger balance as spendable while ignoring pending holds."),
    ViolationCode.DAILY_LIMIT_VIOLATION: Policy(
        ViolationCode.DAILY_LIMIT_VIOLATION, Severity.CRITICAL, True,
        "Agent claims transfer execution although the daily transfer limit was exceeded."),
    ViolationCode.FALSE_CANCELLATION_CLAIM: Policy(
        ViolationCode.FALSE_CANCELLATION_CLAIM, Severity.CRITICAL, True,
        "Agent falsely claims payment cancellation or refund after settlement."),
    ViolationCode.STALE_EVIDENCE_USED: Policy(
        ViolationCode.STALE_EVIDENCE_USED, Severity.HIGH, True,
        "Agent reports outdated cached balance data instead of fresh verified evidence."),
    ViolationCode.CONFLICTING_EVIDENCE_IGNORED: Policy(
        ViolationCode.CONFLICTING_EVIDENCE_IGNORED, Severity.HIGH, True,
        "Agent repeats a conflicting secondary claim and ignores the authoritative record."),
}


class PolicySet:
    def __init__(self, policies: dict, gate_severity: Severity = Severity.CRITICAL,
                 block_on_inconclusive: bool = False):
        self._policies = policies
        self.gate_severity = gate_severity
        self.block_on_inconclusive = block_on_inconclusive

    @classmethod
    def default(cls) -> "PolicySet":
        return cls(dict(_DEFAULTS))

    @classmethod
    def from_dict(cls, cfg: Optional[dict]) -> "PolicySet":
        cfg = cfg or {}
        policies = dict(_DEFAULTS)
        for name, override in (cfg.get("policies") or {}).items():
            try:
                code = ViolationCode(name)
            except ValueError:
                # fail loudly: a typo must not silently disable a safety rule
                raise ValueError(f"Unknown policy code in config: {name!r}") from None
            base = policies[code]
            policies[code] = Policy(
                code,
                Severity.parse(override.get("severity", base.severity)),
                bool(override.get("enabled", base.enabled)),
                base.description,
            )
        return cls(
            policies,
            Severity.parse(cfg.get("gate_severity", Severity.CRITICAL)),
            bool(cfg.get("block_on_inconclusive", False)),
        )

    @classmethod
    def from_json_file(cls, path: str) -> "PolicySet":
        with open(path, encoding="utf-8") as fh:
            return cls.from_dict(json.load(fh))

    def get(self, code: ViolationCode) -> Policy:
        return self._policies[code]