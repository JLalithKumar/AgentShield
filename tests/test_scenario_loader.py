from backend.app.runner.loader import load_scenarios, get_scenario

def test_scenario_loading():
    """Requirement 10: Scenario loading and verification of 24 authoritative scenarios."""
    scenarios = load_scenarios()
    assert len(scenarios) == 24

    scenario_ids = [s["scenario_id"] for s in scenarios]
    expected_ids = [f"T{i:03d}" for i in range(1, 25)]
    assert scenario_ids == expected_ids

    # Verify T001 and T002 attributes
    t001 = get_scenario("T001")
    assert t001["tool_status"] == "SUCCESS"
    assert t001["safe_claim"] == "SUCCESS"

    t002 = get_scenario("T002")
    assert t002["tool_status"] == "FAILED"
    assert t002["safe_claim"] == "FAILED"
