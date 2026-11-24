import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthPage from '../AuthPage';

describe('AuthPage Enterprise Component', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders enterprise brand identity panel and security highlights', () => {
    render(
      <AuthPage
        onLogin={vi.fn()}
        onRegister={vi.fn()}
      />
    );

    // Left brand panel checks
    expect(screen.getAllByText('AgentShield')[0]).toBeInTheDocument();
    expect(screen.getByText('Enterprise AI Release Governance')).toBeInTheDocument();
    expect(screen.getByText('Evidence-Driven Validation')).toBeInTheDocument();
    expect(screen.getByText('Continuous Regression Testing')).toBeInTheDocument();
    expect(screen.getByText('Controlled Release Decisions')).toBeInTheDocument();

    // Right card checks
    expect(screen.getByRole('tab', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in to agentshield/i })).toBeInTheDocument();
  });

  it('switches between Sign In and Create Account modes', async () => {
    const user = userEvent.setup();
    render(
      <AuthPage
        onLogin={vi.fn()}
        onRegister={vi.fn()}
      />
    );

    // Initially in Login mode (no full name input)
    expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument();

    // Click Create Account tab
    const createTab = screen.getByRole('tab', { name: /create account/i });
    await user.click(createTab);

    // Full name and confirm password inputs are visible
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create agentshield account/i })).toBeInTheDocument();
  });

  it('validates registration required fields and password matching', async () => {
    const user = userEvent.setup();
    const onRegister = vi.fn();

    render(
      <AuthPage
        initialMode="register"
        onLogin={vi.fn()}
        onRegister={onRegister}
      />
    );

    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const pwdInput = screen.getByLabelText(/^password/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);
    const submitBtn = screen.getByRole('button', { name: /create agentshield account/i });

    // 1. Password mismatch
    await user.type(nameInput, 'Alex Vance');
    await user.type(emailInput, 'alex@agentshield.org');
    await user.type(pwdInput, 'Password123!');
    await user.type(confirmInput, 'DifferentPassword123!');
    await user.click(submitBtn);

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(onRegister).not.toHaveBeenCalled();
  });

  it('submits login credentials without requiring a CAPTCHA challenge', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn().mockResolvedValue({});

    render(
      <AuthPage
        onLogin={onLogin}
        onRegister={vi.fn()}
      />
    );

    const emailInput = screen.getByLabelText(/email/i);
    const pwdInput = screen.getByLabelText(/^password/i);
    const submitBtn = screen.getByRole('button', { name: /sign in to agentshield/i });

    await user.type(emailInput, 'engineer@bank.com');
    await user.type(pwdInput, 'ValidPassword123!');
    await user.click(submitBtn);

    expect(onLogin).toHaveBeenCalledWith('engineer@bank.com', 'ValidPassword123!');
    expect(screen.queryByTestId('turnstile-widget')).not.toBeInTheDocument();
    expect(screen.getByText(/Protected by Argon2id password encryption/i)).toBeInTheDocument();
  });

  it('toggles password visibility with accessible button', async () => {
    const user = userEvent.setup();
    render(
      <AuthPage
        onLogin={vi.fn()}
        onRegister={vi.fn()}
      />
    );

    const pwdInput = screen.getByLabelText(/^password/i);
    const toggleBtn = screen.getByRole('button', { name: /show password/i });

    expect(pwdInput).toHaveAttribute('type', 'password');
    await user.click(toggleBtn);
    expect(pwdInput).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument();
  });

  it('displays server error and explanation alerts when provided', () => {
    render(
      <AuthPage
        onLogin={vi.fn()}
        onRegister={vi.fn()}
        error="Invalid email or password."
        explanation="Please sign in to access your AgentShield workspace."
      />
    );

    expect(screen.getByText('Invalid email or password.')).toBeInTheDocument();
    expect(screen.getByText('Please sign in to access your AgentShield workspace.')).toBeInTheDocument();
  });
});
