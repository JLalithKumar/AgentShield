import { useState } from 'react';
import { createDemoRun } from './demoResults';
import './App.css';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

function tag(value, variant) {
  return <span className={`tag ${variant || 'neutral'}`}>{value}</span>;
}

function statusClass(value) {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'BLOCK' || normalized === 'BLOCKED' || normalized === 'CRITICAL' || normalized === 'FAIL') return 'danger';
  if (normalized === 'ALLOW' || normalized === 'ALLOWED' || normalized === 'PASS') return 'success';
  return 'neutral';
}

function normalizeResponse(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.results)) {
    throw new Error('The API response is missing a results array. Check docs/api-contract.md.');
  }
  return {
    ...data,
    total_tests: data.total_tests ?? data.results.length,
    passed: data.passed ?? data.results.filter((row) => row.passed === true).length,
    critical_regressions: data.critical_regressions ?? 0,
    release_decision: String(data.release_decision || 'UNKNOWN').toUpperCase(),
  };
}

export default function App() {
  const [candidate, setCandidate] = useState('v1.1');
  const [run, setRun] = useState(null);
  const [source, setSource] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const rows = run?.results || [];
  const selectedRow = rows.find((row) => row.scenario_id === selectedId) || rows[0];
  const decision = String(run?.release_decision || '').toUpperCase();
  const blocked = decision === 'BLOCK' || decision === 'BLOCKED';

  function resetForCandidate(value) {
    setCandidate(value);
    setRun(null);
    setSource(null);
    setSelectedId(null);
    setError('');
  }

  function previewDemo() {
    const sample = createDemoRun(candidate);
    setRun(sample);
    setSource('demo');
    setSelectedId(sample.results.find((row) => row.passed === false)?.scenario_id || sample.results[0].scenario_id);
    setError('');
  }

  async function runBackend() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/evaluations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseline_version: 'v1.0', candidate_version: candidate }),
      });
      if (!response.ok) throw new Error(`Backend returned HTTP ${response.status}.`);
      const data = normalizeResponse(await response.json());
      setRun(data);
      setSource('api');
      setSelectedId(data.results.find((row) => row.passed === false)?.scenario_id || data.results[0]?.scenario_id || null);
    } catch (err) {
      setError(`${err.message} The backend may not be ready yet. You can use Preview Demo to test the interface.`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">◆</div><div><strong>AgentShield</strong><span>RELEASE SAFETY</span></div></div>
        <div className="menu-label">WORKSPACE</div>
        <div className="nav-item active">▦ <span>Evaluation console</span></div>
        <div className="nav-item muted">◫ <span>Scenario library</span></div>
        <div className="nav-item muted">≋ <span>Trace explorer</span></div>
        <div className="sidebar-spacer" />
        <div className="sidebar-note"><span className="glow-dot"/> Team workspace <strong>Code Battalions</strong></div>
      </aside>

      <main className="main">
        <header className="topbar"><span>AgentShield / Evaluations</span><span className="topbar-right">Visionet Techthon 2026 <span className="top-pill">PROTOTYPE</span></span></header>
        <section className="content">
          <div className="page-heading"><div><div className="eyebrow">PRE-RELEASE VALIDATION</div><h1>Agent Evaluation Console</h1><p>Compare agent versions, inspect banking evidence, and review release decisions.</p></div><div className="environment">●&nbsp; Synthetic banking environment</div></div>

          <div className="panel controls"><div className="panel-header"><div><h2>New evaluation</h2><p>Run the same scenarios against baseline and candidate agents.</p></div><span className="muted-small">8 planned scenarios</span></div>
            <div className="form-grid"><label>Baseline agent<select value="v1.0" disabled><option value="v1.0">v1.0 – Baseline</option></select></label><label>Candidate agent<select value={candidate} onChange={(event) => resetForCandidate(event.target.value)}><option value="v1.1">v1.1 – Regression candidate</option><option value="v1.2">v1.2 – Corrected candidate</option></select></label></div>
            <div className="action-row"><button className="primary" onClick={runBackend} disabled={loading}>{loading ? 'Running evaluation…' : '▶ Run Backend Evaluation'}</button><button className="secondary" onClick={previewDemo} disabled={loading}>Preview Demo Data</button><span className="muted-small">Uses POST /api/evaluations when backend is available</span></div>
            {error && <div className="error" role="alert">{error}</div>}
          </div>

          {run ? <>
            <div className="run-meta"><div><span className="eyebrow">EVALUATION RESULT</span> <strong>{run.run_id || 'Latest run'}</strong></div>{tag(source === 'demo' ? 'DEMO DATA — NOT A LIVE EVALUATION' : 'LIVE API RESPONSE', source === 'demo' ? 'warning' : 'success')}</div>
            <div className="metrics"><div className="metric"><span>Total scenarios</span><strong>{run.total_tests}</strong><small>Required checks</small></div><div className="metric"><span>Passed</span><strong className="green">{run.passed}</strong><small>Candidate results</small></div><div className="metric"><span>Critical regressions</span><strong className={run.critical_regressions ? 'red' : 'green'}>{run.critical_regressions}</strong><small>vs baseline v1.0</small></div><div className={`metric decision ${blocked ? 'blocked' : 'allowed'}`}><span>Release decision</span><strong>{decision === 'BLOCK' ? 'BLOCKED' : decision === 'ALLOW' ? 'ALLOWED' : decision || 'UNKNOWN'}</strong><small>{blocked ? 'Candidate should not be released' : 'Review policy checks before release'}</small></div></div>
            <div className="results-layout"><div className="panel test-panel"><div className="panel-header"><div><h2>Scenario results</h2><p>Click a row to inspect evidence.</p></div><span className="muted-small">{rows.length} returned</span></div><div className="table-scroll"><table><thead><tr><th>Scenario</th><th>API evidence</th><th>Result</th></tr></thead><tbody>{rows.map((row) => {const pass = row.passed === true;const fail = row.passed === false || String(row.severity).toUpperCase() === 'CRITICAL';return <tr key={row.scenario_id} onClick={() => setSelectedId(row.scenario_id)} className={selectedRow?.scenario_id === row.scenario_id ? 'selected' : ''}><td><strong>{row.scenario_id}</strong><span>{row.scenario_name || 'Banking test case'}</span></td><td>{row.tool_status ?? '—'}</td><td>{tag(pass ? 'PASS' : fail ? 'FAIL' : 'UNKNOWN', pass ? 'success' : fail ? 'danger' : 'neutral')}</td></tr>;})}</tbody></table></div></div>
            <div className="panel trace"><div className="panel-header"><div><h2>Evidence trace</h2><p>{selectedRow?.scenario_id || 'No scenario selected'}</p></div>{selectedRow && tag(selectedRow.severity || 'N/A', statusClass(selectedRow.severity))}</div>
              {selectedRow ? <div className="trace-body"><div className="trace-label">AUTHORITATIVE API STATUS</div><div className="trace-value mono">{selectedRow.tool_status ?? 'Not supplied'}</div><div className="trace-label">AGENT CLAIM</div><div className="trace-value mono">{selectedRow.agent_claim ?? 'Not supplied'}</div><div className="trace-label">AGENT RESPONSE</div><div className="quote">{selectedRow.agent_response ?? 'Response text not included by API.'}</div><div className="trace-label">EVALUATION EXPLANATION</div><div className="trace-value">{selectedRow.reason || selectedRow.policy_violation || 'No detailed evidence was provided.'}</div>{selectedRow.policy_violation && <div className="rule">Policy: {selectedRow.policy_violation}</div>}</div> : <p className="placeholder">No scenario result was returned.</p>}
            </div></div>
            <div className="footnote">{source === 'demo' ? 'Preview results are predefined UI fixtures. Detection, regression analysis, and release gating must be implemented by the backend team.' : 'Displayed results came from your backend endpoint. Verify its evaluator and release policies before presenting them as safety guarantees.'}</div>
          </> : <div className="panel empty"><div className="empty-symbol">◇</div><h2>Ready for your first evaluation</h2><p>Use <strong>Preview Demo Data</strong> to inspect the interface now, or <strong>Run Backend Evaluation</strong> once the team's API is connected.</p></div>}
        </section>
      </main>
    </div>
  );
}
