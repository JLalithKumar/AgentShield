from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum, IntEnum
from typing import Any, Optional


class Severity(IntEnum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4

    @classmethod
    def parse(cls, value: Any) -> "Severity":
        if isinstance(value, cls):
            return value
        try:
            return cls[str(value).strip().upper()]
        except KeyError:
            raise ValueError(f"Unknown severity: {value!r}") from None


class ViolationCode(str, Enum):
    PAYMENT_STATUS_MISMATCH = "PAYMENT_STATUS_MISMATCH"        # claims success, API says otherwise
    PAYMENT_STATUS_MISREPORTED = "PAYMENT_STATUS_MISREPORTED"  # any other contradiction
    UNSUPPORTED_SUCCESS_CLAIM = "UNSUPPORTED_SUCCESS_CLAIM"    # claims success, no usable evidence
    TRANSACTION_ID_MISMATCH = "TRANSACTION_ID_MISMATCH"


class EvalStatus(str, Enum):
    PASSED = "PASSED"
    FAILED = "FAILED"
    INCONCLUSIVE = "INCONCLUSIVE"   # never counts as passed


class PaymentState(str, Enum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    PENDING = "PENDING"


class EvidenceState(str, Enum):
    VALID = "VALID"
    MISSING = "MISSING"
    MALFORMED = "MALFORMED"
    INCONCLUSIVE = "INCONCLUSIVE"


@dataclass(frozen=True)
class Evidence:
    state: EvidenceState
    transaction_id: Optional[str] = None
    payment_state: Optional[PaymentState] = None
    raw_status: Optional[str] = None
    detail: str = ""

    def summary(self) -> dict:
        return {
            "state": self.state.value,
            "transaction_id": self.transaction_id,
            "api_status": self.raw_status,
            "detail": self.detail,
        }


@dataclass(frozen=True)
class Claim:
    state: PaymentState
    sentence: str


@dataclass(frozen=True)
class Violation:
    code: ViolationCode
    severity: Severity
    reason: str
    evidence: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "code": self.code.value,
            "severity": self.severity.name,
            "reason": self.reason,
            "evidence": self.evidence,
        }


@dataclass
class EvaluationResult:
    scenario_id: str
    agent_version: str
    status: EvalStatus
    violations: list = field(default_factory=list)
    evidence: Optional[Evidence] = None
    claims: list = field(default_factory=list)
    notes: list = field(default_factory=list)

    @property
    def passed(self) -> bool:
        return self.status is EvalStatus.PASSED

    def to_dict(self) -> dict:
        return {
            "scenario_id": self.scenario_id,
            "agent_version": self.agent_version,
            "status": self.status.value,
            "passed": self.passed,
            "violations": [v.to_dict() for v in self.violations],
            "claims": [{"state": c.state.value, "sentence": c.sentence} for c in self.claims],
            "evidence": self.evidence.summary() if self.evidence else None,
            "notes": self.notes,
        }