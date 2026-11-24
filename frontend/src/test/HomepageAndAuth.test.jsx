import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Homepage from '../Homepage';
import AuthModal from '../AuthModal';
import App from '../App';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Homepage Component', () => {
  it('renders all key sections and branding on the public homepage', () => {
    const onOpenConsole = vi.fn();
    const onOpenLibrary = vi.fn();
    const onOpenSignIn = vi.fn();
    const onOpenSignUp = vi.fn();

    render(
      <Homepage
        user={null}
        onOpenConsole={onOpenConsole}
        onOpenLibrary={onOpenLibrary}
        onOpenSignIn={onOpenSignIn}
        onOpenSignUp={onOpenSignUp}
        onSignOut={vi.fn()}
      />
    );

    // Header & Brand
    expect(screen.getAllByText('AgentShield')[0]).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();

    // Hero Section
    expect(
      screen.getByRole('heading', { name: /Safe Change Control for AI Banking Agents/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /launch evaluation console/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /explore 24 banking scenarios/i })).toBeInTheDocument();

    // Problem Statement & T002 Mention
    expect(screen.getByRole('heading', { name: /Why Financial AI Agents Fail Silently in Production/i })).toBeInTheDocument();
    expect(screen.getByText(/Scenario T002 • Failed Payment/i)).toBeInTheDocument();

    // 5-Stage Workflow Pipeline
    expect(screen.getByRole('heading', { name: /The 5-Stage Evaluation Pipeline/i })).toBeInTheDocument();
    expect(screen.getByText(/24 Synthetic Scenarios/i)).toBeInTheDocument();
    expect(screen.getByText(/Record 9 Observable Steps/i)).toBeInTheDocument();
    expect(screen.getByText(/Validate Against Tools/i)).toBeInTheDocument();
    expect(screen.getByText(/Version Regression Engine/i)).toBeInTheDocument();
    expect(screen.getByText(/Automated Release Gate/i)).toBeInTheDocument();

    // Personas & Architecture
    expect(screen.getByRole('heading', { name: /Built for Cross-Functional AI Governance/i })).toBeInTheDocument();
    expect(screen.getByText('QA Engineers')).toBeInTheDocument();
    expect(screen.getByText('AI / Prompt Engineers')).toBeInTheDocument();
    expect(screen.getByText('Release Managers')).toBeInTheDocument();
    expect(screen.getByText('Compliance & Risk')).toBeInTheDocument();
  });

  it('toggles interactive hero comparison between Candidate v1.1 and v1.2', async () => {
    const user = userEvent.setup();
    render(
      <Homepage
        user={null}
        onOpenConsole={vi.fn()}
        onOpenLibrary={vi.fn()}
        onOpenSignIn={vi.fn()}
        onOpenSignUp={vi.fn()}
        onSignOut={vi.fn()}
      />
    );

    // Candidate v1.1 is active by default -> BLOCKED
    expect(screen.getAllByText('BLOCKED')[0]).toBeInTheDocument();
    expect(screen.getByText(/PAYMENT_STATUS_MISMATCH/i)).toBeInTheDocument();

    // Switch to Candidate v1.2 tab
    const tabV12 = screen.getByRole('tab', { name: /Candidate v1\.2/i });
    await user.click(tabV12);

    expect(screen.getAllByText('ALLOWED')[0]).toBeInTheDocument();
    expect(screen.getByText(/24\/24 scenarios passed/i)).toBeInTheDocument();
  });

  it('displays user profile in header when logged in', () => {
    const mockUser = {
      id: 1,
      full_name: 'Jane Doe',
      email: 'jane@bank.com',
    };

    render(
      <Homepage
        user={mockUser}
        onOpenConsole={vi.fn()}
        onOpenLibrary={vi.fn()}
        onOpenSignIn={vi.fn()}
        onOpenSignUp={vi.fn()}
        onSignOut={vi.fn()}
      />
    );

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@bank.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go to dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });
});

describe('AuthModal Component', () => {
  it('validates input and toggles password visibility', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    const onClose = vi.fn();

    render(
      <AuthModal
        isOpen={true}
        initialMode="login"
        onClose={onClose}
        onLogin={onLogin}
        onRegister={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: /Sign in to AgentShield/i })).toBeInTheDocument();
    const emailInput = screen.getByLabelText(/corporate or personal email/i);
    const passwordInput = screen.getByLabelText(/^Password$/);
    const showToggle = screen.getByRole('button', { name: /show password text/i });

    // Password starts masked
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Click show password
    await user.click(showToggle);
    expect(passwordInput).toHaveAttribute('type', 'text');

    // Fill form and submit
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'Secret123!');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(onLogin).toHaveBeenCalledWith('test@example.com', 'Secret123!');
  });

  it('switches to registration mode and enforces password match', async () => {
    const user = userEvent.setup();
    const onRegister = vi.fn();

    render(
      <AuthModal
        isOpen={true}
        initialMode="login"
        onClose={vi.fn()}
        onLogin={vi.fn()}
        onRegister={onRegister}
      />
    );

    // Switch to register
    await user.click(screen.getByRole('button', { name: /sign up free/i }));
    expect(screen.getByRole('heading', { name: /Create AgentShield Account/i })).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/corporate or personal email/i);
    const passwordInput = screen.getByLabelText(/^Password$/);
    const confirmInput = screen.getByLabelText(/confirm password/i);

    await user.type(nameInput, 'Alex Morgan');
    await user.type(emailInput, 'alex@agentshield.ai');
    await user.type(passwordInput, 'Password123!');
    await user.type(confirmInput, 'Mismatch999!');

    await user.click(screen.getByRole('button', { name: /create account/i }));

    // Local validation stops submission and shows error alert
    expect(screen.getByRole('alert')).toHaveTextContent(/passwords do not match/i);
    expect(onRegister).not.toHaveBeenCalled();
  });

  it('enforces required full name in registration mode', async () => {
    const user = userEvent.setup();
    const onRegister = vi.fn();

    render(
      <AuthModal
        isOpen={true}
        initialMode="register"
        onClose={vi.fn()}
        onLogin={vi.fn()}
        onRegister={onRegister}
      />
    );

    const emailInput = screen.getByLabelText(/corporate or personal email/i);
    const passwordInput = screen.getByLabelText(/^Password$/);
    const confirmInput = screen.getByLabelText(/confirm password/i);

    // Omit full name
    await user.type(emailInput, 'alex@agentshield.ai');
    await user.type(passwordInput, 'Password123!');
    await user.type(confirmInput, 'Password123!');

    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/please enter your full name/i);
    expect(onRegister).not.toHaveBeenCalled();
  });
});

