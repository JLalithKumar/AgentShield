"""
Test Runner Orchestrator
Strictly follows docs/module-interfaces.md:
run_evaluation(baseline: str, candidate: str) -> dict
"""
import uuid
import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from backend.app.runner.loader import load_scenarios
from backend.app.banking.simulator import banking_simulator
from backend.app.integrations.agent_runtime import generate_response
from backend.app.integrations.evaluator import evaluate_response, compare_versions
from backend.app.integrations.release_gate import decide_release
from backend.app.database.session import SessionLocal, init_db
from backend.app.database.models import EvaluationRun, ScenarioResult, EvidenceTrace

logger = logging.getLogger(__name__)

def run_evaluation(baseline: str = "v1.0", candidate: str = "v1.1", db: Optional[Session] = None) -> Dict[str, Any]:
    """
    Main evaluation pipeline orchestrating banking evidence, agent runtime,
    safety evaluation, and release gating.
    Returns payload strictly conforming to docs/api-contract.md and frontend App.jsx.
    """
    close_db = False
    if db is None:
        init_db()
        db = SessionLocal()
        close_db = True

    try:
        # 1. Reset simulator state for fresh isolated execution
        banking_simulator.reset()

        # 2. Load all 8 synthetic banking scenarios
        scenarios = load_scenarios()
        run_id = f"RUN-{uuid.uuid4().hex[:6].upper()}"

        baseline_evaluations = []
        candidate_evaluations = []
        traces = []

        for scenario in scenarios:
            s_id = scenario["scenario_id"]

            # 3. Obtain authoritative mock banking evidence
            evidence = banking_simulator.execute_scenario_evidence(s_id)

            # 4. Invoke AI runtime for baseline version
            baseline_output = generate_response(baseline, scenario, evidence)
            b_eval = evaluate_response(scenario, evidence, baseline_output)
            baseline_evaluations.append(b_eval)

            # 5. Invoke AI runtime for candidate version
            candidate_output = generate_response(candidate, scenario, evidence)
            c_eval = evaluate_response(scenario, evidence, candidate_output)
            candidate_evaluations.append(c_eval)

            # Save trace details
            traces.append({
                "scenario_id": s_id,
                "scenario_name": scenario.get("scenario_name"),
                "banking_request": json.dumps({"scenario_id": s_id, "category": scenario.get("category")}),
                "banking_response": json.dumps(evidence),
                "agent_input": json.dumps({"version": candidate, "scenario": scenario}),
                "agent_output": json.dumps(candidate_output)
            })

        # 6. Compare candidate against baseline to identify regressions
        compared_results = compare_versions(baseline_evaluations, candidate_evaluations)

        # 7. Calculate summary metrics
        total_tests = len(compared_results)
        passed = sum(1 for r in compared_results if r.get("passed") is True)
        critical_regressions = sum(1 for r in compared_results if r.get("is_new_regression") is True and r.get("severity") == "CRITICAL")

        summary = {
            "run_id": run_id,
            "baseline_version": baseline,
            "candidate_version": candidate,
            "total_tests": total_tests,
            "passed": passed,
            "critical_regressions": critical_regressions,
            "results": compared_results
        }

        # 8. Invoke Release Gate to decide BLOCK or ALLOW
        gate_decision = decide_release(summary)
        release_decision = gate_decision.get("release_decision", "BLOCK")
        summary["release_decision"] = release_decision
        summary["reason"] = gate_decision.get("reason", "")

        # 9. Persist evaluation and traces to database
        db_run = EvaluationRun(
            run_id=run_id,
            baseline_version=baseline,
            candidate_version=candidate,
            total_tests=total_tests,
            passed=passed,
            critical_regressions=critical_regressions,
            release_decision=release_decision,
            created_at=datetime.utcnow()
        )
        db.add(db_run)
        db.flush()

        trace_map = {t["scenario_id"]: t for t in traces}

        for r in compared_results:
            db_res = ScenarioResult(
                run_id=run_id,
                scenario_id=r["scenario_id"],
                scenario_name=r.get("scenario_name", ""),
                tool_status=r["tool_status"],
                agent_claim=r["agent_claim"],
                agent_response=r.get("agent_response", ""),
                passed=r["passed"],
                severity=r.get("severity", "NONE"),
                policy_violation=r.get("policy_violation"),
                is_new_regression=r.get("is_new_regression", False),
                reason=r.get("reason", "")
            )
            db.add(db_res)
            db.flush()

            t_info = trace_map.get(r["scenario_id"])
            if t_info:
                db_trace = EvidenceTrace(
                    scenario_result_id=db_res.id,
                    scenario_id=r["scenario_id"],
                    banking_request=t_info["banking_request"],
                    banking_response=t_info["banking_response"],
                    agent_input=t_info["agent_input"],
                    agent_output=t_info["agent_output"]
                )
                db.add(db_trace)

        db.commit()

        # 10. Return standard contract payload
        return summary

    except Exception as e:
        if db:
            db.rollback()
        logger.error(f"Error during evaluation execution: {str(e)}", exc_info=True)
        raise
    finally:
        if close_db and db:
            db.close()
