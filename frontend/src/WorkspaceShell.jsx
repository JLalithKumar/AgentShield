import { useRef, useState } from 'react';
import Icon from './Icon';

const pages = {
  evaluations: [
    'Evaluation Console',
    'command',
    'Agent Evaluation Console',
    'Compare agent versions against baseline policies, validate banking evidence, and review automated release readiness decisions.',
    'Primary change control console for evaluating AI updates.'
  ],
  library: [
    'Scenario Library',
    'layers',
    'Scenario Library',
    'Explore 24 synthetic banking scenarios across 12 functional domains with expected agent behaviors and API outcomes.',
    'Authoritative banking test cases for regression testing.'
  ],
  trace: [
    'Trace Explorer',
    'activity',
    'Trace Explorer',
    'Inspect scenario evidence, compare agent claims against banking APIs, and view observable execution timelines.',
    'Evidence verification and regression analysis.'
  ],
  history: [
    'Evaluation History',
    'clock',
    'Evaluation History',
    'Review completed backend evaluation runs from the current browser session and inspect historical traces.',
    'Audit trail of evaluation runs.'
  ],
};

export default function WorkspaceShell({ view, navigate, historyCount, children }) {
  const [expanded, setExpanded] = useState(false);
  const toggle = useRef(null);
  const [label, , title, description] = pages[view] || pages.evaluations;

  function choose(id) {
    setExpanded(false);
    navigate(id);
  }

  return (
    <div
      className="workspace"
      onKeyDown={event => {
        if (expanded && event.key === 'Escape') {
          setExpanded(false);
          toggle.current?.focus();
        }
      }}
    >
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <aside className="sidebar" aria-label="Application navigation">
        <div className="brand-row">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              <Icon name="shield" size={26} />
            </span>
            <div>
              <strong>AgentShield</strong>
              <small>Safe Change Control</small>
            </div>
          </div>
          <button
            ref={toggle}
            type="button"
            className="menu-toggle"
            aria-label={expanded ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={expanded}
            aria-controls="sidebar-content"
            onClick={() => setExpanded(!expanded)}
          >
            <Icon name={expanded ? 'close' : 'menu'} />
          </button>
        </div>
        <div id="sidebar-content" className={`sidebar-content ${expanded ? 'expanded' : ''}`}>
          <div className="workspace-card" role="region" aria-label="Current Workspace">
            <span className="workspace-avatar" aria-hidden="true">CB</span>
            <div>
              <small>Workspace</small>
              <strong>Code Battalions</strong>
            </div>
          </div>
          <nav aria-label="Primary navigation">
            {Object.entries(pages).map(([id, [name, icon]]) => (
              <button
                key={id}
                type="button"
                onClick={() => choose(id)}
                aria-label={name}
                aria-current={id === view ? 'page' : undefined}
              >
                <Icon name={icon} size={19} aria-hidden="true" />
                <span>{name}</span>
                {id === 'history' && historyCount > 0 && (
                  <span className="nav-count" aria-label={`${historyCount} recorded runs`}>
                    {historyCount}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <footer className="sidebar-footer">
            <Icon name="building" size={20} aria-hidden="true" />
            <div>
              <strong>Visionet Techthon 2026</strong>
              <small>AI Agent Safety Platform</small>
            </div>
          </footer>
        </div>
      </aside>
      <div className="stage">
        <header className="topbar" role="banner">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Icon name="command" size={15} aria-hidden="true" />
            <span>Workspace</span>
            <Icon name="chevron" size={13} aria-hidden="true" />
            <strong aria-current="location">{label}</strong>
          </nav>
          <div className="environment" role="status" aria-label="System environment">
            <span><i aria-hidden="true" />Deterministic Mode</span>
            <span>24 Banking Scenarios</span>
          </div>
        </header>
        <main className="content" id="main-content" tabIndex={-1}>
          <header className="page-heading">
            <h1>{title}</h1>
            <p>{description}</p>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