describe('App Authentication Guards and User Isolation', () => {
  it('renders homepage when initialView is home', () => {
    render(<App initialView="home" initialUser={null} />);
    expect(
      screen.getByRole('heading', { name: /Safe Change Control for AI Banking Agents/i })
    ).toBeInTheDocument();
  });

  it('anonymous visitor clicking Start Evaluating opens login modal and explains account is required', async () => {
    const user = userEvent.setup();
    render(<App initialView="home" initialUser={null} />);

    // Click hero "Start Evaluating"
    const startBtn = screen.getByRole('button', { name: /launch evaluation console/i });
    await user.click(startBtn);

    // Explanatory message and AuthModal shown
    expect(screen.getByRole('heading', { name: /Sign in to AgentShield/i })).toBeInTheDocument();
    expect(screen.getByText(/Please sign in or create an account to run evaluations/i)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('Get Started button opens registration modal', async () => {
    const user = userEvent.setup();
    render(<App initialView="home" initialUser={null} />);

    const getStartedBtn = screen.getByRole('button', { name: /^get started$/i });
    await user.click(getStartedBtn);

    expect(screen.getByRole('heading', { name: /Create AgentShield Account/i })).toBeInTheDocument();
  });

  it('unauthenticated navigation to protected route is guarded', async () => {
    const user = userEvent.setup();
    render(<App initialView="home" initialUser={null} />);

    // Open library first (public/unauthenticated exploration allowed)
    await user.click(screen.getByRole('button', { name: /explore 24 banking scenarios/i }));
    expect(screen.getByRole('heading', { name: 'Scenario Library' })).toBeInTheDocument();

    // Now try to navigate to protected "Evaluation Console" in sidebar
    await user.click(screen.getByRole('button', { name: 'Evaluation Console' }));

    // AuthModal opens to protect console
    expect(screen.getByRole('heading', { name: /Sign in to AgentShield/i })).toBeInTheDocument();
    expect(screen.getByText(/Please sign in or create an account to access the evaluation platform/i)).toBeInTheDocument();
  });

  it('logging out immediately revokes access, clears state, and returns to homepage', async () => {
    const user = userEvent.setup();
    const authenticatedUser = {
      id: 42,
      full_name: 'Dr. Jane Shield',
      email: 'jane@agentshield.ai',
    };

    render(<App initialView="evaluations" initialUser={authenticatedUser} />);

    expect(screen.getByRole('heading', { name: 'Agent Evaluation Console' })).toBeInTheDocument();
    expect(screen.getByText('jane@agentshield.ai')).toBeInTheDocument();

    // Click Sign Out
    const signOutBtn = screen.getByRole('button', { name: /sign out/i });
    await user.click(signOutBtn);

    // Navigated to public homepage
    expect(screen.getByRole('heading', { name: /Safe Change Control for AI Banking Agents/i })).toBeInTheDocument();
    expect(screen.queryByText('jane@agentshield.ai')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('logging out while an evaluation is pending immediately aborts the request and leaves no trace', async () => {
    const user = userEvent.setup();
    const authenticatedUser = {
      id: 42,
      full_name: 'Dr. Jane Shield',
      email: 'jane@agentshield.ai',
    };

    // Mock fetch that hangs or takes long
    let abortSignalCaptured = null;
    vi.stubGlobal('fetch', vi.fn((url, options) => {
      if (url.includes('/api/evaluations')) {
        abortSignalCaptured = options?.signal;
        return new Promise((resolve, reject) => {
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              const err = new Error('Aborted');
              err.name = 'AbortError';
              reject(err);
            });
          }
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }));

    render(<App initialView="evaluations" initialUser={authenticatedUser} />);

    // Click Run Evaluation
    await user.click(screen.getByRole('button', { name: /^run evaluation$/i }));

    // Verify evaluation is pending
    expect(screen.getByText(/waiting for the evaluation service/i)).toBeInTheDocument();
    expect(abortSignalCaptured).not.toBeNull();
    expect(abortSignalCaptured.aborted).toBe(false);

    // User clicks Sign Out while evaluation is in-flight
    await user.click(screen.getByRole('button', { name: /sign out/i }));

    // Abort signal should be triggered immediately
    expect(abortSignalCaptured.aborted).toBe(true);

    // Returned to public homepage cleanly without orphaned progress or alert
    expect(screen.getByRole('heading', { name: /Safe Change Control for AI Banking Agents/i })).toBeInTheDocument();
    expect(screen.queryByText(/waiting for the evaluation service/i)).not.toBeInTheDocument();
  });
});
