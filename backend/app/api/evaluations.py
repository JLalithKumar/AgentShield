import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.app.schemas.evaluation import (
    EvaluationRequest,
    EvaluationResponse,
    EvaluationTraceResponse,
    TraceItem
)
from backend.app.runner.test_runner import run_evaluation
from backend.app.database.session import get_db
from backend.app.database.models import EvaluationRun, ScenarioResult, EvidenceTrace

router = APIRouter(prefix="/evaluations", tags=["Evaluations"])

@router.post("", response_model=EvaluationResponse, status_code=status.HTTP_200_OK)
def trigger_evaluation(
    request: EvaluationRequest,
    db: Session = Depends(get_db)
):
    """
    Trigger AgentShield safety validation comparing baseline and candidate versions.
    Strictly follows docs/api-contract.md.
    """
    try:
        result = run_evaluation(
            baseline=request.baseline_version,
            candidate=request.candidate_version,
            db=db
        )
        return result
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Evaluation failed to complete: {str(exc)}"
        )

@router.get("/{run_id}", response_model=EvaluationResponse)
def get_evaluation(run_id: str, db: Session = Depends(get_db)):
    """Retrieve historical evaluation run by its run_id."""
    run = db.query(EvaluationRun).filter(EvaluationRun.run_id == run_id).first()
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evaluation run {run_id} not found."
        )

    results = []
    for r in run.results:
        results.append({
            "scenario_id": r.scenario_id,
            "scenario_name": r.scenario_name,
            "tool_status": r.tool_status,
            "agent_claim": r.agent_claim,
            "agent_response": r.agent_response,
            "passed": r.passed,
            "severity": r.severity,
            "policy_violation": r.policy_violation,
            "is_new_regression": r.is_new_regression,
            "reason": r.reason
        })

    return {
        "run_id": run.run_id,
        "baseline_version": run.baseline_version,
        "candidate_version": run.candidate_version,
        "total_tests": run.total_tests,
        "passed": run.passed,
        "critical_regressions": run.critical_regressions,
        "release_decision": run.release_decision,
        "results": results
    }

@router.get("/{run_id}/traces")
def get_evaluation_traces(run_id: str, db: Session = Depends(get_db)):
    """Retrieve detailed traces for an evaluation run."""
    run = db.query(EvaluationRun).filter(EvaluationRun.run_id == run_id).first()
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evaluation run {run_id} not found."
        )

    traces = []
    for r in run.results:
        evidence_resp = {}
        if r.trace and r.trace.banking_response:
            try:
                evidence_resp = json.loads(r.trace.banking_response)
            except Exception:
                evidence_resp = {"raw": r.trace.banking_response}

        traces.append({
            "scenario_id": r.scenario_id,
            "scenario_name": r.scenario_name,
            "tool_status": r.tool_status,
            "agent_claim": r.agent_claim,
            "agent_response": r.agent_response,
            "banking_api_response": evidence_resp,
            "evaluation_explanation": r.reason,
            "policy_violation": r.policy_violation,
            "is_new_regression": r.is_new_regression,
            "severity": r.severity,
            "timestamp": r.created_at
        })

    return {
        "evaluation_id": run.run_id,
        "run_id": run.run_id,
        "baseline_version": run.baseline_version,
        "candidate_version": run.candidate_version,
        "traces": traces
    }
