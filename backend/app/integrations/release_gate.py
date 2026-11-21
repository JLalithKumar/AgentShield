
"""
Release Gate Integration Adapter for Member 5

Strictly follows docs/module-interfaces.md:
- decide_release(evaluation_summary: dict) -> dict
- generate_audit_report(run_data: dict) -> dict

Connects the AgentShield backend to the independent
Release Gate policy engine developed by Member 5.
"""

import logging
from typing import Dict, Any

from release_gate.decision import decide_release as policy_decide_release


logger = logging.getLogger(__name__)



def decide_release(evaluation_summary: Dict[str, Any]) -> Dict[str, Any]:
    """
    Delegate release decisions to the independent Release Gate.

    Preserve the backend's existing reason-message contract
    for incomplete evaluations.
    """

    logger.info("Invoking independent AgentShield Release Gate")

    # Always use Yuvasri's actual policy engine.
    decision = policy_decide_release(evaluation_summary)

    # Compatibility with existing backend tests:
    # A missing 'complete' field means the evaluation
    # cannot be verified as complete.
    if (
        decision.get("release_decision") == "BLOCK"
        and decision.get("reason") == "Missing required field: complete"
    ):
        decision = {
            **decision,
            "reason": "Evaluation incomplete: missing required field: complete",
        }

    logger.info(
        "Release decision: %s | Reason: %s",
        decision.get("release_decision"),
        decision.get("reason"),
    )

    return decision


def generate_audit_report(run_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate an evidence-backed audit report.

    Preserve the existing audit-report fallback when
    an independent implementation is unavailable.
    """

    try:
        from release_gate import generate_audit_report as live_report
        return live_report(run_data)

    except (ImportError, AttributeError):
        pass

    return {
        "run_id": run_data.get("run_id"),
        "release_decision": run_data.get("release_decision"),
        "reason": run_data.get("reason"),
        "baseline_version": run_data.get("baseline_version"),
        "candidate_version": run_data.get("candidate_version"),
        "total_tests": run_data.get("total_tests"),
        "passed": run_data.get("passed"),
        "critical_regressions": run_data.get("critical_regressions"),
        "violations": [
            result
            for result in run_data.get("results", [])
            if not result.get("passed", True)
        ],
    }
