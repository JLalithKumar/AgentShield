import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { SCENARIOS } from '../demoResults';

// These are mocked API responses, not real banking transactions or LLM outputs.
// They exercise the dashboard contract without requiring a running FastAPI server.
function makeApiRun(candidate = 'v1.1') {
  const hasRegression = candidate === 'v1.1';
  const results = SCENARIOS.map((scenario) => {
    const unsafe = hasRegression && scenario.scenario_id === 'T002';
    return {
      scenario_id: scenario.scenario_id,
      scenario_name: scenario.scenario_name,
      tool_status: scenario.tool_status,
      agent_claim: unsafe ? 'SUCCESS' : scenario.safe_claim,
      agent_response: unsafe
        ? 'Your payment was completed successfully.'
        : scenario.safe_reply,
      passed: !unsafe,
      severity: unsafe ? 'CRITICAL' : 'NONE',
      policy_violation: unsafe ? 'PAYMENT_STATUS_MISMATCH' : null,
      is_new_regression: unsafe,
      reason: unsafe
        ? 'The agent claimed success despite the failed banking transaction.'
        : 'Agent response matches banking evidence.',
    };
  });

  return {
    run_id: `test-run-${candidate}`,
    baseline_version: 'v1.0',
    candidate_version: candidate,
    total_tests: results.length,
    passed: results.filter((row) => row.passed).length,
    critical_regressions: hasRegression ? 1 : 0,
    release_decision: hasRegression ? 'BLOCK' : 'ALLOW',
    results,
  };
}

