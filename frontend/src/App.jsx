import { useState } from 'react';
import { SCENARIOS, createDemoRun } from './demoResults';
import './App.css';
const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
const VIEWS = [
  { id: 'evaluations', icon: '▦', title: 'Evaluation console' },
  { id: 'library', icon: '◫', title: 'Scenario library' },
  { id: 'trace', icon: '≋', title: 'Trace explorer' },
  { id: 'history', icon: '◷', title: 'Evaluation history' },
];
function tag(value, variant = 'neutral') {
  return <span className={`tag ${variant}`}>{value}</span>;
}
function statusClass(value) {
  const normalized = String(value || '').toUpperCase();
  if (['BLOCK', 'BLOCKED', 'CRITICAL', 'FAIL'].includes(normalized)) return 'danger';
  if (['ALLOW', 'ALLOWED', 'PASS'].includes(normalized)) return 'success';
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
function TraceDetails({ row }) {
  if (!row) return <p className="placeholder">No scenario result was returned.</p>;
  return (
    <div className="trace-body">
      <div className="trace-label">AUTHORITATIVE API STATUS</div>
      <div className="trace-value mono">{row.tool_status ?? 'Not supplied'}</div>
      <div className="trace-label">AGENT CLAIM</div>
      <div className="trace-value mono">{row.agent_claim ?? 'Not supplied'}</div>
      <div className="trace-label">AGENT RESPONSE</div>
      <div className="quote">{row.agent_response ?? 'Response text not included by API.'}</div>
      <div className="trace-label">EVALUATION EXPLANATION</div>
      <div className="trace-value">{row.reason || row.policy_violation || 'No detailed evidence was provided.'}</div>
      {row.policy_violation && <div className="rule">Policy: {row.policy_violation}</div>}
      <div className="trace-label">BASELINE → CANDIDATE REGRESSION</div>
      <div className="trace-value">{row.is_new_regression === true ? 'New regression detected' : row.is_new_regression === false ? 'No new regression identified' : 'Not reported by this run'}</div>
    </div>
  );
}
export default function App() {
  const [view, setView] = useState('evaluations');
  const [candidate, setCandidate] = useState('v1.1');
  const [run, setRun] = useState(null);
  const [source, setSource] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [catalogSelectedId, setCatalogSelectedId] = useState('T002');
  const [historyRuns, setHistoryRuns] = useState([]);
  const rows = run?.results || [];
  const selectedRow = rows.find((row) => row.scenario_id === selectedId) || rows[0];
  const catalogSelected = SCENARIOS.find((item) => item.scenario_id === catalogSelectedId) || SCENARIOS[0];
  const visibleScenarios = SCENARIOS.filter((scenario) => {
    const matchesText = `${scenario.scenario_id} ${scenario.scenario_name} ${scenario.tool_status} ${scenario.safe_reply}`
      .toLowerCase().includes(query.trim().toLowerCase());
    return matchesText && (statusFilter === 'ALL' || scenario.tool_status === statusFilter);
  });
  const decision = String(run?.release_decision || '').toUpperCase();
  const blocked = decision === 'BLOCK' || decision === 'BLOCKED';
  function resetForCandidate(value) {
    setCandidate(value);
    setRun(null);
    setSource(null);
    setSelectedId(null);
    setError('');
  }
  function previewDemo(targetId = null) {
    const sample = createDemoRun(candidate);
    setRun(sample);
    setSource('demo');
    setSelectedId(targetId || sample.results.find((row) => row.passed === false)?.scenario_id || sample.results[0]?.scenario_id || null);
    setError('');
  }
  function exploreScenario(id) {
    // When the current API response does not contain this scenario, use a clearly
    // identified DEMO fixture instead of pretending we received live evidence.
    if (!rows.some((row) => row.scenario_id === id)) previewDemo(id);
    else setSelectedId(id);
    setView('trace');
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
      // Session-only history: keep the latest 20 successful API responses.
      // Synthetic demo previews are deliberately not recorded as API evaluations.
      setHistoryRuns((previous) => [{
        ...data,
        candidate_version: data.candidate_version || candidate,
        recorded_at: new Date().toISOString(),
      }, ...previous].slice(0, 20));
      setSelectedId(data.results.find((row) => row.passed === false)?.scenario_id || data.results[0]?.scenario_id || null);
    } catch (err) {
      setError(`${err.message} The backend may not be ready yet. Use Preview Demo Data to test the interface.`);
    } finally {
      setLoading(false);
    }
  }
  function openHistoryTrace(savedRun) {
    setRun(savedRun);
    setSource('api');
    setCandidate(savedRun.candidate_version || 'v1.1');
    setSelectedId(savedRun.results.find((row) => row.passed === false)?.scenario_id || savedRun.results[0]?.scenario_id || null);
    setError('');
    setView('trace');
  }

  const heading = view === 'history'
    ? { kicker: 'PREVIOUS API EVALUATIONS', title: 'Evaluation History', description: 'Review completed backend evaluation runs from this browser session.' }
    : view === 'library'
    ? { kicker: 'SYNTHETIC TEST CATALOG', title: 'Scenario Library', description: 'Browse eight planned banking safety cases and inspect their expected evidence.' }
    : view === 'trace'
    ? { kicker: 'EVIDENCE & REGRESSION EXPLANATION', title: 'Trace Explorer', description: 'Inspect an agent claim against the actual evidence provided for the selected scenario.' }
    : { kicker: 'PRE-RELEASE VALIDATION', title: 'Agent Evaluation Console', description: 'Compare agent versions, inspect banking evidence, and review release decisions.' };
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">◆</div><div><strong>AgentShield</strong><span>RELEASE SAFETY</span></div></div>
        <div className="menu-label">WORKSPACE</div>
        {VIEWS.map((item) => (
          <button key={item.id} type="button" className={`nav-item ${view === item.id ? 'active' : ''}`}
            onClick={() => setView(item.id)} aria-current={view === item.id ? 'page' : undefined}>
            <span aria-hidden="true">{item.icon}</span><span>{item.title}</span>
          </button>
        ))}
        <div className="sidebar-spacer" />
        <div className="sidebar-note"><span className="glow-dot"/> Team workspace <strong>Code Battalions</strong></div>
      </aside>
      <main className="main">
        <header className="topbar"><span>AgentShield / {VIEWS.find((item) => item.id === view)?.title}</span><span className="topbar-right">Visionet Techthon 2026 <span className="top-pill">PROTOTYPE</span></span></header>
        <section className="content">
          <div className="page-heading"><div><div className="eyebrow">{heading.kicker}</div><h1>{heading.title}</h1><p>{heading.description}</p></div><div className="environment">●&nbsp; Synthetic banking environment</div></div>
          {view === 'evaluations' && <>
            <div className="panel controls">
              <div className="panel-header"><div><h2>New evaluation</h2><p>Run the same scenarios against baseline and candidate agents.</p></div><span className="muted-small">8 planned scenarios</span></div>
              <div className="form-grid"><label>Baseline agent<select value="v1.0" disabled><option value="v1.0">v1.0 – Baseline</option></select></label><label>Candidate agent<select value={candidate} onChange={(event) => resetForCandidate(event.target.value)}><option value="v1.1">v1.1 – Regression candidate</option><option value="v1.2">v1.2 – Corrected candidate</option></select></label></div>
              <div className="action-row"><button className="primary" onClick={runBackend} disabled={loading}>{loading ? 'Running evaluation…' : '▶ Run Backend Evaluation'}</button><button className="secondary" onClick={() => previewDemo()} disabled={loading}>Preview Demo Data</button><span className="muted-small">Uses POST /api/evaluations when backend is available</span></div>
              {error && <div className="error" role="alert">{error}</div>}
            </div>
            {run ? <>
              <div className="run-meta"><div><span className="eyebrow">EVALUATION RESULT</span> <strong>{run.run_id || 'Latest run'}</strong></div>{tag(source === 'demo' ? 'DEMO DATA — NOT A LIVE EVALUATION' : 'BACKEND API RESPONSE', source === 'demo' ? 'warning' : 'success')}</div>
              <div className="metrics"><div className="metric"><span>Total scenarios</span><strong>{run.total_tests}</strong><small>Required checks</small></div><div className="metric"><span>Passed</span><strong className="green">{run.passed}</strong><small>Candidate results</small></div><div className="metric"><span>Critical regressions</span><strong className={run.critical_regressions ? 'red' : 'green'}>{run.critical_regressions}</strong><small>vs baseline v1.0</small></div><div className={`metric decision ${blocked ? 'blocked' : 'allowed'}`}><span>Release decision</span><strong>{decision === 'BLOCK' ? 'BLOCKED' : decision === 'ALLOW' ? 'ALLOWED' : decision || 'UNKNOWN'}</strong><small>{blocked ? 'Candidate should not be released' : 'Review policy checks before release'}</small></div></div>
              <div className="results-layout">
                <div className="panel test-panel"><div className="panel-header"><div><h2>Scenario results</h2><p>Select a row to inspect its evidence.</p></div><span className="muted-small">{rows.length} returned</span></div><div className="table-scroll"><table><thead><tr><th>Scenario</th><th>API evidence</th><th>Result</th></tr></thead><tbody>{rows.map((row) => {const pass = row.passed === true; const fail = row.passed === false || String(row.severity).toUpperCase() === 'CRITICAL'; return <tr key={row.scenario_id} onClick={() => setSelectedId(row.scenario_id)} onKeyDown={(event) => {if (event.key === 'Enter' || event.key === ' ') {event.preventDefault(); setSelectedId(row.scenario_id);}}} tabIndex={0} aria-selected={selectedRow?.scenario_id === row.scenario_id} className={selectedRow?.scenario_id === row.scenario_id ? 'selected' : ''}><td><strong>{row.scenario_id}</strong><span>{row.scenario_name || 'Banking test case'}</span></td><td>{row.tool_status ?? '—'}</td><td>{tag(pass ? 'PASS' : fail ? 'FAIL' : 'UNKNOWN', pass ? 'success' : fail ? 'danger' : 'neutral')}</td></tr>;})}</tbody></table></div></div>
                <div className="panel trace"><div className="panel-header"><div><h2>Evidence trace</h2><p>{selectedRow?.scenario_id || 'No scenario selected'}</p></div>{selectedRow && tag(selectedRow.severity || 'N/A', statusClass(selectedRow.severity))}</div><TraceDetails row={selectedRow} /><div className="panel-action"><button className="secondary" onClick={() => setView('trace')}>Open Trace Explorer →</button></div></div>
              </div>
              <div className="footnote">{source === 'demo' ? 'These results are predefined UI fixtures. Backend safety validation and release policies are still separate workstreams.' : 'Displayed results came from your backend endpoint. Verify its evaluator and release policies before treating them as safety guarantees.'}</div>
            </> : <div className="panel empty"><div className="empty-symbol">◇</div><h2>Ready for your first evaluation</h2><p>Use <strong>Preview Demo Data</strong> to inspect the interface now, or <strong>Run Backend Evaluation</strong> once the team's API is connected.</p></div>}
          </>}
          {view === 'library' && <>
            <div className="panel catalog-controls"><div className="panel-header"><div><h2>Banking test catalog</h2><p>Search by case ID, scenario name, status, or expected response.</p></div><span className="muted-small">{visibleScenarios.length} of {SCENARIOS.length} scenarios</span></div>
              <div className="catalog-filters"><label>Search scenarios<input type="search" placeholder="e.g. failed, T002, timeout" value={query} onChange={(event) => setQuery(event.target.value)}/></label><label>Banking API status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">All statuses</option>{SCENARIOS.map((s) => s.tool_status).filter((s, i, arr) => arr.indexOf(s) === i).map((s) => <option key={s} value={s}>{s}</option>)}</select></label></div>
            </div>
            <div className="results-layout catalog-layout"><div className="panel test-panel"><div className="panel-header"><div><h2>Available scenarios</h2><p>Select a scenario to view its expected evidence.</p></div></div><div className="table-scroll"><table><thead><tr><th>Scenario</th><th>API status</th></tr></thead><tbody>{visibleScenarios.map((row) => <tr key={row.scenario_id} onClick={() => setCatalogSelectedId(row.scenario_id)} onKeyDown={(event) => {if (event.key === 'Enter' || event.key === ' ') {event.preventDefault(); setCatalogSelectedId(row.scenario_id);}}} tabIndex={0} className={catalogSelectedId === row.scenario_id ? 'selected' : ''}><td><strong>{row.scenario_id}</strong><span>{row.scenario_name}</span></td><td>{row.tool_status}</td></tr>)}</tbody></table></div>{visibleScenarios.length === 0 && <p className="placeholder">No scenarios match your filters. Try a different search.</p>}</div>
              <div className="panel trace"><div className="panel-header"><div><h2>Scenario specification</h2><p>{catalogSelected.scenario_id} — {catalogSelected.scenario_name}</p></div>{tag('SYNTHETIC', 'warning')}</div><div className="trace-body"><div className="trace-label">AUTHORITATIVE API STATUS</div><div className="trace-value mono">{catalogSelected.tool_status}</div><div className="trace-label">EXPECTED AGENT CLAIM</div><div className="trace-value mono">{catalogSelected.safe_claim}</div><div className="trace-label">EXPECTED SAFE RESPONSE</div><div className="quote">{catalogSelected.safe_reply}</div><div className="trace-label">TEST PURPOSE</div><div className="trace-value">Verify that the agent does not contradict the mock banking evidence.</div><button className="primary" onClick={() => exploreScenario(catalogSelected.scenario_id)}>Preview evidence trace →</button></div></div>
            </div><p className="footnote">This library is a fixed set of synthetic requirements, not results returned by banking APIs.</p>
          </>}
          {view === 'trace' && <>
            {run ? <><div className="run-meta"><div><span className="eyebrow">TRACE SOURCE</span> <strong>{run.run_id || 'Latest run'}</strong></div>{tag(source === 'demo' ? 'DEMO DATA — NOT A LIVE EVALUATION' : 'BACKEND API RESPONSE', source === 'demo' ? 'warning' : 'success')}</div><div className="results-layout trace-layout"><div className="panel test-panel"><div className="panel-header"><div><h2>Scenarios in current run</h2><p>Choose a case to see its full trace.</p></div></div><div className="trace-list">{rows.map((row) => <button type="button" key={row.scenario_id} className={`trace-list-row ${selectedRow?.scenario_id === row.scenario_id ? 'selected' : ''}`} onClick={() => setSelectedId(row.scenario_id)}><span><strong>{row.scenario_id}</strong><small>{row.scenario_name || 'Banking test case'}</small></span>{tag(row.passed ? 'PASS' : row.passed === false ? 'FAIL' : 'UNKNOWN', row.passed ? 'success' : row.passed === false ? 'danger' : 'neutral')}</button>)}</div></div><div className="panel trace"><div className="panel-header"><div><h2>Evidence trace</h2><p>{selectedRow?.scenario_id || 'No scenario selected'}</p></div>{selectedRow && tag(selectedRow.severity || 'N/A', statusClass(selectedRow.severity))}</div><TraceDetails row={selectedRow}/></div></div><div className="footnote">{source === 'demo' ? 'Sample response and violation fields come from predefined fixtures, not an actual safety evaluator.' : 'API response fields are displayed as returned. The backend team owns validation and release decisions.'}</div></>
              : <div className="panel empty"><div className="empty-symbol">≋</div><h2>No evaluation trace yet</h2><p>Load a clearly labeled synthetic demo to explore the interface, or use the Evaluation Console when the backend is ready.</p><button className="primary empty-action" onClick={() => previewDemo()}>Load demo trace</button></div>}
          </>}
          {view === 'history' && <>
            <div className="panel test-panel">
              <div className="panel-header">
                <div>
                  <h2>Recent backend evaluations</h2>
                  <p>Only successful API responses appear here. Demo previews are never presented as live runs.</p>
                </div>
                <span className="muted-small">{historyRuns.length} runs this session</span>
              </div>
              {historyRuns.length === 0 ? (
                <div className="empty">
                  <h2>No backend evaluations recorded yet</h2>
                  <p>Run an evaluation in the Evaluation Console to add a history entry.</p>
                  <button className="primary" type="button" onClick={() => setView('evaluations')}>Go to Evaluation Console</button>
                </div>
              ) : (
                <div className="table-scroll">
                  <table>
                    <thead><tr><th>Run ID</th><th>Candidate</th><th>Passed</th><th>Critical regressions</th><th>Decision</th><th>Recorded</th><th>Evidence</th></tr></thead>
                    <tbody>
                      {historyRuns.map((savedRun, index) => {
                        const release = String(savedRun.release_decision || 'UNKNOWN').toUpperCase();
                        const displayDecision = release === 'BLOCK' ? 'BLOCKED' : release === 'ALLOW' ? 'ALLOWED' : release;
                        return (
                          <tr key={`${savedRun.run_id || 'api-run'}-${index}`}>
                            <td><strong>{savedRun.run_id || 'Unnamed run'}</strong></td>
                            <td>{savedRun.candidate_version}</td>
                            <td>{savedRun.passed} / {savedRun.total_tests}</td>
                            <td>{savedRun.critical_regressions}</td>
                            <td>{tag(displayDecision, statusClass(displayDecision))}</td>
                            <td>{new Date(savedRun.recorded_at).toLocaleString()}</td>
                            <td><button className="secondary" type="button" aria-label={`View trace for ${savedRun.run_id || savedRun.candidate_version}`} onClick={() => openHistoryTrace(savedRun)}>View trace</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <p className="footnote">History is kept in memory only. Refreshing or closing the page clears these entries; it does not query backend history or persist results.</p>
          </>}
        </section>
      </main>
    </div>
  );
}
