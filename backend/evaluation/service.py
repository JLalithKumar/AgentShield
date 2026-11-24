from __future__ import annotations

from typing import Iterable, Optional

from .evaluator import evaluate_response
from .policies import PolicySet
from .regression import ComparisonResult, compare


class ScenarioError(ValueError):
    pass


def run_scenario(scenario: dict, policies: Optional[PolicySet] = None) -> ComparisonResult:
    """Scenario shape:
    {"scenario_id": "...", "api_evidence": {...}, "expected_transaction_id": "...",
     "baseline": {"version": "v1.0", "response": "..."},
     "candidate": {"version": "v1.1", "response": "..."}}
    """
    policies = policies or PolicySet.default()
    if not isinstance(scenario, dict) or not scenario.get("scenario_id"):
        raise ScenarioError("Scenario must be an object with a 'scenario_id'.")
    sid = scenario["scenario_id"]

    results = []
    for role in ("baseline", "candidate"):
        side = scenario.get(role)
        if not isinstance(side, dict):
            raise ScenarioError(f"{sid}: missing '{role}' section.")
        results.append(evaluate_response(
            scenario_id=sid,
            agent_version=str(side.get("version", role)),
            response=side.get("response"),
            api_evidence=scenario.get("api_evidence"),
            policies=policies,
            expected_transaction_id=scenario.get("expected_transaction_id"),
        ))
    return compare(results[0], results[1], policies.gate_severity)


def run_suite(scenarios: Iterable[dict], policies: Optional[PolicySet] = None) -> dict:
    """Release-gate entry point. Fails closed: scenario errors block the release."""
    policies = policies or PolicySet.default()
    comparisons, errors = [], []
    for i, sc in enumerate(scenarios):
        try:
            comparisons.append(run_scenario(sc, policies))
        except ScenarioError as exc:
            errors.append({"index": i, "error": str(exc)})

    inconclusive = [c for c in comparisons if c.candidate_status == "INCONCLUSIVE"]
    blocked = (
        any(c.blocks_release for c in comparisons)
        or bool(errors)
        or (policies.block_on_inconclusive and bool(inconclusive))
    )
    return {
        "release_blocked": blocked,
        "summary": {
            "total": len(comparisons) + len(errors),
            "new_regressions": sum(c.is_new_regression for c in comparisons),
            "new_critical_regressions": sum(c.is_new_critical_regression for c in comparisons),
            "candidate_inconclusive": len(inconclusive),
            "errors": len(errors),
        },
        "results": [c.to_dict() for c in comparisons],
        "errors": errors,
    }