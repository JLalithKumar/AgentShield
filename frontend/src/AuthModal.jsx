import { useState, useEffect, useRef } from 'react';
import Icon from './Icon';
import './auth.css';

export default function AuthModal({
  isOpen,
  initialMode = 'login',
  onClose,
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

  const modalRef = useRef(null);
  const nameInputRef = useRef(null);
  const emailInputRef = useRef(null);

  useEffect(() => {
    setMode(initialMode);
    setLocalError('');
    if (onClearError) onClearError();
  }, [initialMode, isOpen]);

  useEffect(() => {
    if (isOpen) {
      const el = mode === 'register' ? nameInputRef.current : emailInputRef.current;
      el?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
      if (!fullName.trim()) {
        setLocalError('Please enter your full name.');
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
      try {
        await onRegister(fullName.trim(), cleanEmail, password);
      } catch (err) {
        // Handled via error prop
      }
    } else {
      try {
        await onLogin(cleanEmail, password);
      } catch (err) {
        // Handled via error prop
      }
    }
  }

  const activeError = localError || error;

  return (
    <div
      className="auth-modal-backdrop"
      role="presentation"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={e => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        ref={modalRef}
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <header className="auth-modal-header">
          <div className="auth-brand-mark" aria-hidden="true">
            <Icon name="shield" size={22} />
          </div>
          <div>
            <h2 id="auth-modal-title">
              {mode === 'login' ? 'Sign in to AgentShield' : 'Create AgentShield Account'}
            </h2>
            <p>
              {mode === 'login'
                ? 'Access your saved evaluations, audit traces, and release gates.'
                : 'Join Code Battalions to start validating AI agents safely.'}
            </p>
          </div>
          <button
            type="button"
            className="auth-close-btn"
            aria-label="Close authentication modal"
            onClick={onClose}
          >
            <Icon name="close" size={18} />
          </button>
        </header>

        {activeError ? (
          <div className="auth-alert" role="alert">
            <Icon name="shield" size={16} />
            <span>{activeError}</span>
          </div>
        ) : explanation ? (
          <div className="auth-alert" role="status" style={{ background: '#EFF6FF', borderColor: '#BFDBFE', color: '#1E40AF' }}>
            <Icon name="command" size={16} />
            <span>{explanation}</span>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {mode === 'register' && (
            <div className="auth-field">
              <label htmlFor="auth-name">Full name</label>
              <input
                ref={nameInputRef}
                id="auth-name"
                type="text"
                required
                autoComplete="name"
                placeholder="e.g. Sarah Connor"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="auth-email">Corporate or personal email</label>
            <input
              ref={emailInputRef}
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              placeholder="e.g. user@agentshield.ai"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="auth-field">
            <div className="auth-label-row">
              <label htmlFor="auth-password">Password</label>
              <button
                type="button"
                className="auth-toggle-pwd"
                aria-label={showPassword ? 'Hide password text' : 'Show password text'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={0}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              id="auth-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder={mode === 'register' ? 'At least 8 characters' : 'Enter your password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          {mode === 'register' && (
            <div className="auth-field">
              <label htmlFor="auth-confirm-password">Confirm password</label>
              <input
                id="auth-confirm-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          <div className="auth-actions">
            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </div>
        </form>

        <footer className="auth-modal-footer">
          {mode === 'login' ? (
            <p>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                className="auth-switch-btn"
                onClick={() => switchMode('register')}
                disabled={loading}
              >
                Sign up free
              </button>
            </p>
          ) : (
            <p>
              Already registered?{' '}
              <button
                type="button"
                className="auth-switch-btn"
                onClick={() => switchMode('login')}
                disabled={loading}
              >
                Sign in
              </button>
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}
