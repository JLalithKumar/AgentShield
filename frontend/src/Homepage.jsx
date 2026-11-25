import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import Icon from './Icon';
import './homepage.css';

/**
 * Conceptual Architecture Graphic for AgentShield.
 * Replaces the static evaluation preview with a modern, high-craft,
 * responsive SVG/CSS representation of AgentShield's change-control engine.
 */
function ConceptualEngineGraphic() {
  return (
    <div className="stitch-conceptual-container" role="region" aria-label="AgentShield Safety Engine Architecture">
      <div className="stitch-conceptual-glow" aria-hidden="true" />
      <div className="stitch-conceptual-card">
        {/* Top Status Bar */}
        <div className="stitch-conceptual-header">
          <div className="stitch-con-badge-wrap">
            <span className="stitch-pulse-dot active" />
            <span className="stitch-con-badge-text">DETERMINISTIC CHANGE CONTROL · ZERO-REGRESSION ENGINE</span>
          </div>
          <div className="stitch-con-meta">
            <span className="stitch-con-pill">Scenario T002 • Failed Payment</span>
            <span className="stitch-con-pill active">Release Gate: ENFORCING</span>
          </div>
        </div>

        {/* Node Architecture Map */}
        <div className="stitch-nodes-canvas">
          {/* SVG Connection Lines */}
          <svg className="stitch-nodes-svg" aria-hidden="true" viewBox="0 0 800 360" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lineGradLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#4338CA" stopOpacity="0.7" />
              </linearGradient>
              <linearGradient id="lineGradRight" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#6366F1" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#4338CA" stopOpacity="0.7" />
              </linearGradient>
            </defs>
            <line x1="200" y1="80" x2="400" y2="180" stroke="url(#lineGradLeft)" strokeWidth="2" strokeDasharray="6 4" className="stitch-pulse-line" />
            <line x1="600" y1="80" x2="400" y2="180" stroke="url(#lineGradRight)" strokeWidth="2" strokeDasharray="6 4" className="stitch-pulse-line" />
            <line x1="200" y1="280" x2="400" y2="180" stroke="url(#lineGradLeft)" strokeWidth="2" strokeDasharray="6 4" className="stitch-pulse-line" />
            <line x1="400" y1="180" x2="600" y2="280" stroke="url(#lineGradRight)" strokeWidth="2.5" className="stitch-solid-line" />
          </svg>

          {/* Node 1: Top-Left - Observable Agent Claim */}
          <div className="stitch-node-card node-tl">
            <div className="stitch-node-header">
              <span className="stitch-node-tag">AGENT CLAIM</span>
              <span className="stitch-node-status warn">NATURAL LANGUAGE</span>
            </div>
            <div className="stitch-node-title">Candidate Agent Response</div>
            <p className="stitch-node-sub">&quot;Your transfer of $1,200.00 was completed successfully.&quot;</p>
            <div className="stitch-node-footer">
              <span className="stitch-node-pill warn">Extracted Claim: SUCCESS</span>
            </div>
          </div>

          {/* Node 2: Top-Right - Core Banking Truth */}
          <div className="stitch-node-card node-tr">
            <div className="stitch-node-header">
              <span className="stitch-node-tag">API EVIDENCE</span>
              <span className="stitch-node-status info">AUTHORITATIVE</span>
            </div>
            <div className="stitch-node-title">Banking Ledger State</div>
            <p className="stitch-node-sub"><code>{JSON.stringify({ status: "FAILED", error: "INSUFFICIENT_FUNDS" })}</code></p>
            <div className="stitch-node-footer">
              <span className="stitch-node-pill danger">Tool Result: FAILED</span>
            </div>
          </div>

          {/* Central Hub: AgentShield Invariant Engine */}
          <div className="stitch-center-node">
            <div className="stitch-center-shield-glow" aria-hidden="true" />
            <div className="stitch-center-shield">
              <Icon name="shield" size={32} />
            </div>
            <div className="stitch-center-label">AgentShield Core</div>
            <div className="stitch-center-badge">INVARIANT ENGINE</div>
          </div>

          {/* Node 3: Bottom-Left - Deterministic Policy Assertion */}
          <div className="stitch-node-card node-bl">
            <div className="stitch-node-header">
              <span className="stitch-node-tag">INVARIANT CHECK</span>
              <span className="stitch-node-status neutral">RULE T002</span>
            </div>
            <div className="stitch-node-title">Policy Invariant Verification</div>
            <p className="stitch-node-sub">PAYMENT_STATUS_MISMATCH policy check</p>
            <div className="stitch-node-footer">
              <span className="stitch-node-pill danger">Violation: Claim Mismatch</span>
            </div>
          </div>

          {/* Node 4: Bottom-Right - Autonomous Release Gate */}
          <div className="stitch-node-card node-br highlight">
            <div className="stitch-node-header">
              <span className="stitch-node-tag">RELEASE GATE</span>
              <span className="stitch-node-status danger">AUTONOMOUS</span>
            </div>
            <div className="stitch-node-title">Release Gate Decision</div>
            <div className="stitch-gate-verdict-row">
              <div className="stitch-gate-verdict danger">BLOCKED</div>
              <span className="stitch-gate-note">Halts unsafe deployment</span>
            </div>
            <div className="stitch-node-footer">
              <span className="stitch-node-pill success">v1.2 Fix: ALLOWED (24/24)</span>
            </div>
          </div>
        </div>

        {/* Conceptual Footer Bar */}
        <div className="stitch-conceptual-footer">
          <div className="stitch-cf-item">
            <Icon name="check" size={16} className="text-success" />
            <span>Zero Unverified Claims Released</span>
          </div>
          <div className="stitch-cf-item">
            <Icon name="activity" size={16} className="text-cyan" />
            <span>9-Step Observable Execution Traces</span>
          </div>
          <div className="stitch-cf-item">
            <Icon name="bolt" size={16} className="text-indigo" />
            <span>Sub-second Invariant Assessment</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Homepage({
  user,
  onOpenConsole,
  onOpenLibrary,
  onOpenHistory,
  onOpenSignIn,
  onOpenSignUp,
  onSignOut,
}) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const headerRef = useRef(null);
  const userMenuRef = useRef(null);
  const avatarBtnRef = useRef(null);
  const mobileToggleRef = useRef(null);

  // Close user dropdown menu on click outside or Escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setUserMenuOpen(false);
        avatarBtnRef.current?.focus();
      }
    }
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [userMenuOpen]);

  // Close mobile drawer on click outside or Escape key and restore focus
  useEffect(() => {
    function handleClickOutside(event) {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        setMobileMenuOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
        mobileToggleRef.current?.focus();
      }
    }
    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

  return (
    <MotionConfig reducedMotion="user">
    <div className="stitch-page">
      {/* SECTION A — STICKY ENTERPRISE NAVIGATION */}
      <header className="stitch-header" role="banner" ref={headerRef}>
        <div className="stitch-header-inner">
          {/* Brand Logo & Wordmark (Left) */}
          <div
            className="stitch-brand"
            tabIndex={0}
            role="link"
            onClick={onOpenConsole}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenConsole();
              }
            }}
          >
            <span className="stitch-brand-icon" aria-hidden="true">
              <Icon name="shield" size={22} />
            </span>
            <div className="stitch-brand-text">
              <span className="stitch-brand-name">AgentShield</span>
            </div>
          </div>

          {/* Desktop Navigation Links (Center) */}
          <nav className="stitch-nav" aria-label="Main Navigation">
            <a
              href="#"
              onClick={e => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Home
            </a>
            <a href="#how-it-works">How It Works</a>
            <a href="#security">Security</a>
          </nav>

          {/* Right Action / Auth & Profile (Right) */}
          <div className="stitch-auth-actions">
            {user ? (
              <div className="stitch-user-menu-wrapper" ref={userMenuRef}>
                <button
                  type="button"
                  className="stitch-btn-primary stitch-btn-sm stitch-launch-nav-btn"
                  onClick={onOpenConsole}
                  aria-label="Launch Engine"
                >
                  <Icon name="play" size={13} />
                  <span>Launch Engine</span>
                </button>

                {/* Accessible User Avatar Dropdown */}
                <div className="stitch-dropdown-container">
                  <button
                    ref={avatarBtnRef}
                    type="button"
                    className="stitch-avatar-btn"
                    aria-label={`User account menu for ${user.full_name || user.email}`}
                    aria-haspopup="menu"
                    aria-expanded={userMenuOpen}
                    onClick={() => setUserMenuOpen(prev => !prev)}
                  >
                    <span className="stitch-user-avatar" aria-hidden="true">
                      {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                    </span>
                    <span className="stitch-avatar-name">{user.full_name || 'User'}</span>
                    <span className={`stitch-avatar-chevron ${userMenuOpen ? 'open' : ''}`} aria-hidden="true">
                      <Icon name="chevron" size={13} />
                    </span>
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        className="stitch-account-dropdown"
                        role="menu"
                        aria-label="Account options"
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <div className="stitch-dropdown-user-info">
                          <div className="stitch-dropdown-avatar" aria-hidden="true">
                            {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div className="stitch-dropdown-meta">
                            <strong className="stitch-dropdown-name">{user.full_name || 'AgentShield User'}</strong>
                            <small className="stitch-dropdown-email">{user.email}</small>
                          </div>
                        </div>
                        <div className="stitch-dropdown-divider" role="separator" />
                        <button
                          type="button"
                          role="menuitem"
                          className="stitch-dropdown-item danger"
                          onClick={() => {
                            setUserMenuOpen(false);
                            onSignOut();
                          }}
                        >
                          <Icon name="logout" size={15} />
                          <span>Sign Out</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <div className="stitch-guest-actions">
                <button
                  type="button"
                  className="stitch-btn-ghost"
                  onClick={onOpenSignIn}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className="stitch-btn-gradient"
                  onClick={onOpenSignUp}
                >
                  Get Started
                </button>
              </div>
            )}

            {/* Accessible Mobile Hamburger Toggle */}
            <button
              ref={mobileToggleRef}
              type="button"
              className="stitch-mobile-toggle"
              aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="stitch-mobile-drawer"
              onClick={() => setMobileMenuOpen(prev => !prev)}
            >
              <Icon name={mobileMenuOpen ? 'close' : 'menu'} size={22} />
            </button>
          </div>
        </div>

        {/* Accessible Mobile Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              id="stitch-mobile-drawer"
              className="stitch-mobile-drawer"
              role="navigation"
              aria-label="Mobile Navigation"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <a
                href="#"
                className="stitch-drawer-link"
                onClick={e => {
                  e.preventDefault();
                  setMobileMenuOpen(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                Home
              </a>
              <a
                href="#how-it-works"
                className="stitch-drawer-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                How It Works
              </a>
              <a
                href="#security"
                className="stitch-drawer-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                Security
              </a>

              <div className="stitch-mobile-auth">
                <button
                  type="button"
                  className="stitch-btn-primary stitch-mobile-launch-btn w-full"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenConsole();
                  }}
                >
                  <Icon name="play" size={15} />
                  <span>Launch Evaluation Engine</span>
                </button>

                {user ? (
                  <div className="stitch-mobile-user-card">
                    <div className="stitch-dropdown-user-info">
                      <div className="stitch-dropdown-avatar" aria-hidden="true">
                        {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="stitch-dropdown-meta">
                        <strong className="stitch-dropdown-name">{user.full_name || 'AgentShield User'}</strong>
                        <small className="stitch-dropdown-email">{user.email}</small>
                      </div>
                    </div>
                    <div className="stitch-dropdown-divider" role="separator" />
                    <button
                      type="button"
                      className="stitch-dropdown-item danger w-full"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onSignOut();
                      }}
                    >
                      <Icon name="logout" size={15} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                ) : (
                  <div className="stitch-mobile-guest-btns">
                    <button
                      type="button"
                      className="stitch-btn-ghost stitch-mobile-auth-btn w-full"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenSignIn();
                      }}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      className="stitch-btn-gradient stitch-mobile-auth-btn w-full"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenSignUp();
                      }}
                    >
                      Get Started
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="stitch-main">
        {/* SECTION B — PREMIUM HERO */}
        <section className="stitch-hero" aria-label="Hero Section">
          <div className="stitch-ambient-glow" aria-hidden="true" />

          <div className="stitch-hero-content">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Editorial Hero Heading */}
              <h1 className="stitch-hero-title">
                Ship Safer AI Agents.{' '}
                <span className="stitch-gradient-text">With Evidence.</span>
              </h1>

              {/* Accessible Subheading for Screen Readers */}
              <h2 className="sr-only">Safe Change Control for AI Banking Agents</h2>

              {/* Supporting Copy */}
              <p className="stitch-hero-lead">
                AgentShield helps engineering, quality assurance, and governance teams detect unsafe AI agent updates, validate behavior against trusted evidence, and make informed release decisions.
              </p>

              {/* Clean Single Primary CTA + Discovery Link */}
              <div className="stitch-hero-cta">
                <button
                  type="button"
                  className="stitch-btn-primary stitch-btn-lg"
                  onClick={onOpenConsole}
                  aria-label="Launch Evaluation Engine"
                >
                  <Icon name="bolt" size={18} />
                  <span>Launch Evaluation Engine</span>
                  <Icon name="arrow" size={15} />
                </button>

                <a href="#how-it-works" className="stitch-hero-secondary-link">
                  <span>Discover How It Works</span>
                  <Icon name="arrow" size={15} />
                </a>
              </div>
            </motion.div>

            {/* SECTION C — Clean Conceptual Engine Visual */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            >
              <ConceptualEngineGraphic />
            </motion.div>
          </div>
        </section>

        {/* SECTION D — PRODUCT CAPABILITIES STRIP */}
        <section className="stitch-strip-section" aria-label="Capabilities and Architecture">
          <div className="stitch-container">
            {/* Tech Stack Trust Row */}
            <div className="stitch-tech-row">
              <span className="stitch-tech-title">Architecture Stack:</span>
              <div className="stitch-tech-tags">
                <span className="stitch-tech-tag"><Icon name="bolt" size={14} /> FastAPI Engine</span>
                <span className="stitch-tech-tag"><Icon name="database" size={14} /> PostgreSQL 16</span>
                <span className="stitch-tech-tag"><Icon name="layers" size={14} /> React 19 + Vite</span>
                <span className="stitch-tech-tag"><Icon name="box" size={14} /> Docker Compose</span>
                <span className="stitch-tech-tag"><Icon name="cpu" size={14} /> Ollama / Qwen Ready</span>
                <span className="stitch-tech-tag"><Icon name="shield" size={14} /> Zero-Trust Gate</span>
              </div>
            </div>

            {/* 4 Truthful Stat Tiles */}
            <div className="stitch-stats-grid">
              <div className="stitch-stat-card">
                <span className="stitch-stat-number text-cyan">24</span>
                <span className="stitch-stat-label">Synthetic Banking Cases</span>
                <p className="stitch-stat-desc">Fixed deterministic test cases covering payments, limits, overdrafts, and card security.</p>
              </div>

              <div className="stitch-stat-card">
                <span className="stitch-stat-number text-indigo">5-Stage</span>
                <span className="stitch-stat-label">Evaluation Workflow</span>
                <p className="stitch-stat-desc">From scenario dispatch to tool verification, trace recording, and binary release decisions.</p>
              </div>

              <div className="stitch-stat-card">
                <span className="stitch-stat-number text-indigo">100%</span>
                <span className="stitch-stat-label">Evidence Validation</span>
                <p className="stitch-stat-desc">Independent cross-checking of natural-language agent claims against authoritative tool results.</p>
              </div>

              <div className="stitch-stat-card">
                <span className="stitch-stat-number text-cyan">Diff</span>
                <span className="stitch-stat-label">Regression Engine</span>
                <p className="stitch-stat-desc">Pinpoint net-new safety violations and behavioral drift between baseline and candidate.</p>
              </div>
            </div>

            {/* 5-Stage Pipeline Process Strip */}
            <div id="how-it-works" className="stitch-pipeline-strip">
              <div className="stitch-pipeline-header">
                <span className="stitch-badge-pill">AUTOMATED RELEASE CONTROL</span>
                <h3 className="stitch-pipeline-title">The 5-Stage Evaluation Pipeline</h3>
                <p className="stitch-pipeline-subtitle">Every agent candidate is rigorously evaluated through five deterministic phases before release.</p>
              </div>
              <div className="stitch-pipeline-steps">
                <div className="stitch-step-item">
                  <div className="stitch-step-num">01</div>
                  <strong>24 Synthetic Scenarios</strong>
                  <p>Execute fixed banking cases covering payments, overdrafts, daily limits, and card locks.</p>
                </div>
                <div className="stitch-step-item">
                  <div className="stitch-step-num">02</div>
                  <strong>Record 9 Observable Steps</strong>
                  <p>Capture full lifecycle events: trigger, prompt, input, tool dispatch, raw response, extraction, claim, verification, decision.</p>
                </div>
                <div className="stitch-step-item">
                  <div className="stitch-step-num">03</div>
                  <strong>Validate Against Tools</strong>
                  <p>An independent safety engine cross-checks agent assertions against actual tool responses.</p>
                </div>
                <div className="stitch-step-item">
                  <div className="stitch-step-num">04</div>
                  <strong>Version Regression Engine</strong>
                  <p>Compare baseline v1.0 against candidate runs to isolate net-new safety violations.</p>
                </div>
                <div className="stitch-step-item">
                  <div className="stitch-step-num">05</div>
                  <strong>Automated Release Gate</strong>
                  <p>Binary decision: ALLOW release with 0 regressions, or BLOCK candidate with full audit evidence.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION E — THE PROBLEM & COMPARISON */}
        <section id="comparison" className="stitch-section" aria-labelledby="comparison-heading">
          <div className="stitch-container">
            <div className="stitch-section-header text-center">
              <div className="stitch-badge-pill">CHANGE CONTROL EVOLUTION</div>
              <h2 id="comparison-heading" className="stitch-section-title">
                From Manual AI Testing to Evidence-Based Release Control
              </h2>
              <p className="stitch-section-desc">
                Why Financial AI Agents Fail Silently in Production: Ditch subjective chat spot-checks and unmonitored prompt updates. Switch to automated, deterministic change control.
              </p>
              <h3 className="sr-only">Why Financial AI Agents Fail Silently in Production</h3>
            </div>

            <div className="stitch-comparison-grid">
              {/* Left Card: Without AgentShield */}
              <div className="stitch-compare-card legacy">
                <div className="stitch-compare-header">
                  <div className="stitch-compare-title-row">
                    <div className="stitch-compare-icon-box danger">
                      <Icon name="close" size={20} />
                    </div>
                    <div>
                      <h3 className="stitch-compare-title">Without AgentShield</h3>
                      <p className="stitch-compare-subtitle">Manual QA Friction &amp; Blind Regressions</p>
                    </div>
                  </div>
                  <span className="stitch-chip danger">LEGACY QA</span>
                </div>

                <ul className="stitch-compare-list">
                  <li>
                    <span className="stitch-list-icon danger"><Icon name="close" size={16} /></span>
                    <div>
                      <strong>Manual retesting after agent changes</strong>
                      <p>Engineers spot-check conversations by hand, missing silent failure modes in edge banking cases.</p>
                    </div>
                  </li>
                  <li>
                    <span className="stitch-list-icon danger"><Icon name="close" size={16} /></span>
                    <div>
                      <strong>Difficult-to-reproduce failures</strong>
                      <p>Stochastic LLM responses make replicating claims and identifying regressions notoriously inconsistent.</p>
                    </div>
                  </li>
                  <li>
                    <span className="stitch-list-icon danger"><Icon name="close" size={16} /></span>
                    <div>
                      <strong>Overreliance on text-matching checks</strong>
                      <p>Brittle string assertions break whenever phrasing changes, yet fail to catch hallucinated successes.</p>
                    </div>
                  </li>
                  <li>
                    <span className="stitch-list-icon danger"><Icon name="close" size={16} /></span>
                    <div>
                      <strong>Limited comparison between versions</strong>
                      <p>No systematic baseline diffing to verify whether a prompt fix quietly broke 4 other banking workflows.</p>
                    </div>
                  </li>
                  <li>
                    <span className="stitch-list-icon danger"><Icon name="close" size={16} /></span>
                    <div>
                      <strong>Unclear release-readiness decisions</strong>
                      <p>Releases proceed based on subjective confidence rather than quantitative evidence and hard policy criteria.</p>
                    </div>
                  </li>
                </ul>

                <div className="stitch-compare-footer danger">
                  <span>Release Decision Basis</span>
                  <strong>Subjective &amp; High Risk</strong>
                </div>
              </div>

              {/* Right Card: With AgentShield */}
              <div className="stitch-compare-card active">
                <div className="stitch-compare-header">
                  <div className="stitch-compare-title-row">
                    <div className="stitch-compare-icon-box primary">
                      <Icon name="shield" size={20} />
                    </div>
                    <div>
                      <h3 className="stitch-compare-title">With AgentShield</h3>
                      <p className="stitch-compare-subtitle">Evidence-Based Safe Change Control</p>
                    </div>
                  </div>
                  <span className="stitch-chip cyan">EVIDENCE-FIRST</span>
                </div>

                <ul className="stitch-compare-list">
                  <li>
                    <span className="stitch-list-icon success"><Icon name="check" size={16} /></span>
                    <div>
                      <strong>Fixed, repeatable banking scenarios</strong>
                      <p>24 deterministic test cases covering payments, overdrafts, daily limits, and card locks.</p>
                    </div>
                  </li>
                  <li>
                    <span className="stitch-list-icon success"><Icon name="check" size={16} /></span>
                    <div>
                      <strong>Observable execution traces</strong>
                      <p>Full 9-step lifecycle recording: triggers, prompts, tools, raw payloads, claims, and policy verdicts.</p>
                    </div>
                  </li>
                  <li>
                    <span className="stitch-list-icon success"><Icon name="check" size={16} /></span>
                    <div>
                      <strong>Agent claims checked against API evidence</strong>
                      <p>An independent safety engine verifies natural language claims against authoritative banking tool outputs.</p>
                    </div>
                  </li>
                  <li>
                    <span className="stitch-list-icon success"><Icon name="check" size={16} /></span>
                    <div>
                      <strong>Baseline/candidate regression detection</strong>
                      <p>Automated comparative diff engine highlights net-new violations introduced by the candidate version.</p>
                    </div>
                  </li>
                  <li>
                    <span className="stitch-list-icon success"><Icon name="check" size={16} /></span>
                    <div>
                      <strong>Explicit ALLOW/BLOCK assessment</strong>
                      <p>Binary release gate: ALLOW when 24/24 pass with 0 regressions, or BLOCK with complete audit evidence.</p>
                    </div>
                  </li>
                </ul>

                <div className="stitch-compare-footer success">
                  <span>Release Decision Basis</span>
                  <strong>Deterministic &amp; Audit-Ready</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION F — CORE CAPABILITIES (BENTO GRID) */}
        <section id="features" className="stitch-section stitch-bg-alt" aria-labelledby="features-heading">
          <div className="stitch-container">
            <div className="stitch-section-header text-center">
              <div className="stitch-badge-pill">CORE CAPABILITIES</div>
              <h2 id="features-heading" className="stitch-section-title">
                Engineered for Trustworthy AI Agent Changes
              </h2>
              <p className="stitch-section-desc">
                Every layer of the evaluation pipeline is designed for auditability and zero-trust safety verification.
              </p>
            </div>

            <div className="stitch-bento-grid">
              {/* Feature 1: Evidence-Based Safety Evaluation */}
              <div className="stitch-bento-card col-7">
                <div className="stitch-bento-header">
                  <div className="stitch-icon-badge indigo">
                    <Icon name="shield" size={22} />
                  </div>
                  <h3 className="stitch-bento-title">Evidence-Based Safety Evaluation</h3>
                  <p className="stitch-bento-desc">
                    Validate the agent&apos;s natural-language claims against actual observed tool results. Prevent subtle hallucinations from confirming failed transactions.
                  </p>
                </div>
                <div className="stitch-terminal-mockup">
                  <div className="stitch-terminal-bar">
                    <div className="stitch-terminal-dots">
                      <span /><span /><span />
                    </div>
                    <span className="stitch-terminal-title">agentshield-evaluator :: T002</span>
                    <span className="stitch-terminal-status text-cyan">● live proof</span>
                  </div>
                  <div className="stitch-terminal-body">
                    <p className="text-secondary">$ agentshield verify-evidence --candidate v1.1</p>
                    <p className="text-cyan mt-1">✔ Dispatching banking tool: payment_transfer(amount=1200.00)</p>
                    <p className="text-slate">&rarr; API Result: {JSON.stringify({ status: "FAILED", error: "INSUFFICIENT_FUNDS" })}</p>
                    <p className="text-danger mt-1">&cross; Agent Assertion: &quot;Transfer completed successfully!&quot;</p>
                    <p className="text-danger font-bold">&rarr; Violation: Tool FAILED vs Agent SUCCESS =&gt; Gate: BLOCKED</p>
                  </div>
                </div>
              </div>

              {/* Feature 2: Version Regression Detection */}
              <div className="stitch-bento-card col-5">
                <div className="stitch-bento-header">
                  <div className="stitch-icon-badge cyan">
                    <Icon name="activity" size={22} />
                  </div>
                  <h3 className="stitch-bento-title">Version Regression Detection</h3>
                  <p className="stitch-bento-desc">
                    Compare baseline and candidate behavior across identical scenarios to identify safety drift.
                  </p>
                </div>
                <div className="stitch-regression-visual">
                  <div className="stitch-diff-row">
                    <span className="stitch-diff-label">Baseline v1.0</span>
                    <span className="stitch-chip neutral">24/24 PASS</span>
                  </div>
                  <div className="stitch-diff-row danger">
                    <span className="stitch-diff-label">Candidate v1.1</span>
                    <span className="stitch-chip danger">23/24 (+1 REGRESSION)</span>
                  </div>
                  <div className="stitch-diff-row success">
                    <span className="stitch-diff-label">Candidate v1.2</span>
                    <span className="stitch-chip success">24/24 (0 REGRESSIONS)</span>
                  </div>
                </div>
              </div>

              {/* Feature 3: Execution Trace Explorer */}
              <div className="stitch-bento-card col-4">
                <div className="stitch-icon-badge indigo">
                  <Icon name="layers" size={22} />
                </div>
                <h3 className="stitch-bento-title">Execution Trace Explorer</h3>
                <p className="stitch-bento-desc">
                  Understand exactly what the agent did, what tools returned, and why a policy passed or failed across all 9 lifecycle steps.
                </p>
              </div>

              {/* Feature 4: Deterministic Release Gate */}
              <div className="stitch-bento-card col-4">
                <div className="stitch-icon-badge cyan">
                  <Icon name="command" size={22} />
                </div>
                <h3 className="stitch-bento-title">Deterministic Release Gate</h3>
                <p className="stitch-bento-desc">
                  Produce definitive ALLOW / BLOCK decisions based on zero-tolerance rules for financial safety violations.
                </p>
              </div>

              {/* Feature 5: Persistent Evaluation History */}
              <div className="stitch-bento-card col-4">
                <div className="stitch-icon-badge indigo">
                  <Icon name="clock" size={22} />
                </div>
                <h3 className="stitch-bento-title">Persistent Evaluation History</h3>
                <p className="stitch-bento-desc">
                  Authenticated users revisit stored evaluation records with strict user ownership boundaries and zero cross-tenant leak.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION G — TARGET USERS & PERSONAS */}
        <section id="personas" className="stitch-section" aria-labelledby="personas-heading">
          <div className="stitch-container">
            <div className="stitch-section-header text-center">
              <div className="stitch-badge-pill">ROLE-BASED GOVERNANCE</div>
              <h2 id="personas-heading" className="stitch-section-title">
                Built for Teams Responsible for AI Reliability
              </h2>
              <p className="stitch-section-desc">
                Built for Cross-Functional AI Governance: Align developers, QA testers, release managers, and compliance officers around verifiable evidence.
              </p>
              <h3 className="sr-only">Built for Cross-Functional AI Governance</h3>
            </div>

            <div className="stitch-personas-grid">
              <div className="stitch-persona-card">
                <div className="stitch-persona-badge">QA Engineers</div>
                <h3 className="stitch-persona-title">Automated Regression Suites</h3>
                <p className="stitch-persona-desc">
                  Run repeatable 24-scenario test suites on every pull request to catch subtle claim shifts before human review or staging deployments.
                </p>
                <div className="stitch-persona-metric">
                  <span>Primary Value</span>
                  <strong>Deterministic Pass/Fail Testing</strong>
                </div>
              </div>

              <div className="stitch-persona-card">
                <div className="stitch-persona-badge">AI / Prompt Engineers</div>
                <h3 className="stitch-persona-title">Prompt &amp; Model Debugging</h3>
                <p className="stitch-persona-desc">
                  Isolate tool-calling hallucinations, compare candidate prompt versions against baseline traces, and pinpoint exact claim mismatches.
                </p>
                <div className="stitch-persona-metric">
                  <span>Primary Value</span>
                  <strong>Trace-Level Root Cause Analysis</strong>
                </div>
              </div>

              <div className="stitch-persona-card">
                <div className="stitch-persona-badge">Release Managers</div>
                <h3 className="stitch-persona-title">Binary Release Gates</h3>
                <p className="stitch-persona-desc">
                  Make confident shipping decisions backed by un-bypassable ALLOW / BLOCK determinations, zero critical regressions, and quantitative pass rates.
                </p>
                <div className="stitch-persona-metric">
                  <span>Primary Value</span>
                  <strong>Definitive Release Decisions</strong>
                </div>
              </div>

              <div className="stitch-persona-card">
                <div className="stitch-persona-badge">Compliance &amp; Risk</div>
                <h3 className="stitch-persona-title">Regulatory Audit Proof</h3>
                <p className="stitch-persona-desc">
                  Inspect cryptographic and persistent audit trails proving that customer-facing agents strictly adhere to financial disclosure laws.
                </p>
                <div className="stitch-persona-metric">
                  <span>Primary Value</span>
                  <strong>Auditable Safety Evidence</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION H — SECURITY AND ARCHITECTURE */}
        <section id="security" className="stitch-section stitch-bg-alt" aria-labelledby="security-heading">
          <div className="stitch-container">
            <div className="stitch-section-header text-center">
              <div className="stitch-badge-pill">ZERO-TRUST FOUNDATION</div>
              <h2 id="security-heading" className="stitch-section-title">
                Enterprise Architecture &amp; Security
              </h2>
              <p className="stitch-section-desc">
                Designed with banking-grade security principles, strict network isolation, and comprehensive data protection.
              </p>
            </div>

            <div className="stitch-security-grid">
              <div className="stitch-security-card">
                <div className="stitch-sec-icon"><Icon name="shield" size={20} /></div>
                <h4>Backend-Verified Authentication</h4>
                <p>Argon2id password hashing, cryptographically random opaque session tokens in HttpOnly cookies, and CSRF defense.</p>
              </div>

              <div className="stitch-security-card">
                <div className="stitch-sec-icon"><Icon name="lock" size={20} /></div>
                <h4>Protected Evaluation APIs</h4>
                <p>Strict endpoint authentication, role enforcement, and IDOR protection preventing cross-user evaluation tampering.</p>
              </div>

              <div className="stitch-security-card">
                <div className="stitch-sec-icon"><Icon name="database" size={20} /></div>
                <h4>PostgreSQL Persistence</h4>
                <p>Robust relational persistence via SQLAlchemy with automated migrations and local zero-config SQLite dual support.</p>
              </div>

              <div className="stitch-security-card">
                <div className="stitch-sec-icon"><Icon name="user" size={20} /></div>
                <h4>Evaluation Ownership Isolation</h4>
                <p>User-specific evaluation runs and saved evidence traces are strictly partitioned by authenticated tenant ID.</p>
              </div>

              <div className="stitch-security-card">
                <div className="stitch-sec-icon"><Icon name="box" size={20} /></div>
                <h4>Docker &amp; Render Cloud Deployment</h4>
                <p>Zero-dependency architecture with Nginx reverse proxying to FastAPI, supporting Render web services and Neon DB.</p>
              </div>

              <div className="stitch-security-card">
                <div className="stitch-sec-icon"><Icon name="check" size={20} /></div>
                <h4>Synthetic Banking Data</h4>
                <p>100% synthetic, non-custodial test cases with mock accounts and zero real PII or live banking credentials stored.</p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION I — FREQUENTLY ASKED QUESTIONS */}
        <section id="faq" className="stitch-section" aria-labelledby="faq-heading">
          <div className="stitch-container max-w-4xl">
            <div className="stitch-section-header text-center">
              <div className="stitch-badge-pill">COMMON QUESTIONS</div>
              <h2 id="faq-heading" className="stitch-section-title">
                Frequently Asked Questions
              </h2>
              <p className="stitch-section-desc">
                Everything you need to know about AgentShield&apos;s evaluation mechanics, data safety, and architecture.
              </p>
            </div>

            <div className="stitch-faq-list">
              <details className="stitch-faq-item">
                <summary>
                  <span>What does AgentShield test?</span>
                  <Icon name="arrow" size={16} className="stitch-faq-icon" />
                </summary>
                <div className="stitch-faq-body">
                  AgentShield tests conversational AI banking agents across 24 fixed, reproducible scenarios covering payments, card lockouts, overdrafts, daily transfer limits, and dispute filings. It verifies that natural-language agent claims truthfully match core banking API outputs.
                </div>
              </details>

              <details className="stitch-faq-item">
                <summary>
                  <span>How is AgentShield different from basic string-matching tests?</span>
                  <Icon name="arrow" size={16} className="stitch-faq-icon" />
                </summary>
                <div className="stitch-faq-body">
                  Traditional string-matching tests check if an agent&apos;s output contains specific words, which breaks whenever phrasing changes. AgentShield executes actual banking tools, extracts structured claims (e.g. SUCCESS vs FAILED) from agent responses, and evaluates them with an independent rule-based safety engine against authoritative tool evidence.
                </div>
              </details>

              <details className="stitch-faq-item">
                <summary>
                  <span>Does AgentShield use real banking customer data?</span>
                  <Icon name="arrow" size={16} className="stitch-faq-icon" />
                </summary>
                <div className="stitch-faq-body">
                  No. AgentShield strictly uses 24 synthetic banking scenarios with mock customer IDs, simulated account balances, and non-custodial transactions. No real customer data, real bank accounts, or real funds are ever touched.
                </div>
              </details>

              <details className="stitch-faq-item">
                <summary>
                  <span>What happens when a critical regression is detected?</span>
                  <Icon name="arrow" size={16} className="stitch-faq-icon" />
                </summary>
                <div className="stitch-faq-body">
                  If any candidate update introduces a new policy violation (such as falsely claiming a failed payment succeeded, as in Candidate v1.1 on Scenario T002), the release gate immediately issues a BLOCKED verdict, tags the critical violation, and preserves the execution trace for engineering analysis.
                </div>
              </details>

              <details className="stitch-faq-item">
                <summary>
                  <span>Can I review past evaluation results?</span>
                  <Icon name="arrow" size={16} className="stitch-faq-icon" />
                </summary>
                <div className="stitch-faq-body">
                  Yes. Authenticated users have access to Evaluation History, which stores past evaluation runs, pass/fail counts, release verdicts, and full scenario traces in PostgreSQL (or SQLite).
                </div>
              </details>

              <details className="stitch-faq-item">
                <summary>
                  <span>Can AgentShield run without Ollama?</span>
                  <Icon name="arrow" size={16} className="stitch-faq-icon" />
                </summary>
                <div className="stitch-faq-body">
                  Yes. AgentShield runs out of the box in deterministic mode (<code>AGENTSHIELD_LIVE_LLM=false</code>) without requiring any external LLM downloads or GPU hardware. When Ollama is available, you can optionally connect a live Qwen model for stochastic testing.
                </div>
              </details>
            </div>
          </div>
        </section>

        {/* SECTION J — FINAL CTA BANNER */}
        <section className="stitch-final-cta-section" aria-label="Final Call to Action">
          <div className="stitch-container">
            <div className="stitch-final-cta-card">
              <div className="stitch-final-cta-glow" aria-hidden="true" />
              <div className="stitch-final-cta-content">
                <div className="stitch-badge-pill white">START EVALUATING TODAY</div>
                <h2 className="stitch-final-cta-title">
                  Make Every AI Agent Update Safer to Release.
                </h2>
                <p className="stitch-final-cta-desc">
                  Evaluate agent changes, validate behavior against evidence, and identify release risks before deployment.
                </p>
                <div className="stitch-final-cta-actions">
                  <button
                    type="button"
                    className="stitch-btn-cta-primary"
                    onClick={onOpenConsole}
                    aria-label="Launch Evaluation Engine"
                  >
                    <span>Launch Evaluation Engine</span>
                    <Icon name="arrow" size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* SECTION K — FOOTER */}
      <footer className="stitch-footer" role="contentinfo">
        <div className="stitch-container">
          <div className="stitch-footer-grid">
            {/* Brand Col */}
            <div className="stitch-footer-brand-col">
              <div className="stitch-brand">
                <span className="stitch-brand-icon" aria-hidden="true">
                  <Icon name="shield" size={20} />
                </span>
                <span className="stitch-brand-name">AgentShield</span>
              </div>
              <p className="stitch-footer-tagline">
                Safe Change Control for AI Agents in Regulated Financial Environments.
              </p>
              <div className="stitch-footer-pill">
                <span className="stitch-pill-pulse green" />
                <span>Deterministic Safety Engine • Verified</span>
              </div>
            </div>

            {/* Links Col 1: Product */}
            <div className="stitch-footer-col">
              <h4>Product</h4>
              <button type="button" className="stitch-footer-link" onClick={onOpenConsole}>Evaluation Console</button>
              <button type="button" className="stitch-footer-link" onClick={onOpenLibrary}>Scenario Library</button>
              <button type="button" className="stitch-footer-link" onClick={onOpenHistory || onOpenConsole}>Evaluation History</button>
              <a href="#how-it-works">5-Stage Pipeline</a>
              <a href="#features">Capabilities</a>
              <a href="#comparison">Why AgentShield</a>
            </div>

            {/* Links Col 2: Governance */}
            <div className="stitch-footer-col">
              <h4>Governance</h4>
              <a href="#comparison">Risk Prevention</a>
              <a href="#personas">Compliance Audit</a>
              <a href="#security">Architecture</a>
              <a href="#features">Release Gate</a>
            </div>

            {/* Links Col 3: Disclosures */}
            <div className="stitch-footer-col">
              <h4>Disclosures</h4>
              <span>Synthetic Banking Data</span>
              <span>Deterministic Mode</span>
              <span>Zero PII Stored</span>
              <span>Visionet Techthon 2026</span>
            </div>
          </div>

          <div className="stitch-footer-bottom">
            <p>
              &copy; 2026 AgentShield • Developed by Team Code Battalions for Visionet Techthon 2026.
            </p>
            <p className="stitch-footer-disclaimer">
              All simulated banking transactions, accounts, and balance records are synthetic and non-custodial.
            </p>
          </div>
        </div>
      </footer>
    </div>
    </MotionConfig>
  );
}
