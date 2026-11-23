import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { SCENARIOS } from '../demoResults';

function mockRun(candidate, regression = false) {
  const results = SCENARIOS.map(s => {
    const isUnsafe = regression && s.scenario_id === 'T002';
    return {
      scenario_id: s.scenario_id,
      scenario_name: s.scenario_name,
      tool_status: s.tool_status,
      category: s.category,
      purpose: s.purpose,
      agent_claim: isUnsafe ? 'SUCCESS' : s.safe_claim,
      agent_response: isUnsafe ? 'Your payment was completed successfully.' : s.safe_reply,
      passed: !isUnsafe,
      severity: isUnsafe ? 'CRITICAL' : 'NONE',
      policy_violation: isUnsafe ? 'PAYMENT_STATUS_MISMATCH' : null,
      is_new_regression: isUnsafe,
      reason: isUnsafe ? 'Payment failure contradicted by success claim.' : 'Matches API evidence.',
    };
  });

  return {
    run_id: `test-run-${candidate}`,
    baseline_version: 'v1.0',
    candidate_version: candidate,
    total_tests: 24,
    passed: regression ? 23 : 24,
    critical_regressions: regression ? 1 : 0,
    release_decision: regression ? 'BLOCK' : 'ALLOW',
    reason: regression
      ? 'Blocked: 1 critical regression detected on T002.'
      : 'Allowed: All 24 scenarios passed with 0 critical regressions.',
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

describe('Enterprise UI/UX and WCAG 2.2 AA Accessibility', () => {
  it('provides accessible landmark regions and skip-to-content navigation', () => {
    render(<App />);

    // Skip to main content link
    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');

    // Landmarks
    expect(screen.getAllByRole('banner').length).toBeGreaterThan(0);
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
    expect(screen.getByRole('complementary', { name: /application navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /primary navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();
  });

  it('marks active navigation item with aria-current="page"', async () => {
    const user = userEvent.setup();
    render(<App />);

    const consoleBtn = screen.getByRole('button', { name: /^evaluation console$/i });
    expect(consoleBtn).toHaveAttribute('aria-current', 'page');

    const libraryBtn = screen.getByRole('button', { name: /^scenario library$/i });
    expect(libraryBtn).not.toHaveAttribute('aria-current');

    await user.click(libraryBtn);
    expect(screen.getByRole('button', { name: /^scenario library$/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: /^evaluation console$/i })).not.toHaveAttribute('aria-current');
  });

  it('displays category filter and updates scenario count dynamically in Scenario Library', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /scenario library/i }));

    const categorySelect = screen.getByRole('combobox', { name: /category/i });
    expect(categorySelect).toBeInTheDocument();

    await user.selectOptions(categorySelect, 'REFUND');
    const refundCount = SCENARIOS.filter(s => s.category === 'REFUND').length;
    expect(screen.getByText(`${refundCount} of 24 scenarios`)).toBeInTheDocument();
  });

  it('displays prominent Release Gate Outcome summary for BLOCKED runs', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockRun('v1.1', true),
    }));

    render(<App />);
    await user.click(screen.getByRole('button', { name: /^run evaluation$/i }));

    expect(await screen.findByText('AUTOMATED RELEASE BLOCKED')).toBeInTheDocument();
    expect(screen.getByText(/candidate v1.1 introduced 1 critical regression on scenario t002/i)).toBeInTheDocument();
    expect(screen.getByText('BLOCKED')).toBeInTheDocument();
  });

  it('displays prominent Release Gate Outcome summary for ALLOWED runs', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockRun('v1.2', false),
    }));

    render(<App />);
    await user.selectOptions(screen.getByRole('combobox', { name: /candidate agent/i }), 'v1.2');
    await user.click(screen.getByRole('button', { name: /^run evaluation$/i }));

    expect(await screen.findByText('AUTOMATED RELEASE ALLOWED')).toBeInTheDocument();
    expect(screen.getByText(/candidate v1.2 passed all 24 banking scenarios/i)).toBeInTheDocument();
    expect(screen.getByText('ALLOWED')).toBeInTheDocument();
  });

  it('includes plain-language structured diagnosis breakdown for failed scenarios', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockRun('v1.1', true),
    }));

    render(<App />);
    await user.click(screen.getByRole('button', { name: /^run evaluation$/i }));
    await screen.findByText('BACKEND API RESPONSE');

    // Select T002
    const t002Row = screen.getByRole('row', { name: /T002/ });
    await user.click(t002Row);

    expect(screen.getByText('Safety Failure Investigation Breakdown')).toBeInTheDocument();
    expect(screen.getByText(/What happened:/)).toBeInTheDocument();
    expect(screen.getByText(/Why it is unsafe:/)).toBeInTheDocument();
    expect(screen.getByText(/Evidence that proves it:/)).toBeInTheDocument();
    expect(screen.getByText(/Release readiness impact:/)).toBeInTheDocument();
  });
});
