import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { SCENARIOS } from '../demoResults';

// Only mock API responses here; this does NOT call the real backend.
function makeApiRun(candidate) {
  const hasRegression = candidate === 'v1.1';
  const results = SCENARIOS.map((scenario) => {
    const unsafe = hasRegression && scenario.scenario_id === 'T002';
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
      reason: unsafe ? 'Success claim contradicts failed API.' : 'Matches API evidence.',
    };
  });
  return {
    run_id: `history-run-${candidate}`,
    baseline_version: 'v1.0',
    candidate_version: candidate,
    total_tests: 8,
    passed: hasRegression ? 7 : 8,
    critical_regressions: hasRegression ? 1 : 0,
    release_decision: hasRegression ? 'BLOCK' : 'ALLOW',
    results,
  };
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('AgentShield session-only evaluation history', () => {
  it('starts empty and guides the user to run a backend evaluation', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /evaluation history/i }));
    expect(screen.getByRole('heading', { name: 'Evaluation History' })).toBeInTheDocument();
    expect(screen.getByText('No backend evaluations recorded yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to Evaluation Console' })).toBeInTheDocument();
  });

  it('does not misrepresent synthetic demo previews as backend history', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Preview Demo Data' }));
    await user.click(screen.getByRole('button', { name: /evaluation history/i }));
    expect(screen.getByText('No backend evaluations recorded yet')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('records backend evaluations and opens their saved evidence traces', async () => {
    const user = userEvent.setup();
    fetch.mockResolvedValue({ ok: true, status: 200, json: async () => makeApiRun('v1.1') });
    render(<App />);

    await user.click(screen.getByRole('button', { name: /run backend evaluation/i }));
    expect(await screen.findByText('BACKEND API RESPONSE')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /evaluation history/i }));
    const historyTable = screen.getByRole('table');
    expect(within(historyTable).getByText('history-run-v1.1')).toBeInTheDocument();
    expect(within(historyTable).getByText('7 / 8')).toBeInTheDocument();
    expect(within(historyTable).getByText('BLOCKED')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'View trace for history-run-v1.1' }));
    expect(screen.getByRole('heading', { name: 'Trace Explorer' })).toBeInTheDocument();
    expect(screen.getByText('Policy: PAYMENT_STATUS_MISMATCH')).toBeInTheDocument();
    expect(screen.getByText('BACKEND API RESPONSE')).toBeInTheDocument();
  });

  it('retains two different candidate runs while switching versions', async () => {
    const user = userEvent.setup();
    fetch.mockImplementation(async (_url, options) => {
      const { candidate_version } = JSON.parse(options.body);
      return { ok: true, status: 200, json: async () => makeApiRun(candidate_version) };
    });
    render(<App />);

    await user.click(screen.getByRole('button', { name: /run backend evaluation/i }));
    expect(await screen.findByText('BACKEND API RESPONSE')).toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: /candidate agent/i }), 'v1.2');
    await user.click(screen.getByRole('button', { name: /run backend evaluation/i }));
    expect(await screen.findByText('BACKEND API RESPONSE')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /evaluation history/i }));
    const historyTable = screen.getByRole('table');
    expect(within(historyTable).getByText('history-run-v1.1')).toBeInTheDocument();
    expect(within(historyTable).getByText('history-run-v1.2')).toBeInTheDocument();
    expect(within(historyTable).getByText('BLOCKED')).toBeInTheDocument();
    expect(within(historyTable).getByText('ALLOWED')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
