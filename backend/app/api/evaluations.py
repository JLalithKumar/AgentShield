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
from backend.app.runner.loader import get_scenario, sort_scenarios
from backend.app.runner.test_runner import run_evaluation
from backend.app.integrations.release_gate import decide_release
from backend.app.database.session import get_db
from backend.app.database.models import EvaluationRun, ScenarioResult, EvidenceTrace, User
from backend.app.api.deps import get_current_user, verify_csrf_token
from backend.app.core.rate_limit import rate_limiter
from backend.app.core.config import settings

eval_limiter = rate_limiter(
    action="evaluations",
    max_requests=settings.RATE_LIMIT_EVALUATIONS_MAX,
    window_seconds=settings.RATE_LIMIT_EVALUATIONS_WINDOW_SECONDS
)

router = APIRouter(prefix="/evaluations", tags=["Evaluations"])

@router.post("", response_model=EvaluationResponse, status_code=status.HTTP_200_OK)
def trigger_evaluation(
    request: EvaluationRequest,
    response: Response,
    current_user: User = Depends(get_current_user),
    _csrf: None = Depends(verify_csrf_token),
    _rate_limit: None = Depends(eval_limiter),
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
            "failed": max(0, (r.total_tests or 0) - (r.passed or 0)),
            "critical_regressions": r.critical_regressions,
            "high_regressions": sum(
                1 for res in (r.results or [])
                if res.is_new_regression and str(res.severity).upper() == "HIGH"
            ),
            "release_decision": r.release_decision,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "user_id": r.user_id
        }
        for r in runs
    ]


