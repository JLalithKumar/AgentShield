from fastapi import APIRouter, HTTPException, status
from typing import List
from backend.app.schemas.scenario import ScenarioDefinition
from backend.app.runner.loader import load_scenarios, get_scenario

router = APIRouter(prefix="/scenarios", tags=["Scenarios"])

@router.get("", response_model=List[ScenarioDefinition])
def list_scenarios():
    """List all authoritative banking test scenarios."""
    return load_scenarios()

@router.get("/{scenario_id}", response_model=ScenarioDefinition)
def get_scenario_by_id(scenario_id: str):
    """Retrieve detailed specification for a specific test scenario."""
    scenario = get_scenario(scenario_id)
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scenario with ID '{scenario_id}' not found."
        )
    return scenario
