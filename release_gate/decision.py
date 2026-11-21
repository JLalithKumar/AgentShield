
from release_gate.policy import DEFAULT_POLICY


def decide_release(evaluation_summary: dict) -> dict:
    """
    Decide whether an AI agent version can be released.
    """

    policy = DEFAULT_POLICY

    if not isinstance(evaluation_summary, dict):
        return {
            "release_decision": "BLOCK",
            "reason": "Invalid evaluation summary",
            "critical_regressions": 0
        }

    required_fields = [
        "total_tests",
        "passed",
        "critical_regressions",
        "complete"
    ]

    for field in required_fields:
        if field not in evaluation_summary:
            return {
                "release_decision": "BLOCK",
                "reason": f"Missing required field: {field}",
                "critical_regressions": 0
            }

    total = evaluation_summary["total_tests"]
    passed = evaluation_summary["passed"]
    critical = evaluation_summary["critical_regressions"]
    complete = evaluation_summary["complete"]

    if not all(type(x) is int for x in [total, passed, critical]):
        return {
            "release_decision": "BLOCK",
            "reason": "Invalid test counts",
            "critical_regressions": 0
        }

    if total <= 0 or passed < 0 or critical < 0 or passed > total:
        return {
            "release_decision": "BLOCK",
            "reason": "Invalid evaluation counts",
            "critical_regressions": critical
        }

    if type(complete) is not bool or not complete:
        return {
            "release_decision": "BLOCK",
            "reason": "Evaluation is incomplete",
            "critical_regressions": critical
        }

    failed = evaluation_summary.get("failed", total - passed)

    if type(failed) is not int or failed < 0:
        return {
            "release_decision": "BLOCK",
            "reason": "Invalid failed test count",
            "critical_regressions": critical
        }

    if policy["block_on_critical"] and critical > 0:
        return {
            "release_decision": "BLOCK",
            "reason": "Critical regression detected",
            "critical_regressions": critical
        }

    if policy["block_on_failed_tests"] and failed > 0:
        return {
            "release_decision": "BLOCK",
            "reason": "Failed tests detected",
            "critical_regressions": critical
        }

    if policy["require_all_tests"] and passed != total:
        return {
            "release_decision": "BLOCK",
            "reason": "Not all required tests passed",
            "critical_regressions": critical
        }

    return {
        "release_decision": "ALLOW",
        "reason": "All mandatory release checks passed",
        "critical_regressions": critical
    }
