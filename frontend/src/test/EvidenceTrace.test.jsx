import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { SCENARIOS } from '../demoResults';

function runFor(candidate = 'v1.1', options = {}) {
  const regression = candidate === 'v1.1';
  const results = SCENARIOS.map((scenario) => {
    const unsafe = regression && scenario.scenario_id === 'T002';
    return {
      scenario_id: scenario.scenario_id,
      scenario_name: scenario.scenario_name,
      tool_status: scenario.tool_status,
      agent_claim: unsafe ? 'SUCCESS' : scenario.safe_claim,
      agent_response: unsafe ? 'Your payment was completed successfully.' : scenario.safe_reply,
      passed: !unsafe,
      severity: unsafe ? 'CRITICAL' : 'NONE',
      policy_violation: unsafe ? 'PAYMENT_STATUS_MISMATCH' : null,
      is_new_regression: unsafe,
      reason: unsafe ? 'Agent reported success despite a failed payment.' : 'Agent response matches banking evidence.',
      ...(scenario.scenario_id === 'T002' ? options : {}),
    };
  });
  return {
    run_id: `evidence-${candidate}`,
    baseline_version: 'v1.0',
    candidate_version: candidate,
    total_tests: 8,
    passed: regression ? 7 : 8,
    critical_regressions: regression ? 1 : 0,
    release_decision: regression ? 'BLOCK' : 'ALLOW',
    results,
  };
}

async function loadRun(user, result) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => result }));
  render(<App />);
  await user.click(screen.getByRole('button', { name: /run backend evaluation/i }));
  expect(await screen.findByText('BACKEND API RESPONSE')).toBeInTheDocument();
}

beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('Evidence-based Trace Explorer improvements', () => {
  it('highlights a critical API/agent contradiction and its release impact', async () => {
    const user = userEvent.setup();
    await loadRun(user, runFor('v1.1'));
    expect(screen.getByText('Safety check failed')).toBeInTheDocument();
    expect(screen.getByText('Policy: PAYMENT_STATUS_MISMATCH')).toBeInTheDocument();
    expect(screen.getByText('New regression detected')).toBeInTheDocument();
    expect(screen.getByText('Release BLOCKED')).toBeInTheDocument();
    const comparison = screen.getByLabelText('Banking evidence and agent claim comparison');
    expect(within(comparison).getByText('FAILED')).toBeInTheDocument();
    expect(within(comparison).getByText('SUCCESS')).toBeInTheDocument();
  });

  it('shows NO VIOLATION for a passing scenario without inventing a policy violation', async () => {
    const user = userEvent.setup();
    await loadRun(user, runFor('v1.2'));
    expect(screen.getByText('Safety check passed')).toBeInTheDocument();
    expect(screen.getAllByText('NO VIOLATION').length).toBeGreaterThan(0);
    expect(screen.getByText('Policy: No policy violation')).toBeInTheDocument();
    expect(screen.getByText('Release ALLOWED')).toBeInTheDocument();
  });

  it('does not label missing violation details as safe when a check fails', async () => {
    const user = userEvent.setup();
    await loadRun(user, runFor('v1.1', {
      severity: 'HIGH', policy_violation: null, reason: 'Evidence could not be confirmed.',
    }));
    expect(screen.getByText('Safety check failed')).toBeInTheDocument();
    expect(screen.getByText('Policy: Not reported')).toBeInTheDocument();
    expect(screen.getByText('Evidence could not be confirmed.')).toBeInTheDocument();
  });

  it('only shows raw JSON evidence when the API actually supplies it', async () => {
    const user = userEvent.setup();
    await loadRun(user, runFor('v1.1', {
      api_evidence: { status: 'FAILED', transaction_id: 'TXN-T002' },
    }));
    await user.click(screen.getByText('View raw evidence returned by API'));
    expect(screen.getByText(/"transaction_id": "TXN-T002"/)).toBeInTheDocument();
  });

  it('preserves enhanced details when reopening a run from Evaluation History', async () => {
    const user = userEvent.setup();
    await loadRun(user, runFor('v1.1'));
    await user.click(screen.getByRole('button', { name: /evaluation history/i }));
    await user.click(screen.getByRole('button', { name: 'View trace for evidence-v1.1' }));
    expect(screen.getByRole('heading', { name: 'Trace Explorer' })).toBeInTheDocument();
    expect(screen.getByText('Policy: PAYMENT_STATUS_MISMATCH')).toBeInTheDocument();
    expect(screen.getByText('Release BLOCKED')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('keeps synthetic demo traces clearly labeled as non-live', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Preview Demo Data' }));
    await user.click(screen.getByRole('button', { name: /open trace explorer/i }));
    expect(screen.getByText(/DEMO DATA.*NOT A LIVE EVALUATION/)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
