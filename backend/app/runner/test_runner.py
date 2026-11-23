
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

        scenario_events_map = {}

        for scenario in scenarios:

            s_id = scenario["scenario_id"]
            now_str = datetime.now().isoformat()

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

            # Build observable execution events for stages 1-3
            exec_mode = candidate_output.get("execution_mode", "simulated")
            events = [
                {
                    "sequence_number": 1,
                    "event_type": "SCENARIO_LOADED",
                    "agent_version": candidate,
                    "scenario_id": s_id,
                    "timestamp": now_str,
                    "details": {
                        "scenario_name": scenario.get("scenario_name"),
                        "category": scenario.get("category"),
                        "customer_question": scenario.get("customer_question"),
                    },
                    "status": "COMPLETED",
                    "execution_mode": "simulated",
                },
                {
                    "sequence_number": 2,
                    "event_type": "AGENT_SELECTED",
                    "agent_version": candidate,
                    "scenario_id": s_id,
                    "timestamp": now_str,
                    "details": {
                        "baseline_version": baseline,
                        "candidate_version": candidate,
                    },
                    "status": "COMPLETED",
                    "execution_mode": "simulated",
                },
                {
                    "sequence_number": 3,
                    "event_type": "INPUT_SUPPLIED",
                    "agent_version": candidate,
                    "scenario_id": s_id,
                    "timestamp": now_str,
                    "details": {
                        "customer_question": scenario.get("customer_question"),
                    },
                    "status": "COMPLETED",
                    "execution_mode": "simulated",
                },
                {
                    "sequence_number": 4,
                    "event_type": "BANKING_EVIDENCE_RECEIVED",
                    "agent_version": candidate,
                    "scenario_id": s_id,
                    "timestamp": now_str,
                    "details": {
                        "tool_status": evidence.get("status"),
                        "transaction_id": evidence.get("transaction_id"),
                        "raw_evidence": evidence,
                    },
                    "status": "COMPLETED",
                    "execution_mode": "simulated",
                },
                {
                    "sequence_number": 5,
                    "event_type": "AGENT_RESPONSE_GENERATED",
                    "agent_version": candidate,
                    "scenario_id": s_id,
                    "timestamp": now_str,
                    "details": {
                        "agent_response": candidate_output.get("response", ""),
                    },
                    "status": "COMPLETED",
                    "execution_mode": exec_mode,
                },
                {
                    "sequence_number": 6,
                    "event_type": "EVIDENCE_VALIDATED",
                    "agent_version": candidate,
                    "scenario_id": s_id,
                    "timestamp": now_str,
                    "details": {
                        "tool_status": c_eval.get("tool_status"),
                        "agent_claim": c_eval.get("agent_claim"),
                        "claim_matches_evidence": c_eval.get("passed", False),
                    },
                    "status": "COMPLETED",
                    "execution_mode": "simulated",
                },
                {
                    "sequence_number": 7,
                    "event_type": "SAFETY_VERDICT_DETERMINED",
                    "agent_version": candidate,
                    "scenario_id": s_id,
                    "timestamp": now_str,
                    "details": {
                        "passed": c_eval.get("passed", False),
                        "severity": c_eval.get("severity", "NONE"),
                        "policy_violation": c_eval.get("policy_violation"),
                        "reason": c_eval.get("reason", ""),
                    },
                    "status": "COMPLETED",
                    "execution_mode": "simulated",
                },
            ]
            scenario_events_map[s_id] = events

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

        # Append comparison and release gate events (events 8 & 9)
        now_comp_str = datetime.now().isoformat()
        for res in compared_results:
            s_id = res["scenario_id"]
            ev_list = scenario_events_map.get(s_id, [])
            ev_list.append({
                "sequence_number": 8,
                "event_type": "VERSION_COMPARISON_COMPLETED",
                "agent_version": candidate,
                "scenario_id": s_id,
                "timestamp": now_comp_str,
                "details": {
                    "is_new_regression": res.get("is_new_regression", False),
                    "severity": res.get("severity", "NONE"),
                    "policy_violation": res.get("policy_violation"),
                },
                "status": "COMPLETED",
                "execution_mode": "simulated",
            })
            res["execution_events"] = ev_list

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
        # Validate mandatory scenario coverage
        # --------------------------------------------------

        required_ids = {
            s["scenario_id"]
            for s in scenarios
        }

        result_ids = [
            result.get("scenario_id")
            for result in compared_results
        ]

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
        # Release Gate-compatible summary
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

        gate_decision = decide_release(summary)

        release_decision = gate_decision.get(
            "release_decision",
            "BLOCK",
        )

        summary["release_decision"] = release_decision
        summary["reason"] = gate_decision.get("reason", "")

        # Append final Release Gate event (event 9) to each scenario
        for res in compared_results:
            ev_list = res.get("execution_events", [])
            ev_list.append({
                "sequence_number": 9,
                "event_type": "RELEASE_GATE_ASSESSED",
                "agent_version": candidate,
                "scenario_id": res["scenario_id"],
                "timestamp": datetime.now().isoformat(),
                "details": {
                    "release_decision": release_decision,
                    "blocks_release": res.get("severity") == "CRITICAL" and res.get("is_new_regression", False),
                    "reason": summary["reason"],
                },
                "status": "COMPLETED",
                "execution_mode": "simulated",
            })

        # Structured 5-stage workflow status
        summary["stages"] = [
            {
                "stage_id": 1,
                "name": "Test Scenarios",
                "description": f"Loaded {total_tests} fixed banking benchmark cases across 12 categories",
                "status": "COMPLETED",
                "details": {"total_scenarios": total_tests},
            },
            {
                "stage_id": 2,
                "name": "Agent Execution",
                "description": f"Executed baseline ({baseline}) and candidate ({candidate}) with trace recording",
                "status": "COMPLETED",
                "details": {"baseline": baseline, "candidate": candidate, "execution_mode": "simulated"},
            },
            {
                "stage_id": 3,
                "name": "Evidence Validation",
                "description": "Validated agent claims against authoritative banking tool outputs",
                "status": "COMPLETED",
                "details": {"verified_count": total_tests},
            },
            {
                "stage_id": 4,
                "name": "Version Comparison",
                "description": f"Identified {critical_regressions} critical regressions and {failed} failures",
                "status": "COMPLETED" if critical_regressions == 0 else "WARNING",
                "details": {"critical_regressions": critical_regressions, "failed": failed},
            },
            {
                "stage_id": 5,
                "name": "Release Gate",
                "description": f"Independent release gate decision: {release_decision}",
                "status": "ALLOWED" if release_decision in {"ALLOWED", "ALLOW"} else "BLOCKED",
                "details": {"decision": release_decision, "reason": summary["reason"]},
            },
        ]

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
            created_at=datetime.now(),
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
