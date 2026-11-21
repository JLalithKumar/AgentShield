
"""
Test Runner Orchestrator

Strictly follows docs/module-interfaces.md:
run_evaluation(baseline: str, candidate: str) -> dict

Integrates:
- Banking Simulator
- AI Agent Runtime
- Independent Safety Evaluator
- Independent Release Gate
- Database Persistence
- Evidence Trace Recording
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
from backend.app.integrations.evaluator import (
    evaluate_response,
    compare_versions,
)
from backend.app.integrations.release_gate import decide_release

from backend.app.database.session import SessionLocal, init_db
from backend.app.database.models import (
    EvaluationRun,
    ScenarioResult,
    EvidenceTrace,
)


logger = logging.getLogger(__name__)


def run_evaluation(
    baseline: str = "v1.0",
    candidate: str = "v1.1",
    db: Optional[Session] = None,
) -> Dict[str, Any]:
    """
    Main AgentShield evaluation pipeline.

    Workflow:
    1. Reset banking simulator
    2. Load mandatory scenarios
    3. Generate authoritative banking evidence
    4. Execute baseline agent
    5. Execute candidate agent
    6. Compare safety evaluation results
    7. Calculate evaluation metrics
    8. Invoke independent Release Gate
    9. Save results and traces to database
    10. Return API-compatible evaluation summary
    """

    close_db = False

    if db is None:
        init_db()
        db = SessionLocal()
        close_db = True

    try:

        # --------------------------------------------------
        # 1. Reset banking simulator
        # --------------------------------------------------

        banking_simulator.reset()

        logger.info("Banking simulator reset successfully")

        # --------------------------------------------------
        # 2. Load mandatory banking scenarios
        # --------------------------------------------------

        scenarios = load_scenarios()

        run_id = f"RUN-{uuid.uuid4().hex[:6].upper()}"

        baseline_evaluations = []
        candidate_evaluations = []
        traces = []

        logger.info(
            "Starting evaluation %s | Baseline: %s | Candidate: %s",
            run_id,
            baseline,
            candidate,
        )

        # --------------------------------------------------
        # 3. Execute scenarios
        # --------------------------------------------------

        for scenario in scenarios:

            s_id = scenario["scenario_id"]

            logger.info("Executing scenario: %s", s_id)

            # Obtain authoritative mock banking evidence
            evidence = banking_simulator.execute_scenario_evidence(
                s_id
            )

            # ----------------------------------------------
            # 4. Execute baseline AI agent
            # ----------------------------------------------

            baseline_output = generate_response(
                baseline,
                scenario,
                evidence,
            )

            b_eval = evaluate_response(
                scenario,
                evidence,
                baseline_output,
            )

            baseline_evaluations.append(b_eval)

            # ----------------------------------------------
            # 5. Execute candidate AI agent
            # ----------------------------------------------

            candidate_output = generate_response(
                candidate,
                scenario,
                evidence,
            )

            c_eval = evaluate_response(
                scenario,
                evidence,
                candidate_output,
            )

            candidate_evaluations.append(c_eval)

            # ----------------------------------------------
            # Record evidence trace
            # ----------------------------------------------

            traces.append({
                "scenario_id": s_id,
                "scenario_name": scenario.get("scenario_name"),
                "banking_request": json.dumps({
                    "scenario_id": s_id,
                    "category": scenario.get("category"),
                }),
                "banking_response": json.dumps(evidence),
                "agent_input": json.dumps({
                    "version": candidate,
                    "scenario": scenario,
                }),
                "agent_output": json.dumps(candidate_output),
            })

        # --------------------------------------------------
        # 6. Compare baseline and candidate results
        # --------------------------------------------------

        compared_results = compare_versions(
            baseline_evaluations,
            candidate_evaluations,
        )

        # --------------------------------------------------
        # 7. Calculate evaluation metrics
        # --------------------------------------------------

        total_tests = len(compared_results)

        passed = sum(
            1
            for result in compared_results
            if result.get("passed") is True
        )

        failed = total_tests - passed

        critical_regressions = sum(
            1
            for result in compared_results
            if (
                result.get("is_new_regression") is True
                and result.get("severity") == "CRITICAL"
            )
        )

        # --------------------------------------------------
        # NEW: Validate mandatory scenario coverage
        # --------------------------------------------------

        # AgentShield currently requires eight banking tests:
        # T001 through T008.

        required_ids = {
            f"T{i:03d}"
            for i in range(1, 9)
        }

        result_ids = [
            result.get("scenario_id")
            for result in compared_results
        ]

        # An evaluation is complete only when:
        # 1. Exactly eight mandatory results are present.
        # 2. All expected scenario IDs are included.
        # 3. No duplicate scenario IDs exist.
        # 4. Every scenario has a valid boolean pass/fail result.
        #
        # Complete does NOT mean all tests passed.
        # A completed run may still contain safety failures.

        complete = (
            total_tests == len(required_ids)
            and set(result_ids) == required_ids
            and len(set(result_ids)) == total_tests
            and all(
                type(result.get("passed")) is bool
                for result in compared_results
            )
        )

        logger.info(
            "Evaluation metrics | Total: %s | Passed: %s | "
            "Failed: %s | Critical regressions: %s | Complete: %s",
            total_tests,
            passed,
            failed,
            critical_regressions,
            complete,
        )

        # --------------------------------------------------
        # NEW: Release Gate-compatible summary
        # --------------------------------------------------

        summary = {
            "run_id": run_id,
            "baseline_version": baseline,
            "candidate_version": candidate,
            "total_tests": total_tests,
            "passed": passed,
            "failed": failed,
            "critical_regressions": critical_regressions,
            "complete": complete,
            "results": compared_results,
        }

        # --------------------------------------------------
        # 8. Invoke independent Release Gate
        # --------------------------------------------------

        # The adapter now delegates directly to
        # release_gate.decision.decide_release()

        gate_decision = decide_release(summary)

        release_decision = gate_decision.get(
            "release_decision",
            "BLOCK",
        )

        summary["release_decision"] = release_decision
        summary["reason"] = gate_decision.get("reason", "")

        logger.info(
            "Release Gate | Decision: %s | Reason: %s",
            release_decision,
            summary["reason"],
        )

        # --------------------------------------------------
        # 9. Persist evaluation results to database
        # --------------------------------------------------

        db_run = EvaluationRun(
            run_id=run_id,
            baseline_version=baseline,
            candidate_version=candidate,
            total_tests=total_tests,
            passed=passed,
            critical_regressions=critical_regressions,
            release_decision=release_decision,
            created_at=datetime.utcnow(),
        )

        db.add(db_run)
        db.flush()

        # Index evidence traces by scenario ID.
        trace_map = {
            trace["scenario_id"]: trace
            for trace in traces
        }

        # --------------------------------------------------
        # Save individual scenario results
        # --------------------------------------------------

        for result in compared_results:

            db_res = ScenarioResult(
                run_id=run_id,
                scenario_id=result["scenario_id"],
                scenario_name=result.get(
                    "scenario_name",
                    "",
                ),
                tool_status=result["tool_status"],
                agent_claim=result["agent_claim"],
                agent_response=result.get(
                    "agent_response",
                    "",
                ),
                passed=result["passed"],
                severity=result.get(
                    "severity",
                    "NONE",
                ),
                policy_violation=result.get(
                    "policy_violation"
                ),
                is_new_regression=result.get(
                    "is_new_regression",
                    False,
                ),
                reason=result.get(
                    "reason",
                    "",
                ),
            )

            db.add(db_res)
            db.flush()

            # ----------------------------------------------
            # Save evidence trace
            # ----------------------------------------------

            trace_info = trace_map.get(
                result["scenario_id"]
            )

            if trace_info:

                db_trace = EvidenceTrace(
                    scenario_result_id=db_res.id,
                    scenario_id=result["scenario_id"],
                    banking_request=trace_info[
                        "banking_request"
                    ],
                    banking_response=trace_info[
                        "banking_response"
                    ],
                    agent_input=trace_info[
                        "agent_input"
                    ],
                    agent_output=trace_info[
                        "agent_output"
                    ],
                )

                db.add(db_trace)

        # Commit evaluation and evidence records.
        db.commit()

        logger.info(
            "Evaluation %s completed successfully",
            run_id,
        )

        # --------------------------------------------------
        # 10. Return API-compatible evaluation summary
        # --------------------------------------------------

        return summary

    except Exception as error:

        if db:
            db.rollback()

        logger.error(
            "Error during evaluation execution: %s",
            str(error),
            exc_info=True,
        )

        raise

    finally:

        if close_db and db:
            db.close()
