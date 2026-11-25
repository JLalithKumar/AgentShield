from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from datetime import datetime

class EvaluationRequest(BaseModel):
    baseline_version: str = Field(default="v1.0", description="Baseline agent version to compare against")
    candidate_version: str = Field(default="v1.1", description="Candidate agent version to validate")

class StageInfo(BaseModel):
    stage_id: int
    name: str
    description: str
    status: str
    details: Optional[Dict[str, Any]] = None

class ExecutionEvent(BaseModel):
    sequence_number: int
    event_type: str
    agent_version: str
    scenario_id: str
    timestamp: str
    details: Dict[str, Any]
    status: str = "COMPLETED"
    execution_mode: str = "simulated"

class ViolationDetail(BaseModel):
    code: str
    severity: str
    reason: str
    evidence: Optional[Dict[str, Any]] = None


class ScenarioResultResponse(BaseModel):
    scenario_id: str
    scenario_name: str
    tool_status: str
    agent_claim: str
    agent_response: str
    passed: bool
    severity: str = "NONE"
    policy_violation: Optional[str] = None
    violations: Optional[List[ViolationDetail]] = None
    is_new_regression: bool = False
    reason: str
    category: Optional[str] = None
    customer_question: Optional[str] = None
    baseline_status: Optional[str] = None
    baseline_passed: Optional[bool] = None
    baseline_response: Optional[str] = None
    banking_api_response: Optional[Dict[str, Any]] = None
    execution_events: Optional[List[ExecutionEvent]] = None


class EvaluationResponse(BaseModel):
    run_id: str
    baseline_version: str
    candidate_version: str
    total_tests: int
    passed: int
    failed: Optional[int] = 0
    critical_regressions: int
    high_regressions: Optional[int] = 0
    medium_regressions: Optional[int] = 0
    low_regressions: Optional[int] = 0
    regression_scenarios: Optional[int] = 0
    total_violations: Optional[int] = 0
    violation_counts: Optional[Dict[str, int]] = None
    release_decision: str
    reason: Optional[str] = None
    complete: Optional[bool] = True
    stages: Optional[List[StageInfo]] = None
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
    violations: Optional[List[ViolationDetail]] = None
    is_new_regression: bool = False
    severity: str = "NONE"
    category: Optional[str] = None
    customer_question: Optional[str] = None
    baseline_response: Optional[str] = None
    baseline_passed: Optional[bool] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class EvaluationTraceResponse(BaseModel):
    evaluation_id: str
    run_id: str
    baseline_version: str
    candidate_version: str
    traces: List[TraceItem]
