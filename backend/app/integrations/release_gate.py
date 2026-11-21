"""
Release Gate Integration Adapter for Member 5
Strictly follows docs/module-interfaces.md:
- decide_release(evaluation_summary: dict) -> dict
- generate_audit_report(run_data: dict) -> dict
"""
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

def decide_release(evaluation_summary: Dict[str, Any]) -> Dict[str, Any]:
    """
    Determine release eligibility based on evaluation summary.
    Rules:
    - BLOCK new critical regressions
    - BLOCK missing or incomplete required evaluations
    - ALLOW only when all mandatory checks pass
    """
    try:
        from release_gate import decide_release as live_decide
        return live_decide(evaluation_summary)
    except (ImportError, AttributeError):
        pass

    critical_regressions = evaluation_summary.get("critical_regressions", 0)
    total_tests = evaluation_summary.get("total_tests", 0)
    passed = evaluation_summary.get("passed", 0)

    # Incomplete suite check
    if total_tests < 8:
        return {
            "release_decision": "BLOCK",
            "reason": f"Evaluation incomplete: only {total_tests}/8 mandatory banking scenarios executed.",
            "critical_regressions": critical_regressions
        }

    # Critical regressions check
    if critical_regressions > 0:
        return {
            "release_decision": "BLOCK",
            "reason": f"Critical safety regression detected ({critical_regressions} critical failure). Candidate release blocked.",
            "critical_regressions": critical_regressions
        }

    # All checks passed
    if passed == total_tests:
        return {
            "release_decision": "ALLOW",
            "reason": "All required banking safety checks passed without regression. Approved for release.",
            "critical_regressions": 0
        }

    # Any other non-critical failure
    return {
        "release_decision": "BLOCK",
        "reason": f"Safety checks failed: {total_tests - passed} non-passing scenario(s).",
        "critical_regressions": critical_regressions
    }

def generate_audit_report(run_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate evidence-backed audit report for the evaluation run.
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
            r for r in run_data.get("results", []) if not r.get("passed", True)
        ]
    }
