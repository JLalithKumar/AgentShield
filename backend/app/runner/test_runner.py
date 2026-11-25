
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

from backend.app.runner.loader import load_scenarios, sort_scenarios
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
    user_id: Optional[int] = None,
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
            c_eval["category"] = scenario.get("category")
            c_eval["customer_question"] = scenario.get("customer_question")
            c_eval["baseline_passed"] = bool(b_eval.get("passed"))
            c_eval["baseline_status"] = "PASSED" if b_eval.get("passed") else "FAILED"
            c_eval["baseline_response"] = baseline_output.get("response", "")
            c_eval["banking_api_response"] = evidence

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
                    "customer_question": scenario.get("customer_question"),
                }),
                "banking_response": json.dumps(evidence),
                "agent_input": json.dumps({
                    "version": candidate,
                    "baseline_version": baseline,
                    "scenario": scenario,
                }),
                "agent_output": json.dumps({
                    **candidate_output,
                    "baseline_response": baseline_output.get("response", ""),
                    "baseline_passed": bool(b_eval.get("passed")),
                    "baseline_status": "PASSED" if b_eval.get("passed") else "FAILED",
                    "violations": c_eval.get("violations") or [],
                }),
            })

        # --------------------------------------------------
        # 6. Compare baseline and candidate results
        # --------------------------------------------------

        compared_results = sort_scenarios(
            compare_versions(
                baseline_evaluations,
                candidate_evaluations,
            )
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

        regressed = [
            result for result in compared_results if result.get("is_new_regression") is True
        ]
        regression_scenarios = len(regressed)

        critical_regressions = sum(
            1 for result in regressed if result.get("severity") == "CRITICAL"
        )
        high_regressions = sum(
            1 for result in regressed if result.get("severity") == "HIGH"
        )
        medium_regressions = sum(
            1 for result in regressed if result.get("severity") == "MEDIUM"
        )
        low_regressions = sum(
            1 for result in regressed if result.get("severity") == "LOW"
        )

        violation_counts: Dict[str, int] = {}
        for result in compared_results:
            if result.get("passed") is True:
                continue
            row_violations = result.get("violations") or []
            if row_violations:
                for v in row_violations:
                    code = str(v.get("code") or "UNCLASSIFIED_VIOLATION")
                    violation_counts[code] = violation_counts.get(code, 0) + 1
            elif result.get("policy_violation"):
                code = str(result["policy_violation"])
                violation_counts[code] = violation_counts.get(code, 0) + 1
        total_violations = sum(violation_counts.values())

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
            "Evaluation metrics | Total: %s | Passed: %s | Failed: %s | "
            "Critical: %s | High: %s | Violations: %s | Complete: %s",
            total_tests,
            passed,
            failed,
            critical_regressions,
            high_regressions,
            total_violations,
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
            "high_regressions": high_regressions,
            "medium_regressions": medium_regressions,
            "low_regressions": low_regressions,
            "regression_scenarios": regression_scenarios,
            "total_violations": total_violations,
            "violation_counts": violation_counts,
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
                    "blocks_release": res.get("passed") is False,
                    "reason": summary["reason"],
                },
                "status": "COMPLETED",
                "execution_mode": "simulated",
            })

        category_count = len({s.get("category") for s in scenarios if s.get("category")})
        if regression_scenarios == 0:
            stage4_desc = f"Compared against {baseline}: 0 regressions across {total_tests} scenarios"
        elif regression_scenarios == 1:
            stage4_desc = f"Detected 1 regression ({critical_regressions} critical, {high_regressions} high severity)"
        else:
            stage4_desc = f"Detected {regression_scenarios} regressions ({critical_regressions} critical, {high_regressions} high severity)"

        # Structured 5-stage workflow status
        summary["stages"] = [
            {
                "stage_id": 1,
                "name": "Test Scenarios",
                "description": f"Loaded {total_tests} naturally ordered banking benchmark cases across {category_count} categories",
                "status": "COMPLETED",
                "details": {"total_scenarios": total_tests, "categories": category_count},
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
                "details": {"verified_count": total_tests, "total_violations": total_violations},
            },
            {
                "stage_id": 4,
                "name": "Version Comparison",
                "description": stage4_desc,
                "status": "COMPLETED" if failed == 0 else "WARNING",
                "details": {
                    "critical_regressions": critical_regressions,
                    "high_regressions": high_regressions,
                    "regression_scenarios": regression_scenarios,
                    "failed": failed,
                },
            },
            {
                "stage_id": 5,
                "name": "Release Gate",
                "description": f"Independent release gate policy decision: {release_decision}",
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
            user_id=user_id,
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