function mockBackendSuccess(candidate = 'v1.1') {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => makeApiRun(candidate),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('AgentShield evaluation console', () => {
  it('starts with the evaluation console and v1.1 selected', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Agent Evaluation Console' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ready for your first evaluation' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /candidate agent/i })).toHaveValue('v1.1');
    expect(screen.getByRole('button', { name: /^run evaluation$/i })).toBeEnabled();
  });

  it('clearly labels preview results as demo data without calling the API', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /preview demo data/i }));

    expect(screen.getByText(/demo data.*not a live evaluation/i)).toBeInTheDocument();
    expect(screen.getByText('BLOCKED')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('switching candidates clears an old run before starting a new one', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /preview demo data/i }));
    expect(screen.getByText('BLOCKED')).toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: /candidate agent/i }), 'v1.2');
    expect(screen.getByRole('heading', { name: 'Ready for your first evaluation' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /preview demo data/i }));
    expect(screen.getByText('ALLOWED')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends the correct POST request and displays the blocked v1.1 result', async () => {
    const user = userEvent.setup();
    const fetchMock = mockBackendSuccess('v1.1');
    render(<App />);

    await user.click(screen.getByRole('button', { name: /^run evaluation$/i }));

    expect(await screen.findByText('BACKEND API RESPONSE')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/evaluations$/),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseline_version: 'v1.0', candidate_version: 'v1.1' }),
      },
    );
    expect(screen.getByText('BLOCKED')).toBeInTheDocument();
    expect(screen.getByText(/Policy: PAYMENT_STATUS_MISMATCH/)).toBeInTheDocument();
    expect(screen.getByText('New regression detected')).toBeInTheDocument();
  });

  it('sends v1.2 and displays an allowed release decision', async () => {
    const user = userEvent.setup();
    const fetchMock = mockBackendSuccess('v1.2');
    render(<App />);

    await user.selectOptions(screen.getByRole('combobox', { name: /candidate agent/i }), 'v1.2');
    await user.click(screen.getByRole('button', { name: /^run evaluation$/i }));

    expect(await screen.findByText('BACKEND API RESPONSE')).toBeInTheDocument();
    expect(screen.getByText('ALLOWED')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/evaluations$/),
      expect.objectContaining({
        body: JSON.stringify({ baseline_version: 'v1.0', candidate_version: 'v1.2' }),
      }),
    );
  });

  it('disables evaluation actions while a backend request is pending', async () => {
    const user = userEvent.setup();
    let resolveRequest;
    const pendingResponse = new Promise((resolve) => {
      resolveRequest = resolve;
    });
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(pendingResponse));
    render(<App />);

    await user.click(screen.getByRole('button', { name: /^run evaluation$/i }));
    expect(screen.getByRole('button', { name: /running evaluation/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /preview demo data/i })).toBeDisabled();

    await act(async () => {
      resolveRequest({ ok: true, status: 200, json: async () => makeApiRun('v1.1') });
    });

    expect(await screen.findByText('BACKEND API RESPONSE')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^run evaluation$/i })).toBeEnabled();
  });

  it('shows a useful message when the backend returns an HTTP error', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    render(<App />);

    await user.click(screen.getByRole('button', { name: /^run evaluation$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Backend returned HTTP 503');
    expect(screen.getByRole('button', { name: /^run evaluation$/i })).toBeEnabled();
    expect(screen.getByRole('heading', { name: 'Ready for your first evaluation' })).toBeInTheDocument();
  });

  it('rejects a malformed backend response without displaying it as a valid run', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ release_decision: 'ALLOW' }),
    }));
    render(<App />);

    await user.click(screen.getByRole('button', { name: /^run evaluation$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('missing a results array');
    expect(screen.queryByText('BACKEND API RESPONSE')).not.toBeInTheDocument();
    expect(screen.queryByText('ALLOWED')).not.toBeInTheDocument();
  });

  it('reports network failures and still offers a demo preview', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network unavailable')));
    render(<App />);

    await user.click(screen.getByRole('button', { name: /^run evaluation$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Network unavailable');

    await user.click(screen.getByRole('button', { name: /preview demo data/i }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText(/demo data.*not a live evaluation/i)).toBeInTheDocument();
  });

  it('selects a scenario row and shows its corresponding evidence', async () => {
    const user = userEvent.setup();
    mockBackendSuccess('v1.1');
    render(<App />);

    await user.click(screen.getByRole('button', { name: /^run evaluation$/i }));
    await screen.findByText('BACKEND API RESPONSE');

    const scenarioRow = screen.getByRole('row', { name: /T001/ });
    await user.click(scenarioRow);

    expect(scenarioRow).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Agent response matches banking evidence.')).toBeInTheDocument();
    expect(screen.getByText('No new regression identified')).toBeInTheDocument();
  });

  it('opens the trace explorer with evidence from the current API run', async () => {
    const user = userEvent.setup();
    mockBackendSuccess('v1.1');
    render(<App />);

    await user.click(screen.getByRole('button', { name: /^run evaluation$/i }));
    await screen.findByText('BACKEND API RESPONSE');
    await user.click(screen.getByRole('button', { name: /open trace explorer/i }));

    expect(screen.getByRole('heading', { name: 'Trace Explorer' })).toBeInTheDocument();
    expect(screen.getByText('BACKEND API RESPONSE')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /T001/ }));
    expect(screen.getByText('Agent response matches banking evidence.')).toBeInTheDocument();
  });
});

describe('AgentShield scenario library', () => {
  it('filters scenarios by scenario ID', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /scenario library/i }));
    expect(screen.getByRole('heading', { name: 'Scenario Library' })).toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: /search scenarios/i }), 'T002');
    expect(screen.getByText(`1 of ${SCENARIOS.length} scenarios`)).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /T002/ })).toBeInTheDocument();
  });

  it('filters scenarios by authoritative API status', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /scenario library/i }));
    await user.selectOptions(screen.getByRole('combobox', { name: /banking api status/i }), 'FAILED');

    const expectedCount = SCENARIOS.filter((scenario) => scenario.tool_status === 'FAILED').length;
    expect(screen.getByText(`${expectedCount} of ${SCENARIOS.length} scenarios`)).toBeInTheDocument();
  });

  it('opens a clearly marked demo trace when no backend run has been loaded', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /scenario library/i }));
    await user.click(screen.getByRole('button', { name: /preview evidence trace/i }));

    expect(screen.getByRole('heading', { name: 'Trace Explorer' })).toBeInTheDocument();
    expect(screen.getByText(/demo data.*not a live evaluation/i)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
