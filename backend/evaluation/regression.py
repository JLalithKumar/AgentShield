from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

from .models import EvalStatus, EvaluationResult, Severity, Violation


@dataclass
class ComparisonResult:
    scenario_id: str
    baseline_passed: bool
    candidate_passed: bool
    policy_violation: Optional[str]
    severity: Optional[str]
    is_new_regression: bool
    reason: str
    baseline_status: str = ""
    candidate_status: str = ""
    is_new_critical_regression: bool = False
    blocks_release: bool = False
    new_violations: List[Violation] = field(default_factory=list)
    resolved_violations: List[str] = field(default_factory=list)
    evidence: Optional[dict] = None

    def to_dict(self) -> dict:
        return {
            "scenario_id": self.scenario_id,
            "baseline_passed": self.baseline_passed,
            "candidate_passed": self.candidate_passed,
            "policy_violation": self.policy_violation,
            "severity": self.severity,
            "is_new_regression": self.is_new_regression,
            "reason": self.reason,
            "baseline_status": self.baseline_status,
            "candidate_status": self.candidate_status,
            "is_new_critical_regression": self.is_new_critical_regression,
            "blocks_release": self.blocks_release,
            "new_violations": [v.to_dict() for v in self.new_violations],
            "resolved_violations": self.resolved_violations,
            "evidence": self.evidence,
        }


def compare(baseline: EvaluationResult, candidate: EvaluationResult,
            gate_severity: Severity = Severity.CRITICAL) -> ComparisonResult:
    if baseline.scenario_id != candidate.scenario_id:
        raise ValueError("Cannot compare results from different scenarios "
                         f"({baseline.scenario_id!r} vs {candidate.scenario_id!r}).")

    base_codes = {v.code for v in baseline.violations}
    cand_codes = {v.code for v in candidate.violations}
    new = [v for v in candidate.violations if v.code not in base_codes]
    resolved = sorted(c.value for c in base_codes - cand_codes)

    focus = new or candidate.violations
    primary = max(focus, key=lambda v: v.severity) if focus else None

    if primary:
        reason = primary.reason
    elif candidate.status is EvalStatus.INCONCLUSIVE:
        reason = "Inconclusive: " + "; ".join(candidate.notes)
    else:
        reason = "No policy violations detected."

    return ComparisonResult(
        scenario_id=candidate.scenario_id,
        baseline_passed=baseline.passed,
        candidate_passed=candidate.passed,
        policy_violation=primary.code.value if primary else None,
        severity=primary.severity.name if primary else None,
        is_new_regression=bool(new),
        reason=reason,
        baseline_status=baseline.status.value,
        candidate_status=candidate.status.value,
        is_new_critical_regression=any(v.severity >= Severity.CRITICAL for v in new),
        blocks_release=any(v.severity >= gate_severity for v in new),
        new_violations=new,
        resolved_violations=resolved,
        evidence=candidate.evidence.summary() if candidate.evidence else None,
    )