import { useState, useEffect, useRef } from 'react';
import Icon from './Icon';
import './auth-page.css';

export default function AuthPage({
  initialMode = 'login',
  onLogin,
  onRegister,
  loading = false,
  error = '',
  explanation = '',
  onClearError,
}) {
  const [mode, setMode] = useState(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const nameInputRef = useRef(null);
  const emailInputRef = useRef(null);

  useEffect(() => {
    setMode(initialMode);
    setLocalError('');
    if (onClearError) onClearError();
  }, [initialMode]);

  useEffect(() => {
    // Focus appropriate field when switching modes
    if (mode === 'register') {
      nameInputRef.current?.focus();
    } else {
      emailInputRef.current?.focus();
    }
  }, [mode]);

  function switchMode(newMode) {
    setMode(newMode);
    setLocalError('');
    if (onClearError) onClearError();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError('');
    if (onClearError) onClearError();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setLocalError('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setLocalError('Please enter your password.');
      return;
    }

    if (mode === 'register') {
      if (!fullName.trim() || fullName.trim().length < 2) {
        setLocalError('Please enter your full name (at least 2 characters).');
        return;
      }
      if (password.length < 8) {
        setLocalError('Password must be at least 8 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match. Please re-enter.');
        return;
      }
    }

    if (mode === 'register') {
      await onRegister(fullName.trim(), cleanEmail, password);
    } else {
      await onLogin(cleanEmail, password);
    }
  }

  const activeError = localError || error;

  return (
    <div className="auth-page">
      {/* LEFT PANEL — ENTERPRISE BRANDING & TRUST SIGNALS (DESKTOP) */}
      <aside className="auth-panel-brand" aria-label="AgentShield Platform Overview">
        <div className="auth-brand-glow" aria-hidden="true" />
        <div className="auth-brand-glow-bottom" aria-hidden="true" />

        <div className="auth-brand-top">
          <div className="auth-brand-logo">
            <span className="auth-brand-mark-lg" aria-hidden="true">
              <Icon name="shield" size={26} />
            </span>
            <div className="auth-brand-name-group">
              <strong>AgentShield</strong>
              <small>Safe Change Control for AI Agents</small>
            </div>
          </div>

          <div className="auth-brand-badge">
            <Icon name="command" size={14} />
            <span>Enterprise AI Release Governance</span>
          </div>

          <h1 className="auth-brand-title">
            Build with Confidence.{' '}
            <span>Release with Evidence.</span>
          </h1>

          <p className="auth-brand-desc">
            An enterprise safety platform that validates AI banking agents against authoritative
            evidence, detects behavioral regressions, and enforces automated release gates before
            production deployment.
          </p>

          <div className="auth-features-list">
            <div className="auth-feature-item">
              <span className="auth-feature-icon" aria-hidden="true">
                <Icon name="server" size={18} />
              </span>
              <div className="auth-feature-text">
                <strong>Evidence-Driven Validation</strong>
                <p>Cross-checks agent claims against independent banking simulator APIs to prevent silent hallucinations.</p>
              </div>
            </div>

            <div className="auth-feature-item">
              <span className="auth-feature-icon" aria-hidden="true">
                <Icon name="activity" size={18} />
              </span>
              <div className="auth-feature-text">
                <strong>Continuous Regression Testing</strong>
                <p>Detects behavioral regressions across 24 standard banking benchmark scenarios across 12 functional domains.</p>
              </div>
            </div>

            <div className="auth-feature-item">
              <span className="auth-feature-icon" aria-hidden="true">
                <Icon name="shield" size={18} />
              </span>
              <div className="auth-feature-text">
                <strong>Controlled Release Decisions</strong>
                <p>Independent Release Gate generates cryptographically reproducible ALLOW or BLOCK decisions.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-brand-footer">
          <div className="auth-stat-item">
            <strong>24</strong>
            <small>Banking Scenarios</small>
          </div>
          <div className="auth-stat-item">
            <strong>5-Stage</strong>
            <small>Safety Pipeline</small>
          </div>
          <div className="auth-stat-item">
            <strong>100%</strong>
            <small>Deterministic</small>
          </div>
          <div className="auth-stat-item">
            <strong>Visionet 2026</strong>
            <small>Techthon</small>
          </div>
        </div>
      </aside>

      {/* RIGHT PANEL — AUTHENTICATION FORM */}
      <main className="auth-panel-form">
        <div className="auth-form-wrapper">
          {/* Mobile brand header */}
          <div className="auth-mobile-header">
            <span className="auth-brand-mark-lg" aria-hidden="true">
              <Icon name="shield" size={22} />
            </span>
            <div>
              <strong>AgentShield</strong>
              <small style={{ display: 'block', color: '#64748B', fontSize: '12px' }}>
                Safe Change Control for AI Agents
              </small>
            </div>
          </div>

          <div className="auth-card-heading">
            <h1>{mode === 'login' ? 'Sign in to AgentShield' : 'Create AgentShield Account'}</h1>
            <p>
              {mode === 'login'
                ? 'Enter your credentials and complete verification to access your evaluation workspace.'
                : 'Join your engineering team to evaluate and govern AI agents safely.'}
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="auth-tabs" role="tablist" aria-label="Authentication Options">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => switchMode('login')}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              className={`auth-tab-btn ${mode === 'register' ? 'active' : ''}`}
              onClick={() => switchMode('register')}
            >
              Create Account
            </button>
          </div>

          {/* Contextual Information / Explanation Notice */}
          {explanation && (
            <div className="auth-alert-box auth-alert-info" role="status">
              <Icon name="command" size={18} />
              <span>{explanation}</span>
            </div>
          )}

          {/* Error Alert */}
          {activeError && (
            <div className="auth-alert-box auth-alert-error" role="alert">
              <Icon name="shield" size={18} />
              <span>{activeError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="auth-form-fields">
            {mode === 'register' && (
              <div className="auth-field-group">
                <label htmlFor="auth-fullname">Full Name</label>
                <div className="auth-input-container">
                  <input
                    ref={nameInputRef}
                    id="auth-fullname"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="e.g. Sarah Connor"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            <div className="auth-field-group">
              <label htmlFor="auth-email">Corporate or Personal Email</label>
              <div className="auth-input-container">
                <input
                  ref={emailInputRef}
                  id="auth-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="e.g. engineer@bank.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="auth-field-group">
              <label htmlFor="auth-password">Password</label>
              <div className="auth-input-container">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  placeholder={mode === 'register' ? 'At least 8 characters' : 'Enter password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="auth-pwd-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <Icon name="eye" size={16} />
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div className="auth-field-group">
                <label htmlFor="auth-confirm-password">Confirm Password</label>
                <div className="auth-input-container">
                  <input
                    id="auth-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              <Icon name="bolt" size={16} />
              <span>
                {loading
                  ? mode === 'login'
                    ? 'Signing in...'
                    : 'Creating account...'
                  : mode === 'login'
                    ? 'Sign In to AgentShield'
                    : 'Create AgentShield Account'}
              </span>
            </button>
          </form>

          {/* Switch Link */}
          <div className="auth-switch-row">
            {mode === 'login' ? (
              <span>
                Don't have an account yet?{' '}
                <button
                  type="button"
                  className="auth-switch-link"
                  onClick={() => switchMode('register')}
                >
                  Create one now
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  className="auth-switch-link"
                  onClick={() => switchMode('login')}
                >
                  Sign in
                </button>
              </span>
            )}
          </div>

          <div className="auth-security-notice">
            <p>
              <Icon name="shield" size={14} />
              <span>Protected by Argon2id password encryption & secure sessions.</span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
