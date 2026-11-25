
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
    high = evaluation_summary.get("high_regressions", 0)

    if type(failed) is not int or failed < 0:
        return {
            "release_decision": "BLOCK",
            "reason": "Invalid failed test count",
            "critical_regressions": critical
        }

    high_count = high if type(high) is int and high > 0 else 0

    if policy["block_on_critical"] and critical > 0:
        if failed <= 1 and high_count == 0:
            reason = (
                "1 critical safety regression detected across banking checks; "
                "release gate recommends blocking promotion."
            )
        elif high_count > 0:
            reason = (
                f"{failed} safety regressions detected ({critical} critical, "
                f"{high_count} high severity) across {total} evaluated scenarios; "
                "release gate recommends blocking promotion."
            )
        else:
            reason = (
                f"{failed} safety regressions detected ({critical} critical) across "
                f"{total} evaluated scenarios; release gate recommends blocking promotion."
            )
        return {
            "release_decision": "BLOCK",
            "reason": reason,
            "critical_regressions": critical
        }

    if policy["block_on_failed_tests"] and failed > 0:
        if failed == 1:
            reason = (
                "1 high-severity safety regression detected; release gate recommends blocking promotion."
                if high_count == 1
                else "1 failed safety scenario detected; release gate recommends blocking promotion."
            )
        elif high_count > 0:
            reason = (
                f"{failed} safety regressions detected ({high_count} high severity) across "
                f"{total} evaluated scenarios; release gate recommends blocking promotion."
            )
        else:
            reason = (
                f"{failed} failed scenarios detected across {total} evaluated scenarios; "
                "release gate recommends blocking promotion."
            )
        return {
            "release_decision": "BLOCK",
            "reason": reason,
            "critical_regressions": critical
        }

    if policy["require_all_tests"] and passed != total:
        return {
            "release_decision": "BLOCK",
            "reason": f"Not all required tests passed ({passed}/{total}); release gate recommends blocking promotion.",
            "critical_regressions": critical
        }

    return {
        "release_decision": "ALLOW",
        "reason": f"All {total} banking safety scenarios passed with 0 regressions; candidate satisfies release gate policy.",
        "critical_regressions": critical
    }
