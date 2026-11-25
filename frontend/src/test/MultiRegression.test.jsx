import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { createDemoRun } from '../demoResults';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('AgentShield v1.3 multi-regression workflow & trace UI', () => {
  it('supports candidate v1.3 with helper summary, 6 metrics, and filtered regressions', async () => {
    const user = userEvent.setup();
    render(<App />);

    const select = screen.getByRole('combobox', { name: /candidate agent/i });
    await user.selectOptions(select, 'v1.3');
    expect(screen.getByText(/9 simultaneous safety failures/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /preview demo data/i }));

    expect(screen.getByText('AUTOMATED RELEASE BLOCKED')).toBeInTheDocument();
    expect(screen.getByText(/introduced 9 safety regressions \(6 critical, 3 high\)/i)).toBeInTheDocument();

    const metrics = screen.getByLabelText('Evaluation summary metrics');
    expect(within(metrics).getByLabelText('Total scenarios: 32')).toBeInTheDocument();
    expect(within(metrics).getByLabelText('Passed scenarios: 23')).toBeInTheDocument();
    expect(within(metrics).getByLabelText('Failed scenarios: 9')).toBeInTheDocument();
    expect(within(metrics).getByLabelText('Critical regressions: 6')).toBeInTheDocument();
    expect(within(metrics).getByLabelText('High-severity regressions: 3')).toBeInTheDocument();
    expect(within(metrics).getByLabelText('Release decision: BLOCKED')).toBeInTheDocument();

    const regSection = screen.getByLabelText('Detected Safety Regressions');
    expect(within(regSection).getByText('9 Regressions')).toBeInTheDocument();
    expect(within(regSection).getAllByRole('listitem')).toHaveLength(9);

    await user.click(within(regSection).getByRole('button', { name: /high \(3\)/i }));
    expect(within(regSection).getAllByRole('listitem')).toHaveLength(3);
    expect(within(regSection).getByText('Pending Holds')).toBeInTheDocument();
    expect(within(regSection).getByText('Stale Balance')).toBeInTheDocument();
    expect(within(regSection).getByText('Conflicting Records')).toBeInTheDocument();

    await user.click(within(regSection).getByRole('button', { name: /critical \(6\)/i }));
    expect(within(regSection).getAllByRole('listitem')).toHaveLength(6);

    await user.click(within(regSection).getByRole('button', { name: /all \(9\)/i }));
    expect(within(regSection).getAllByRole('listitem')).toHaveLength(9);

    // Table maintains ascending natural scenario order from T001 to T054
    const resultsTable = screen.getByRole('table', { name: /scenario results/i });
    const rowIds = within(resultsTable)
      .getAllByRole('button', { name: /inspect scenario/i })
      .map((btn) => btn.textContent.trim());
    expect(rowIds[0]).toBe('T001');
    expect(rowIds[24]).toBe('T033');
    expect(rowIds[31]).toBe('T054');
  });

  it('sorts scrambled backend API scenario rows into natural order', async () => {
    const user = userEvent.setup();
    const baseRun = createDemoRun('v1.3');
    const scrambled = {
      ...baseRun,
      run_id: 'API-SCRAMBLED',
      results: [...baseRun.results].reverse(),
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => scrambled,
    }));

    render(<App />);
    await user.selectOptions(screen.getByRole('combobox', { name: /candidate agent/i }), 'v1.3');
    await user.click(screen.getByRole('button', { name: /^run evaluation$/i }));

    expect(await screen.findByText('BACKEND API RESPONSE')).toBeInTheDocument();
    const resultsTable = screen.getByRole('table', { name: /scenario results/i });
    const rowIds = within(resultsTable)
      .getAllByRole('button', { name: /inspect scenario/i })
      .map((btn) => btn.textContent.trim());
    expect(rowIds[0]).toBe('T001');
    expect(rowIds[31]).toBe('T054');
  });

  it('renders dedicated freshness, conflict, pending holds, and OTP redaction panels in Trace Explorer', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(screen.getByRole('combobox', { name: /candidate agent/i }), 'v1.3');
    await user.click(screen.getByRole('button', { name: /preview demo data/i }));
    await user.click(screen.getByRole('button', { name: /^trace explorer$/i }));

    // Inspect T050 Stale Balance
    await user.click(screen.getByRole('button', { name: /T050.*Stale Balance/i }));
    const freshness = screen.getByLabelText('Evidence freshness and timestamp verification');
    expect(within(freshness).getByText('USD 6,200.00')).toBeInTheDocument();
    expect(within(freshness).getByText('USD 8,500.00 (STALE)')).toBeInTheDocument();
    expect(within(freshness).getByText(/2026-11-24T10:15:00Z/)).toBeInTheDocument();

    // Inspect T054 Conflicting Records
    await user.click(screen.getByRole('button', { name: /T054.*Conflicting Records/i }));
    const conflict = screen.getByLabelText('Conflicting records source authority');
    expect(within(conflict).getByText(/Core Banking Ledger/)).toBeInTheDocument();
    expect(within(conflict).getByText('FAILED')).toBeInTheDocument();
    expect(within(conflict).getByText(/Notification Cache/)).toBeInTheDocument();
    expect(within(conflict).getByText('SUCCESS (DISPUTED)')).toBeInTheDocument();

    // Inspect T045 Pending Holds
    await user.click(screen.getByRole('button', { name: /T045.*Pending Holds/i }));
    const holds = screen.getByLabelText('Ledger balance and pending holds breakdown');
    expect(within(holds).getByText('USD 5,000.00')).toBeInTheDocument();
    expect(within(holds).getByText('USD 1,200.00')).toBeInTheDocument();
    expect(within(holds).getByText('USD 3,800.00')).toBeInTheDocument();

    // Inspect T033 Expired OTP redaction notice
    await user.click(screen.getByRole('button', { name: /T033.*Expired OTP/i }));
    const otpNotice = screen.getByLabelText('OTP security redaction notice');
    expect(within(otpNotice).getByText(/Actual OTP secrets are strictly redacted/i)).toBeInTheDocument();
  });

  it('shows empty regressions state and hides inspect button when v1.2 passes all scenarios', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(screen.getByRole('combobox', { name: /candidate agent/i }), 'v1.2');
    await user.click(screen.getByRole('button', { name: /preview demo data/i }));

    expect(screen.getByText('AUTOMATED RELEASE ALLOWED')).toBeInTheDocument();
    expect(screen.getByText('No safety regressions detected')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /inspect .* regressions/i })).not.toBeInTheDocument();
  });
});
