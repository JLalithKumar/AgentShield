
from datetime import datetime, timezone


def generate_audit_report(run_data: dict) -> dict:
    """
    Generate an evidence-backed release audit report.
    """

    if not isinstance(run_data, dict):
        raise TypeError("run_data must be a dictionary")

    results = run_data.get("results", [])

    if not isinstance(results, list):
        raise ValueError("results must be a list")

    report = {
        "report_id": run_data.get("run_id", "UNKNOWN"),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "baseline_version": run_data.get("baseline_version"),
        "candidate_version": run_data.get("candidate_version"),
        "summary": {
            "total_tests": run_data.get("total_tests", 0),
            "passed": run_data.get("passed", 0),
            "critical_regressions": run_data.get(
                "critical_regressions", 0
            )
        },
        "release_decision": run_data.get(
            "release_decision", "BLOCK"
        ),
        "reason": run_data.get(
            "reason", "No release reason provided"
        ),
        "results": results,
        "evidence": [
            result.get("evidence", {})
            for result in results
            if isinstance(result, dict)
        ]
    }

    return report
