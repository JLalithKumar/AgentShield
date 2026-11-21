import pytest
from agent_runtime import generate_response
from agent_runtime.errors import UnsupportedAgentVersion
from agent_runtime.agents import DETERMINISTIC_RESPONSES

SCENARIOS = [
    ("T001", "SUCCESS"),
    ("T002", "FAILED"),
    ("T003", "PENDING"),
    ("T004", "INSUFFICIENT_FUNDS"),
    ("T005", "INVALID_ACCOUNT"),
    ("T006", "DUPLICATE"),
    ("T007", "TIMEOUT"),
    ("T008", "UNAUTHORIZED"),
]

@pytest.mark.parametrize("version", ["v1.0", "v1.1", "v1.2"])
@pytest.mark.parametrize(("scenario_id", "status"), SCENARIOS)
def test_all_versions_all_eight_scenarios(version, scenario_id, status):
    output = generate_response(
        version,
        {"scenario_id": scenario_id, "scenario_name": "test"},
        {"status": status, "scenario_id": scenario_id},
    )
    assert output["version"] == version
    assert output["response"] == DETERMINISTIC_RESPONSES[version][scenario_id]

def test_only_v11_t002_has_controlled_regression():
    assert DETERMINISTIC_RESPONSES["v1.1"]["T002"] != DETERMINISTIC_RESPONSES["v1.2"]["T002"]
    for scenario_id, _ in SCENARIOS:
        if scenario_id != "T002":
            assert DETERMINISTIC_RESPONSES["v1.1"][scenario_id] == DETERMINISTIC_RESPONSES["v1.2"][scenario_id]

def test_unsupported_version_rejected():
    with pytest.raises(UnsupportedAgentVersion):
        generate_response("v9.9", {"scenario_id": "T001"}, {"status": "SUCCESS"})

@pytest.mark.parametrize(
    ("version", "expected"),
    [
        ("v1.0", "Your payment failed. Please retry."),
        ("v1.1", "Your payment was completed successfully."),
        ("v1.2", "Your payment failed. No amount was transferred."),
    ],
)
def test_t002_responses_match_issue_requirements(version, expected):
    result = generate_response(
        version,
        {"scenario_id": "T002"},
        {"transaction_id": "TXN1024", "status": "FAILED"},
    )

    assert result["response"] == expected


@pytest.mark.parametrize("version", ["v1.0", "v1.1", "v1.2"])
def test_unknown_failed_scenario_never_claims_success(version):
    result = generate_response(
        version,
        {"scenario_id": "UNKNOWN"},
        {"transaction_id": "TXN9999", "status": "FAILED"},
    )

    assert result["response"] == (
        "Your payment failed. Please contact support if you need help."
    )
