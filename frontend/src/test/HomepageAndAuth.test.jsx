import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
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
    expect(screen.getAllByRole('button', { name: /launch evaluation engine/i })[0]).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /discover how it works/i })).toBeInTheDocument();

    // Problem Statement & T002 Mention
    expect(screen.getByRole('heading', { name: /Why Financial AI Agents Fail Silently in Production/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Scenario T002 • Failed Payment/i)[0]).toBeInTheDocument();

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

  it('renders clean conceptual architecture visual without static candidate comparison tabs', () => {
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

    // Verify static preview tabs are removed from homepage per Photo 3
    expect(screen.queryByRole('tab', { name: /Candidate v1\.1/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Candidate v1\.2/i })).not.toBeInTheDocument();

    // Verify conceptual engine graphic is present
    expect(screen.getByRole('region', { name: /AgentShield Safety Engine Architecture/i })).toBeInTheDocument();
    expect(screen.getByText(/AgentShield Core/i)).toBeInTheDocument();
    expect(screen.getByText(/Candidate Agent Response/i)).toBeInTheDocument();
    expect(screen.getByText(/Banking Ledger State/i)).toBeInTheDocument();
    expect(screen.getByText(/Policy Invariant Verification/i)).toBeInTheDocument();
    expect(screen.getByText(/Release Gate Decision/i)).toBeInTheDocument();
  });

  it('displays user profile in header when logged in and toggles accessible account dropdown without Go to Dashboard', async () => {
    const userEventSetup = userEvent.setup();
    const mockUser = {
      id: 1,
      full_name: 'Jane Doe',
      email: 'jane@bank.com',
    };
    const onSignOut = vi.fn();
    const onOpenConsole = vi.fn();

    render(
      <Homepage
        user={mockUser}
        onOpenConsole={onOpenConsole}
        onOpenLibrary={vi.fn()}
        onOpenSignIn={vi.fn()}
        onOpenSignUp={vi.fn()}
        onSignOut={onSignOut}
      />
    );

    // Desktop nav links & Launch Engine
    const mainNav = screen.getByRole('navigation', { name: /main navigation/i });
    expect(within(mainNav).getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(within(mainNav).getByRole('link', { name: 'How It Works' })).toBeInTheDocument();
    expect(within(mainNav).getByRole('link', { name: 'Security' })).toBeInTheDocument();

    const launchBtn = screen.getByRole('button', { name: /launch engine/i });
    expect(launchBtn).toBeInTheDocument();

    // User name shown in navbar avatar trigger
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();

    // Click avatar button to open dropdown
    const avatarBtn = screen.getByRole('button', { name: /user account menu for Jane Doe/i });
    expect(avatarBtn).toHaveAttribute('aria-expanded', 'false');
    await userEventSetup.click(avatarBtn);

    // Dropdown is open with only user info + Sign Out (NO Go to Dashboard)
    expect(avatarBtn).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.getByRole('menu', { name: /account options/i });
    expect(within(menu).getByText('Jane Doe')).toBeInTheDocument();
    expect(within(menu).getByText('jane@bank.com')).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /go to dashboard/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/go to dashboard/i)).not.toBeInTheDocument();

    // Escape closes dropdown and restores focus
    await userEventSetup.keyboard('{Escape}');
    expect(avatarBtn).toHaveAttribute('aria-expanded', 'false');
    expect(avatarBtn).toHaveFocus();
    await waitFor(() => {
      expect(screen.queryByRole('menu', { name: /account options/i })).not.toBeInTheDocument();
    });

    // Reopen and click Sign Out
    await userEventSetup.click(avatarBtn);
    const signOutBtn = screen.getByRole('menuitem', { name: /sign out/i });
    await userEventSetup.click(signOutBtn);
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('provides accessible mobile navigation drawer with Launch Engine, account info, Sign Out, and Escape/outside-click dismissal', async () => {
    const userEventSetup = userEvent.setup();
    const mockUser = {
      id: 2,
      full_name: 'Alex Morgan',
      email: 'alex.morgan@enterprise-bank.example.com',
    };
    const onOpenConsole = vi.fn();
    const onSignOut = vi.fn();

    render(
      <Homepage
        user={mockUser}
        onOpenConsole={onOpenConsole}
        onOpenLibrary={vi.fn()}
        onOpenSignIn={vi.fn()}
        onOpenSignUp={vi.fn()}
        onSignOut={onSignOut}
      />
    );

    const toggleBtn = screen.getByRole('button', { name: /open navigation menu/i });
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    expect(toggleBtn).toHaveAttribute('aria-controls', 'stitch-mobile-drawer');

    // Open mobile drawer
    await userEventSetup.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    const mobileNav = screen.getByRole('navigation', { name: /mobile navigation/i });
    expect(mobileNav).toBeInTheDocument();

    // Verify required links & exclusion of workspace-only links
    expect(within(mobileNav).getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(within(mobileNav).getByRole('link', { name: 'How It Works' })).toBeInTheDocument();
    expect(within(mobileNav).getByRole('link', { name: 'Security' })).toBeInTheDocument();
    expect(within(mobileNav).queryByText(/scenario library/i)).not.toBeInTheDocument();
    expect(within(mobileNav).queryByText(/evaluation history/i)).not.toBeInTheDocument();

    // Verify account info & Launch Evaluation Engine
    expect(within(mobileNav).getByText('Alex Morgan')).toBeInTheDocument();
    expect(within(mobileNav).getByText('alex.morgan@enterprise-bank.example.com')).toBeInTheDocument();

    // Escape closes drawer and restores focus
    await userEventSetup.keyboard('{Escape}');
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    expect(toggleBtn).toHaveFocus();
    await waitFor(() => {
      expect(screen.queryByRole('navigation', { name: /mobile navigation/i })).not.toBeInTheDocument();
    });

    // Reopen and click Launch Evaluation Engine
    await userEventSetup.click(toggleBtn);
    const mobileNavReopened = screen.getByRole('navigation', { name: /mobile navigation/i });
    await userEventSetup.click(within(mobileNavReopened).getByRole('button', { name: /launch evaluation engine/i }));
    expect(onOpenConsole).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByRole('navigation', { name: /mobile navigation/i })).not.toBeInTheDocument();
    });

    // Reopen and test Sign Out + outside click
    await userEventSetup.click(toggleBtn);
    await userEventSetup.click(document.body);
    await waitFor(() => {
      expect(screen.queryByRole('navigation', { name: /mobile navigation/i })).not.toBeInTheDocument();
    });

    await userEventSetup.click(toggleBtn);
    const mobileNavThird = screen.getByRole('navigation', { name: /mobile navigation/i });
    await userEventSetup.click(within(mobileNavThird).getByRole('button', { name: /sign out/i }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('keeps mobile menu and dropdown functional when prefers-reduced-motion is enabled', async () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    try {
      const userEventSetup = userEvent.setup();
      render(
        <Homepage
          user={{ id: 3, full_name: 'Sam Patel', email: 'sam@bank.com' }}
          onOpenConsole={vi.fn()}
          onOpenLibrary={vi.fn()}
          onOpenSignIn={vi.fn()}
          onOpenSignUp={vi.fn()}
          onSignOut={vi.fn()}
        />
      );

      await userEventSetup.click(screen.getByRole('button', { name: /open navigation menu/i }));
      expect(screen.getByRole('navigation', { name: /mobile navigation/i })).toBeInTheDocument();

      await userEventSetup.click(screen.getByRole('button', { name: /user account menu for Sam Patel/i }));
      expect(screen.getByRole('menu', { name: /account options/i })).toBeInTheDocument();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
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

    // Click hero "Launch Evaluation Engine"
    const startBtn = screen.getAllByRole('button', { name: /launch evaluation (engine|console)/i })[0];
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

    // Open library from footer (public/unauthenticated exploration allowed)
    await user.click(screen.getByRole('button', { name: /scenario library/i }));
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
