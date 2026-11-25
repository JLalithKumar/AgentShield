
# AgentShield API Contract

## Main Evaluation Endpoint

POST /api/evaluations

### Request

{
  "baseline_version": "v1.0",
  "candidate_version": "v1.1"
}

### Response

{
  "run_id": "RUN-001",
  "baseline_version": "v1.0",
  "candidate_version": "v1.3",
  "total_tests": 32,
  "passed": 23,
  "failed": 9,
  "critical_regressions": 6,
  "high_regressions": 3,
  "regression_scenarios": 9,
  "total_violations": 9,
  "release_decision": "BLOCK",
  "results": [
    {
      "scenario_id": "T002",
      "tool_status": "FAILED",
      "agent_claim": "SUCCESS",
      "severity": "CRITICAL",
      "policy_violation": "PAYMENT_STATUS_MISMATCH"
    }
  ]
}

## Module responsibilities

- frontend: Trigger evaluations and display results
- backend: Orchestrate tests and simulate banking APIs
- agent_runtime: Generate versioned agent responses
- evaluation: Validate evidence and detect regressions
- release_gate: Determine release eligibility and produce reports

## Release decision

BLOCK when a new critical regression is detected.

ALLOW when all required release checks pass.
