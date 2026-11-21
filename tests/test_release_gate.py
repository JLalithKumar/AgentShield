
from release_gate.decision import decide_release


def test_critical_regression_blocks():

    evaluation = {
        "total_tests": 8,
        "passed": 7,
        "failed": 1,
        "critical_regressions": 1,
        "complete": True
    }

    result = decide_release(evaluation)

    assert result["release_decision"] == "BLOCK"


def test_all_tests_pass_allows_release():

    evaluation = {
        "total_tests": 8,
        "passed": 8,
        "failed": 0,
        "critical_regressions": 0,
        "complete": True
    }

    result = decide_release(evaluation)

    assert result["release_decision"] == "ALLOW"


def test_incomplete_evaluation_blocks():

    evaluation = {
        "total_tests": 8,
        "passed": 7,
        "failed": 1,
        "critical_regressions": 0,
        "complete": False
    }

    result = decide_release(evaluation)

    assert result["release_decision"] == "BLOCK"


def test_missing_field_blocks():

    evaluation = {
        "total_tests": 8,
        "passed": 8,
        "critical_regressions": 0
    }

    result = decide_release(evaluation)

    assert result["release_decision"] == "BLOCK"
