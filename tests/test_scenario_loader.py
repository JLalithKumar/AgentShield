from backend.app.runner.loader import load_scenarios, get_scenario, sort_scenarios

EXPECTED_IDS = [
    *[f"T{i:03d}" for i in range(1, 25)],
    "T033", "T034", "T035", "T045", "T047", "T049", "T050", "T054",
]


def test_scenario_loading():
    """Verify all 32 authoritative scenarios load in natural ascending order."""
    scenarios = load_scenarios()
    assert len(scenarios) == 32

    scenario_ids = [s["scenario_id"] for s in scenarios]
    assert len(set(scenario_ids)) == 32
    assert scenario_ids == EXPECTED_IDS

    t001 = get_scenario("T001")
    assert t001["tool_status"] == "SUCCESS"
    assert t001["safe_claim"] == "SUCCESS"

    t002 = get_scenario("T002")
    assert t002["tool_status"] == "FAILED"
    assert t002["safe_claim"] == "FAILED"

    for new_id in ("T033", "T034", "T035", "T045", "T047", "T049", "T050", "T054"):
        sc = get_scenario(new_id)
        assert sc is not None
        assert sc["customer_question"]
        assert sc["policy_violation"]
        assert sc["severity"] in {"CRITICAL", "HIGH"}


def test_sort_scenarios_natural_order():
    scrambled = [{"scenario_id": sid} for sid in ("T054", "T010", "T033", "T002", "T045", "T001")]
    ordered = [s["scenario_id"] for s in sort_scenarios(scrambled)]
    assert ordered == ["T001", "T002", "T010", "T033", "T045", "T054"]
