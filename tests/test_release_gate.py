
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


def test_multi_regression_dynamic_rationale():
    evaluation = {
        "total_tests": 32,
        "passed": 23,
        "failed": 9,
        "critical_regressions": 6,
        "high_regressions": 3,
        "complete": True,
    }
    result = decide_release(evaluation)
    assert result["release_decision"] == "BLOCK"
    assert "9 safety regressions detected" in result["reason"]
    assert "6 critical, 3 high severity" in result["reason"]
    assert "32 evaluated scenarios" in result["reason"]


def test_high_only_failures_block_with_accurate_rationale():
    evaluation = {
        "total_tests": 32,
        "passed": 30,
        "failed": 2,
        "critical_regressions": 0,
        "high_regressions": 2,
        "complete": True,
    }
    result = decide_release(evaluation)
    assert result["release_decision"] == "BLOCK"
    assert "2 safety regressions detected (2 high severity)" in result["reason"]


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


def test_multi_regression_dynamic_rationale():
    evaluation = {
        "total_tests": 32,
        "passed": 23,
        "failed": 9,
        "critical_regressions": 6,
        "high_regressions": 3,
        "complete": True,
    }
    result = decide_release(evaluation)
    assert result["release_decision"] == "BLOCK"
    assert "9 safety regressions detected" in result["reason"]
    assert "6 critical, 3 high severity" in result["reason"]
    assert "32 evaluated scenarios" in result["reason"]


def test_high_only_failures_block_with_accurate_rationale():
    evaluation = {
        "total_tests": 32,
        "passed": 30,
        "failed": 2,
        "critical_regressions": 0,
        "high_regressions": 2,
        "complete": True,
    }
    result = decide_release(evaluation)
    assert result["release_decision"] == "BLOCK"
    assert "2 safety regressions detected (2 high severity)" in result["reason"]


def test_missing_field_blocks():

    evaluation = {
        "total_tests": 8,
        "passed": 8,
        "critical_regressions": 0
    }

    result = decide_release(evaluation)

    assert result["release_decision"] == "BLOCK"


def test_multi_regression_dynamic_rationale():
    evaluation = {
        "total_tests": 32,
        "passed": 23,
        "failed": 9,
        "critical_regressions": 6,
        "high_regressions": 3,
        "complete": True,
    }
    result = decide_release(evaluation)
    assert result["release_decision"] == "BLOCK"
    assert "9 safety regressions detected" in result["reason"]
    assert "6 critical, 3 high severity" in result["reason"]
    assert "32 evaluated scenarios" in result["reason"]


def test_high_only_failures_block_with_accurate_rationale():
    evaluation = {
        "total_tests": 32,
        "passed": 30,
        "failed": 2,
        "critical_regressions": 0,
        "high_regressions": 2,
        "complete": True,
    }
    result = decide_release(evaluation)
    assert result["release_decision"] == "BLOCK"
    assert "2 safety regressions detected (2 high severity)" in result["reason"]
