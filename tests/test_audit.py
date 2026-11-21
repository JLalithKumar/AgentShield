
from release_gate.audit import generate_audit_report


def test_audit_report_generation():

    run_data = {
        "run_id": "RUN-001",
        "baseline_version": "v1.0",
        "candidate_version": "v1.1",
        "total_tests": 8,
        "passed": 7,
        "critical_regressions": 1,
        "release_decision": "BLOCK",
        "reason": "Critical regression detected",
        "results": [
            {
                "scenario_id": "T002",
                "evidence": {
                    "tool_status": "FAILED",
                    "agent_claim": "SUCCESS"
                }
            }
        ]
    }

    report = generate_audit_report(run_data)

    assert report["report_id"] == "RUN-001"
    assert report["release_decision"] == "BLOCK"
    assert report["summary"]["total_tests"] == 8
    assert len(report["evidence"]) == 1
    assert report["evidence"][0]["tool_status"] == "FAILED"


def test_invalid_input():

    try:
        generate_audit_report("invalid")
        assert False, "Expected TypeError"
    except TypeError:
        assert True


def test_invalid_results():

    run_data = {
        "results": "invalid"
    }

    try:
        generate_audit_report(run_data)
        assert False, "Expected ValueError"
    except ValueError:
        assert True
