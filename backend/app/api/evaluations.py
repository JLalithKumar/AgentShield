import json
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any

from backend.app.schemas.evaluation import (
    EvaluationRequest,
    EvaluationResponse,
    EvaluationTraceResponse,
    TraceItem
)
from backend.app.runner.test_runner import run_evaluation
from backend.app.database.session import get_db
from backend.app.database.models import EvaluationRun, ScenarioResult, EvidenceTrace, User
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/evaluations", tags=["Evaluations"])

@router.post("", response_model=EvaluationResponse, status_code=status.HTTP_200_OK)
def trigger_evaluation(
    request: EvaluationRequest,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Trigger AgentShield safety validation comparing baseline and candidate versions.
    Requires an authenticated user session. Links the run strictly to current_user.id.
    """
    response.headers["Cache-Control"] = "no-store, private"
    try:
        result = run_evaluation(
            baseline=request.baseline_version,
            candidate=request.candidate_version,
            db=db,
            user_id=current_user.id
        )
        return result
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Evaluation failed to complete: {str(exc)}"
        )

@router.get("", response_model=List[Dict[str, Any]])
def list_evaluations(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve persisted evaluation runs for the authenticated user only.
    Strictly isolated: users cannot see evaluations created by others.
    """
    response.headers["Cache-Control"] = "no-store, private"
    runs = (
        db.query(EvaluationRun)
        .filter(EvaluationRun.user_id == current_user.id)
        .order_by(EvaluationRun.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "run_id": r.run_id,
            "baseline_version": r.baseline_version,
            "candidate_version": r.candidate_version,
            "total_tests": r.total_tests,
            "passed": r.passed,
            "critical_regressions": r.critical_regressions,
            "release_decision": r.release_decision,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "user_id": r.user_id
        }
        for r in runs
    ]

@router.get("/{run_id}", response_model=EvaluationResponse)
def get_evaluation(
    run_id: str,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve historical evaluation run by its run_id with IDOR protection."""
    response.headers["Cache-Control"] = "no-store, private"
    run = db.query(EvaluationRun).filter(EvaluationRun.run_id == run_id).first()
    if not run or run.user_id != current_user.id:
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
def get_evaluation_traces(
    run_id: str,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve detailed traces for an evaluation run with IDOR protection."""
    response.headers["Cache-Control"] = "no-store, private"
    run = db.query(EvaluationRun).filter(EvaluationRun.run_id == run_id).first()
    if not run or run.user_id != current_user.id:
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
