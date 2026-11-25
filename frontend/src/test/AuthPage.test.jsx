import { lazy } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthPage from '../AuthPage';
import App from '../App';

function stubMatchMedia({ reducedMotion = false, desktop = true } = {}) {
  vi.stubGlobal('matchMedia', vi.fn((query) => ({
    matches: query.includes('prefers-reduced-motion')
      ? reducedMotion
      : query.includes('min-width: 1024px')
        ? desktop
        : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })));
}

describe('AuthPage Enterprise 3D Experience', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    stubMatchMedia({ reducedMotion: false, desktop: true });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders editorial brand identity, 4 conceptual capabilities, and Sign In form independently', () => {
    render(
      <AuthPage
        onLogin={vi.fn()}
        onRegister={vi.fn()}
      />,
    );

    expect(screen.getAllByText('AgentShield').length).toBeGreaterThan(0);
    expect(screen.getByText('Trust every')).toBeInTheDocument();
    expect(screen.getByText('AI agent release.')).toBeInTheDocument();
    expect(screen.getAllByText(/Team Code Battalions/i).length).toBeGreaterThan(0);

    // Removed outdated template clutter & metrics
    expect(screen.queryByText('Enterprise AI Release Governance')).not.toBeInTheDocument();
    expect(screen.queryByText('24')).not.toBeInTheDocument();

    // Four conceptual capabilities in accessible HTML
    expect(screen.getByText('Evidence Validation')).toBeInTheDocument();
    expect(screen.getByText('Regression Detection')).toBeInTheDocument();
    expect(screen.getByText('Execution Traceability')).toBeInTheDocument();
    expect(screen.getByText('Release Governance')).toBeInTheDocument();

    // Right panel Sign In UI
    expect(screen.getByRole('heading', { name: 'Welcome back.' })).toBeInTheDocument();
    expect(screen.getByText('Sign in to your AgentShield workspace.')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /sign in/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Sign in to AgentShield' })).toBeInTheDocument();
    expect(screen.getByText('Protected by Argon2id password hashing and secure sessions.')).toBeInTheDocument();
  });

  it('switches between Sign In and Create Account via click and keyboard arrows without unmounting email', async () => {
    const user = userEvent.setup();
    render(
      <AuthPage
        onLogin={vi.fn()}
        onRegister={vi.fn()}
      />,
    );

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'engineer@bank.com');
    expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument();

    // Keyboard navigation between tabs
    const signInTab = screen.getByRole('tab', { name: /sign in/i });
    signInTab.focus();
    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('tab', { name: /create account/i })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('heading', { name: 'Create your account.' })).toBeInTheDocument();
    expect(screen.getByText('Get started with evidence-driven AI safety evaluation.')).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^create account$/i })).toBeInTheDocument();
    // Preserves entered email across mode transition
    expect(screen.getByLabelText(/email/i)).toHaveValue('engineer@bank.com');
  });

  it('validates registration fields and blocks mismatched or short passwords', async () => {
    const user = userEvent.setup();
    const onRegister = vi.fn();

    render(
      <AuthPage
        initialMode="register"
        onLogin={vi.fn()}
        onRegister={onRegister}
      />,
    );

    await user.type(screen.getByLabelText(/full name/i), 'Alex Vance');
    await user.type(screen.getByLabelText(/email/i), 'alex@agentshield.org');
    await user.type(screen.getByLabelText(/^password/i), 'Password123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Different123!');
    await user.click(screen.getByRole('button', { name: /^create account$/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/passwords do not match/i);
    expect(onRegister).not.toHaveBeenCalled();

    // Clears confirm and checks min password length
    await user.clear(screen.getByLabelText(/^password/i));
    await user.clear(screen.getByLabelText(/confirm password/i));
    await user.type(screen.getByLabelText(/^password/i), 'short');
    await user.type(screen.getByLabelText(/confirm password/i), 'short');
    await user.click(screen.getByRole('button', { name: /^create account$/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/at least 8 characters/i);
    expect(onRegister).not.toHaveBeenCalled();
  });

  it('toggles password visibility and prevents duplicate concurrent submissions', async () => {
    const user = userEvent.setup();
    let resolveLogin;
    const onLogin = vi.fn(() => new Promise((resolve) => {
      resolveLogin = resolve;
    }));

    render(
      <AuthPage
        onLogin={onLogin}
        onRegister={vi.fn()}
      />,
    );

    const pwdInput = screen.getByLabelText(/^password/i);
    expect(pwdInput).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: /show password/i }));
    expect(pwdInput).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: /hide password/i }));
    expect(pwdInput).toHaveAttribute('type', 'password');

    await user.type(screen.getByLabelText(/email/i), 'engineer@bank.com');
    await user.type(pwdInput, 'ValidPassword123!');

    const submitBtn = screen.getByRole('button', { name: 'Sign in to AgentShield' });
    await user.click(submitBtn);
    await user.click(submitBtn);

    expect(onLogin).toHaveBeenCalledTimes(1);
    expect(onLogin).toHaveBeenCalledWith('engineer@bank.com', 'ValidPassword123!');

    resolveLogin({});
    await waitFor(() => expect(onLogin).toHaveBeenCalledTimes(1));
  });

  it('displays server errors and workspace redirect explanations clearly', () => {
    render(
      <AuthPage
        onLogin={vi.fn()}
        onRegister={vi.fn()}
        error="Invalid email or password."
        explanation="Please sign in to access your AgentShield workspace."
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password.');
    expect(screen.getByRole('status')).toHaveTextContent('Please sign in to access your AgentShield workspace.');
  });

  it('renders static SVG fallback when prefers-reduced-motion is enabled without loading WebGL', () => {
    stubMatchMedia({ reducedMotion: true, desktop: true });
    render(
      <AuthPage
        onLogin={vi.fn()}
        onRegister={vi.fn()}
      />,
    );

    const fallback = screen.getByTestId('auth-scene-fallback');
    expect(fallback).toHaveAttribute('data-fallback-reason', 'reduced-motion');
    expect(screen.queryByTestId('auth-three-canvas')).not.toBeInTheDocument();
  });

  it('falls back cleanly when WebGL is unavailable in the browser environment', async () => {
    render(
      <AuthPage
        onLogin={vi.fn()}
        onRegister={vi.fn()}
      />,
    );

    // Wait for lazy AuthSecurityScene to resolve in JSDOM (no WebGL2/WebGL context)
    await waitFor(() => {
      expect(screen.getByTestId('auth-scene-fallback')).toHaveAttribute('data-fallback-reason', 'webgl-unavailable');
    });
    expect(screen.getByRole('button', { name: 'Sign in to AgentShield' })).toBeEnabled();
  });

  it('falls back gracefully via error boundary if the lazy 3D scene fails to load or throws', async () => {
    const FailingLazyScene = lazy(() => Promise.reject(new Error('Chunk fetch failed')));
    const consoleErrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <AuthPage
        onLogin={vi.fn()}
        onRegister={vi.fn()}
        SceneComponent={FailingLazyScene}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-scene-fallback')).toHaveAttribute('data-fallback-reason', 'error-boundary');
    });
    expect(screen.getByRole('heading', { name: 'Welcome back.' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in to AgentShield' })).toBeEnabled();

    consoleErrSpy.mockRestore();
  });

  it('prioritizes the authentication form on narrow mobile screens without mounting desktop 3D canvas', () => {
    stubMatchMedia({ reducedMotion: false, desktop: false });
    const NeverLoadedDesktopScene = vi.fn(() => null);

    render(
      <AuthPage
        onLogin={vi.fn()}
        onRegister={vi.fn()}
        SceneComponent={NeverLoadedDesktopScene}
      />,
    );

    expect(NeverLoadedDesktopScene).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Welcome back.' })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('completes real login submission and transitions to protected Homepage after backend confirmation', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url) => {
      if (String(url).includes('/api/auth/login')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: 7, full_name: 'QA Security Lead', email: 'qa@bank.com' }),
        };
      }
      return { ok: true, status: 200, json: async () => [] };
    }));

    render(<App initialView="auth" initialUser={null} />);

    await user.type(screen.getByLabelText(/email/i), 'qa@bank.com');
    await user.type(screen.getByLabelText(/^password/i), 'SecurePass123!');
    await user.click(screen.getByRole('button', { name: 'Sign in to AgentShield' }));

    expect(await screen.findByRole('heading', { name: /Safe Change Control for AI Banking Agents/i })).toBeInTheDocument();
    expect(screen.getByText('QA Security Lead')).toBeInTheDocument();
  });
});
