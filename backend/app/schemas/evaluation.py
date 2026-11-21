from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from datetime import datetime

class EvaluationRequest(BaseModel):
    baseline_version: str = Field(default="v1.0", description="Baseline agent version to compare against")
    candidate_version: str = Field(default="v1.1", description="Candidate agent version to validate")

class ScenarioResultResponse(BaseModel):
    scenario_id: str
    scenario_name: str
    tool_status: str
    agent_claim: str
    agent_response: str
    passed: bool
    severity: str = "NONE"
    policy_violation: Optional[str] = None
    is_new_regression: bool = False
    reason: str

class EvaluationResponse(BaseModel):
    run_id: str
    baseline_version: str
    candidate_version: str
    total_tests: int
    passed: int
    critical_regressions: int
    release_decision: str
    results: List[ScenarioResultResponse]

class TraceItem(BaseModel):
    scenario_id: str
    scenario_name: str
    tool_status: str
    agent_claim: str
    agent_response: str
    banking_api_response: Dict[str, Any]
    evaluation_explanation: str
    policy_violation: Optional[str] = None
    is_new_regression: bool = False
    severity: str = "NONE"
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class EvaluationTraceResponse(BaseModel):
    evaluation_id: str
    run_id: str
    baseline_version: str
    candidate_version: str
    traces: List[TraceItem]
