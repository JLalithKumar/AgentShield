import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import Icon from './Icon';
import AuthSceneFallback from './components/auth/AuthSceneFallback';
import AuthSceneErrorBoundary from './components/auth/AuthSceneErrorBoundary';
import './auth-page.css';

const LazyAuthSecurityScene = lazy(() => import('./components/auth/AuthSecurityScene'));

const EASE_OUT_EXPO = [0.22, 1, 0.36, 1];

const CAPABILITY_LABELS = [
  { id: 'validation', index: '01', label: 'Evidence Validation', position: 'top-left' },
  { id: 'regression', index: '02', label: 'Regression Detection', position: 'top-right' },
  { id: 'traceability', index: '03', label: 'Execution Traceability', position: 'bottom-left' },
  { id: 'governance', index: '04', label: 'Release Governance', position: 'bottom-right' },
];

function useMediaMatches(query, defaultValue = false) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return defaultValue;
    }
    try {
      return window.matchMedia(query).matches;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }
    let mql;
    try {
      mql = window.matchMedia(query);
    } catch {
      return undefined;
    }
    const update = () => setMatches(mql.matches);
    update();
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', update);
      return () => mql.removeEventListener('change', update);
    }
    mql.addListener?.(update);
    return () => mql.removeListener?.(update);
  }, [query]);

  return matches;
}