def _safe_json(text: Optional[str]) -> Dict[str, Any]:
    if not text:
        return {}
    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


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

    ordered_rows = sort_scenarios(run.results or [])
    results = []
    violation_counts: Dict[str, int] = {}
    high_regressions = 0
    medium_regressions = 0
    low_regressions = 0
    regression_scenarios = 0
    categories_seen = set()

    for r in ordered_rows:
        req_meta = _safe_json(r.trace.banking_request if r.trace else None)
        out_meta = _safe_json(r.trace.agent_output if r.trace else None)
        catalog = get_scenario(r.scenario_id) or {}

        category = req_meta.get("category") or catalog.get("category")
        if category:
            categories_seen.add(category)
        customer_question = req_meta.get("customer_question") or catalog.get("customer_question")
        violations = out_meta.get("violations")
        if not isinstance(violations, list):
            violations = []
        if not r.passed:
            if violations:
                for v in violations:
                    code = str((v or {}).get("code") or "UNCLASSIFIED_VIOLATION")
                    violation_counts[code] = violation_counts.get(code, 0) + 1
            elif r.policy_violation:
                code = str(r.policy_violation)
                violation_counts[code] = violation_counts.get(code, 0) + 1

        if r.is_new_regression:
            regression_scenarios += 1
            sev = str(r.severity or "").upper()
            if sev == "HIGH":
                high_regressions += 1
            elif sev == "MEDIUM":
                medium_regressions += 1
            elif sev == "LOW":
                low_regressions += 1

        results.append({
            "scenario_id": r.scenario_id,
            "scenario_name": r.scenario_name,
            "tool_status": r.tool_status,
            "agent_claim": r.agent_claim,
            "agent_response": r.agent_response,
            "passed": r.passed,
            "severity": r.severity,
            "policy_violation": r.policy_violation,
            "violations": violations,
            "is_new_regression": r.is_new_regression,
            "reason": r.reason,
            "category": category,
            "customer_question": customer_question,
            "baseline_status": out_meta.get("baseline_status"),
            "baseline_passed": out_meta.get("baseline_passed"),
            "baseline_response": out_meta.get("baseline_response"),
            "banking_api_response": _safe_json(r.trace.banking_response if r.trace else None) or None,
        })

    failed = max(0, (run.total_tests or 0) - (run.passed or 0))
    total_violations = sum(violation_counts.values())
    gate = decide_release({
        "total_tests": run.total_tests,
        "passed": run.passed,
        "failed": failed,
        "critical_regressions": run.critical_regressions,
        "high_regressions": high_regressions,
        "complete": len(results) == run.total_tests and run.total_tests > 0,
    })

    cat_count = len(categories_seen) or 12
    if regression_scenarios == 0:
        stage4_desc = f"Compared against {run.baseline_version}: 0 regressions across {run.total_tests} scenarios"
    elif regression_scenarios == 1:
        stage4_desc = f"Detected 1 regression ({run.critical_regressions} critical, {high_regressions} high severity)"
    else:
        stage4_desc = f"Detected {regression_scenarios} regressions ({run.critical_regressions} critical, {high_regressions} high severity)"

    stages = [
        {
            "stage_id": 1,
            "name": "Test Scenarios",
            "description": f"Loaded {run.total_tests} naturally ordered banking benchmark cases across {cat_count} categories",
            "status": "COMPLETED",
            "details": {"total_scenarios": run.total_tests, "categories": cat_count},
        },
        {
            "stage_id": 2,
            "name": "Agent Execution",
            "description": f"Executed baseline ({run.baseline_version}) and candidate ({run.candidate_version}) with trace recording",
            "status": "COMPLETED",
            "details": {"baseline": run.baseline_version, "candidate": run.candidate_version},
        },
        {
            "stage_id": 3,
            "name": "Evidence Validation",
            "description": "Validated agent claims against authoritative banking tool outputs",
            "status": "COMPLETED",
            "details": {"verified_count": run.total_tests, "total_violations": total_violations},
        },
        {
            "stage_id": 4,
            "name": "Version Comparison",
            "description": stage4_desc,
            "status": "COMPLETED" if failed == 0 else "WARNING",
            "details": {
                "critical_regressions": run.critical_regressions,
                "high_regressions": high_regressions,
                "regression_scenarios": regression_scenarios,
                "failed": failed,
            },
        },
        {
            "stage_id": 5,
            "name": "Release Gate",
            "description": f"Independent release gate policy decision: {run.release_decision}",
            "status": "ALLOWED" if run.release_decision in {"ALLOWED", "ALLOW"} else "BLOCKED",
            "details": {"decision": run.release_decision, "reason": gate.get("reason", "")},
        },
    ]

    return {
        "run_id": run.run_id,
        "baseline_version": run.baseline_version,
        "candidate_version": run.candidate_version,
        "total_tests": run.total_tests,
        "passed": run.passed,
        "failed": failed,
        "critical_regressions": run.critical_regressions,
        "high_regressions": high_regressions,
        "medium_regressions": medium_regressions,
        "low_regressions": low_regressions,
        "regression_scenarios": regression_scenarios,
        "total_violations": total_violations,
        "violation_counts": violation_counts,
        "release_decision": run.release_decision,
        "reason": gate.get("reason", ""),
        "stages": stages,
        "results": results,
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
    for r in sort_scenarios(run.results or []):
        evidence_resp = {}
        if r.trace and r.trace.banking_response:
            try:
                evidence_resp = json.loads(r.trace.banking_response)
            except Exception:
                evidence_resp = {"raw": r.trace.banking_response}
        req_meta = _safe_json(r.trace.banking_request if r.trace else None)
        out_meta = _safe_json(r.trace.agent_output if r.trace else None)
        catalog = get_scenario(r.scenario_id) or {}

        traces.append({
            "scenario_id": r.scenario_id,
            "scenario_name": r.scenario_name,
            "tool_status": r.tool_status,
            "agent_claim": r.agent_claim,
            "agent_response": r.agent_response,
            "banking_api_response": evidence_resp,
            "evaluation_explanation": r.reason,
            "policy_violation": r.policy_violation,
            "violations": out_meta.get("violations") or [],
            "is_new_regression": r.is_new_regression,
            "severity": r.severity,
            "category": req_meta.get("category") or catalog.get("category"),
            "customer_question": req_meta.get("customer_question") or catalog.get("customer_question"),
            "baseline_response": out_meta.get("baseline_response"),
            "baseline_passed": out_meta.get("baseline_passed"),
            "timestamp": r.created_at
        })

    return {
        "evaluation_id": run.run_id,
        "run_id": run.run_id,
        "baseline_version": run.baseline_version,
        "candidate_version": run.candidate_version,
        "traces": traces
    }
