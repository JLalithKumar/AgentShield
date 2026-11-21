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