export default function AuthPage({
  initialMode = 'login',
  onLogin,
  onRegister,
  loading = false,
  error = '',
  explanation = '',
  onClearError,
  SceneComponent = LazyAuthSecurityScene,
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
  const loginTabRef = useRef(null);
  const registerTabRef = useRef(null);
  const submittingRef = useRef(false);
  const pointerRef = useRef({ x: 0, y: 0, active: false });

  const prefersReducedMotion = useMediaMatches('(prefers-reduced-motion: reduce)', false);
  const isDesktop = useMediaMatches('(min-width: 1024px)', true);

  useEffect(() => {
    setMode(initialMode);
    setLocalError('');
    if (onClearError) onClearError();
  }, [initialMode]);

  function switchMode(newMode, focusField = false) {
    if (newMode === mode) return;
    setMode(newMode);
    setLocalError('');
    if (onClearError) onClearError();
    if (focusField) {
      window.setTimeout(() => {
        if (newMode === 'register') {
          nameInputRef.current?.focus();
        } else {
          emailInputRef.current?.focus();
        }
      }, 60);
    }
  }

  function handleTabKeyDown(event) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const next = mode === 'login' ? 'register' : 'login';
      switchMode(next);
      const nextTab = next === 'register' ? registerTabRef.current : loginTabRef.current;
      nextTab?.focus();
    }
  }

  function handleVisualPointerMove(event) {
    if (prefersReducedMotion || !isDesktop) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    pointerRef.current.x = Math.max(-1, Math.min(1, nx));
    pointerRef.current.y = Math.max(-1, Math.min(1, ny));
    pointerRef.current.active = true;
  }

  function handleVisualPointerLeave() {
    pointerRef.current.active = false;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading || submittingRef.current) return;

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

    submittingRef.current = true;
    try {
      if (mode === 'register') {
        await onRegister(fullName.trim(), cleanEmail, password);
      } else {
        await onLogin(cleanEmail, password);
      }
    } finally {
      submittingRef.current = false;
    }
  }

  const activeError = localError || error;
  const headingTitle = mode === 'login' ? 'Welcome back.' : 'Create your account.';
  const headingDescription = mode === 'login'
    ? 'Sign in to your AgentShield workspace.'
    : 'Get started with evidence-driven AI safety evaluation.';

  return (
    <MotionConfig reducedMotion="user">
      <div className="auth-page" data-reduced-motion={prefersReducedMotion ? 'true' : 'false'}>
        {/* LEFT PANEL — INSET VISUAL EXPERIENCE (DESKTOP >= 1024px) */}
        <motion.aside
          className="auth-panel-brand"
          aria-label="AgentShield Evidence Validation Overview"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
        >
          <div
            className="auth-visual-frame"
            onPointerMove={handleVisualPointerMove}
            onPointerLeave={handleVisualPointerLeave}
          >
            {/* Subtle architectural grid & soft lighting */}
            <div className="auth-visual-backdrop" aria-hidden="true">
              <div className="auth-backdrop-grid" />
              <div className="auth-backdrop-radial" />
              <div className="auth-backdrop-ring ring-outer" />
              <div className="auth-backdrop-ring ring-inner" />
            </div>

            <div className="auth-visual-header">
              {/* Brand header */}
              <motion.div
                className="auth-brand-logo"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.38, delay: 0.06, ease: EASE_OUT_EXPO }}
              >
                <span className="auth-brand-mark-lg" aria-hidden="true">
                  <Icon name="shield" size={22} />
                </span>
                <div className="auth-brand-name-group">
                  <strong>AgentShield</strong>
                  <small>Safe Change Control for AI Agents</small>
                </div>
              </motion.div>

              {/* Editorial Hero Headline */}
              <motion.h2
                className="auth-brand-title"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.42, delay: 0.12, ease: EASE_OUT_EXPO }}
              >
                Trust every
                <span className="auth-brand-title-accent">AI agent release.</span>
              </motion.h2>

              {/* Concise Supporting Description */}
              <motion.p
                className="auth-brand-desc"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.36, delay: 0.18, ease: EASE_OUT_EXPO }}
              >
                Independent evidence validation, behavioral regression detection and controlled
                release decisions for AI agents.
              </motion.p>
            </div>

            {/* Central 3D Security Visualization — Evidence Validation Core */}
            <motion.div
              className="auth-stage-container"
              role="region"
              aria-label="AgentShield Evidence Validation Core"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.22, ease: EASE_OUT_EXPO }}
            >
              <div className="auth-stage-canvas-box">
                {isDesktop && !prefersReducedMotion ? (
                  <AuthSceneErrorBoundary variant="desktop">
                    <Suspense fallback={<AuthSceneFallback variant="desktop" reason="loading" />}>
                      <SceneComponent pointerRef={pointerRef} reducedMotion={prefersReducedMotion} />
                    </Suspense>
                  </AuthSceneErrorBoundary>
                ) : (
                  <AuthSceneFallback
                    variant="desktop"
                    reason={prefersReducedMotion ? 'reduced-motion' : 'static'}
                  />
                )}
              </div>

              {/* Architectural SVG connector lines linking capability nodes toward core */}
              <svg className="auth-capability-connectors" viewBox="0 0 560 340" aria-hidden="true" fill="none">
                <path d="M128 28 L178 28 L206 72" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" />
                <path d="M432 28 L382 28 L354 72" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" />
                <path d="M142 312 L188 312 L212 268" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" />
                <path d="M418 312 L372 312 L348 268" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" />
              </svg>

              {/* Clean architectural capability labels */}
              <ul className="auth-capability-nodes" aria-label="Core Verification Capabilities">
                {CAPABILITY_LABELS.map((item) => (
                  <li
                    key={item.id}
                    className={`auth-capability-node pos-${item.position}`}
                  >
                    <span className="auth-capability-dot" aria-hidden="true" />
                    <span className="auth-capability-index" aria-hidden="true">{item.index}</span>
                    <span className="auth-capability-text">{item.label}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Minimal Information Footer */}
            <footer className="auth-brand-footer">
              <span>Team Code Battalions · Visionet Techthon 2026</span>
            </footer>
          </div>
        </motion.aside>

        {/* RIGHT PANEL — QUIET AUTHENTICATION INTERFACE */}
        <main className="auth-panel-form">
          <div className="auth-form-wrapper">
            {/* Compact Mobile Brand Header (< 1024px) */}
            <header className="auth-mobile-header">
              <div className="auth-mobile-brand-left">
                <span className="auth-brand-mark-sm" aria-hidden="true">
                  <Icon name="shield" size={20} />
                </span>
                <div>
                  <strong>AgentShield</strong>
                  <small>Safe Change Control for AI Agents</small>
                </div>
              </div>
              <AuthSceneFallback variant="compact" />
            </header>

            {/* Interactive Heading */}
            <motion.div
              className="auth-card-heading"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.34, delay: 0.08, ease: EASE_OUT_EXPO }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
                >
                  <h1>{headingTitle}</h1>
                  <p>{headingDescription}</p>
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* Segmented Mode Tabs */}
            <motion.div
              className="auth-tabs"
              role="tablist"
              aria-label="Authentication Options"
              onKeyDown={handleTabKeyDown}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.14, ease: EASE_OUT_EXPO }}
            >
              <button
                ref={loginTabRef}
                type="button"
                role="tab"
                id="auth-tab-login"
                aria-selected={mode === 'login'}
                aria-controls="auth-credentials-panel"
                tabIndex={mode === 'login' ? 0 : -1}
                className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
                onClick={() => switchMode('login', true)}
              >
                {mode === 'login' && (
                  <motion.span
                    layoutId="auth-tab-indicator"
                    className="auth-tab-indicator"
                    transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                    aria-hidden="true"
                  />
                )}
                <span className="auth-tab-label">Sign In</span>
              </button>
              <button
                ref={registerTabRef}
                type="button"
                role="tab"
                id="auth-tab-register"
                aria-selected={mode === 'register'}
                aria-controls="auth-credentials-panel"
                tabIndex={mode === 'register' ? 0 : -1}
                className={`auth-tab-btn ${mode === 'register' ? 'active' : ''}`}
                onClick={() => switchMode('register', true)}
              >
                {mode === 'register' && (
                  <motion.span
                    layoutId="auth-tab-indicator"
                    className="auth-tab-indicator"
                    transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                    aria-hidden="true"
                  />
                )}
                <span className="auth-tab-label">Create Account</span>
              </button>
            </motion.div>

            {/* Alerts */}
            {explanation && (
              <div className="auth-alert-box auth-alert-info" role="status">
                <Icon name="command" size={17} />
                <span>{explanation}</span>
              </div>
            )}

            {activeError && (
              <div className="auth-alert-box auth-alert-error" role="alert">
                <Icon name="alert" size={17} />
                <span>{activeError}</span>
              </div>
            )}

            {/* Form (email & password stay mounted to preserve password manager compatibility) */}
            <motion.form
              id="auth-credentials-panel"
              role="tabpanel"
              aria-labelledby={mode === 'login' ? 'auth-tab-login' : 'auth-tab-register'}
              onSubmit={handleSubmit}
              noValidate
              className="auth-form-fields"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.34, delay: 0.2, ease: EASE_OUT_EXPO }}
            >
              <AnimatePresence initial={false}>
                {mode === 'register' && (
                  <motion.div
                    key="field-fullname"
                    className="auth-field-collapsible"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.24, ease: EASE_OUT_EXPO }}
                  >
                    <div className="auth-field-group">
                      <label htmlFor="auth-fullname">Full Name</label>
                      <div className="auth-input-container has-leading-icon">
                        <span className="auth-input-leading" aria-hidden="true">
                          <Icon name="user" size={17} />
                        </span>
                        <input
                          ref={nameInputRef}
                          id="auth-fullname"
                          name="name"
                          type="text"
                          required
                          autoComplete="name"
                          placeholder="Sarah Connor"
                          value={fullName}
                          onChange={e => setFullName(e.target.value)}
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="auth-field-group">
                <label htmlFor="auth-email">Work or Personal Email</label>
                <div className="auth-input-container has-leading-icon">
                  <span className="auth-input-leading" aria-hidden="true">
                    <Icon name="mail" size={17} />
                  </span>
                  <input
                    ref={emailInputRef}
                    id="auth-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="engineer@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="auth-field-group">
                <label htmlFor="auth-password">Password</label>
                <div className="auth-input-container has-leading-icon">
                  <span className="auth-input-leading" aria-hidden="true">
                    <Icon name="lock" size={17} />
                  </span>
                  <input
                    id="auth-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    placeholder={mode === 'register' ? 'At least 8 characters' : 'Enter your password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="auth-pwd-toggle"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword(prev => !prev)}
                  >
                    <Icon name={showPassword ? 'eyeOff' : 'eye'} size={17} />
                  </button>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {mode === 'register' && (
                  <motion.div
                    key="field-confirm"
                    className="auth-field-collapsible"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.24, ease: EASE_OUT_EXPO }}
                  >
                    <div className="auth-field-group">
                      <label htmlFor="auth-confirm-password">Confirm Password</label>
                      <div className="auth-input-container has-leading-icon">
                        <span className="auth-input-leading" aria-hidden="true">
                          <Icon name="lock" size={17} />
                        </span>
                        <input
                          id="auth-confirm-password"
                          name="confirm-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoComplete="new-password"
                          placeholder="Re-enter your password"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Primary CTA */}
              <motion.button
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
                whileTap={{ scale: loading ? 1 : 0.99 }}
                transition={{ duration: 0.14 }}
              >
                {loading ? (
                  <>
                    <span className="auth-spinner" aria-hidden="true" />
                    <span>{mode === 'login' ? 'Signing in…' : 'Creating account…'}</span>
                  </>
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Sign in to AgentShield' : 'Create account'}</span>
                    <Icon name="arrow" size={17} />
                  </>
                )}
              </motion.button>
            </motion.form>

            {/* Secondary Mode Switch Link */}
            <div className="auth-switch-row">
              {mode === 'login' ? (
                <span>
                  New to AgentShield?{' '}
                  <button
                    type="button"
                    className="auth-switch-link"
                    onClick={() => switchMode('register', true)}
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
                    onClick={() => switchMode('login', true)}
                  >
                    Sign in instead
                  </button>
                </span>
              )}
            </div>

            {/* Technical Security Footer */}
            <footer className="auth-security-notice">
              <p>
                <Icon name="lock" size={14} />
                <span>Protected by Argon2id password hashing and secure sessions.</span>
              </p>
            </footer>

            {/* Subtle Mobile Attribution Footer */}
            <p className="auth-mobile-attribution">
              Team Code Battalions · Visionet Techthon 2026
            </p>
          </div>
        </main>
      </div>
    </MotionConfig>
  );
}
