
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
  "total_tests": 8,
  "passed": 7,
  "critical_regressions": 1,
  "release_decision": "BLOCK",
  "results": [
    {
      "scenario_id": "PAYMENT-001",
      "tool_status": "FAILED",
      "agent_claim": "SUCCESS",
      "severity": "CRITICAL"
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
