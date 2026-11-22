import { useRef, useState } from 'react';
import Icon from './Icon';

const pages = {
  evaluations: ['Evaluation Console', 'command', 'Agent Evaluation Console', 'Compare agent versions, validate banking evidence, and review release readiness.'],
  library: ['Scenario Library', 'layers', 'Scenario Library', 'Explore synthetic banking scenarios and expected agent behavior.'],
  trace: ['Trace Explorer', 'activity', 'Trace Explorer', 'Inspect agent responses against authoritative banking evidence.'],
  history: ['Evaluation History', 'clock', 'Evaluation History', 'Review completed backend evaluations from the current browser session.'],
};

export default function WorkspaceShell({ view, navigate, historyCount, children }) {
  const [expanded, setExpanded] = useState(false);
  const toggle = useRef(null);
  const [label, , title, description] = pages[view];
  function choose(id) {
    setExpanded(false);
    navigate(id);
  }

  return <div className="workspace" onKeyDown={event => {
    if (expanded && event.key === 'Escape') { setExpanded(false); toggle.current?.focus(); }
  }}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="sidebar">
      <div className="brand-row">
        <div className="brand"><span className="brand-mark"><Icon name="shield" size={28} /></span>
          <div><strong>AgentShield</strong><small>Agent Safety Platform</small></div>
        </div>
        <button ref={toggle} type="button" className="menu-toggle" aria-label={expanded ? 'Close navigation' : 'Open navigation'}
          aria-expanded={expanded} aria-controls="sidebar-content" onClick={() => setExpanded(!expanded)}>
          <Icon name={expanded ? 'close' : 'menu'} />
        </button>
      </div>
      <div id="sidebar-content" className={`sidebar-content ${expanded ? 'expanded' : ''}`}>
        <div className="workspace-card"><span className="workspace-avatar">CB</span><div><small>Workspace</small><strong>Code Battalions</strong></div></div>
        <nav aria-label="Primary navigation">
          {Object.entries(pages).map(([id, [name, icon]]) => <button key={id} type="button" onClick={() => choose(id)}
            aria-label={name} aria-current={id === view ? 'page' : undefined}><Icon name={icon} size={19} />{name}
            {id === 'history' && historyCount > 0 && <span className="nav-count">{historyCount}</span>}
          </button>)}
        </nav>
        <footer className="sidebar-footer"><Icon name="building" size={20} /><div><strong>Visionet Techthon 2026</strong><small>Prototype environment</small></div></footer>
      </div>
    </aside>
    <div className="stage">
      <header className="topbar">
        <div className="breadcrumb"><Icon name="command" size={15} /><span>Workspace</span><Icon name="chevron" size={13} /><strong>{label}</strong></div>
        <div className="environment"><span><i />Synthetic Environment</span><span>Prototype</span></div>
      </header>
      <main className="content" id="main-content" tabIndex={-1}>
        <div className="page-heading"><h1>{title}</h1><p>{description}</p></div>
        {children}
      </main>
    </div>
  </div>;
}
