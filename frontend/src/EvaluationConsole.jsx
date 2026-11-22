import Icon from './Icon';
import { Badge, EmptyState, Metric, RunInfo, ScenarioTable } from './DashboardUI';
import EvidencePanel from './EvidencePanel';
import { releaseLabel, statusClass } from './runDisplay';
import { SCENARIOS } from './demoResults';

function Workflow({ onBrowse }) {
  return <aside className="workflow">
    <h2>Validation workflow</h2>
    <ol>
      <li><span><Icon name="layers" /></span><div><strong>Run scenarios</strong><p>Test both versions on {SCENARIOS.length} banking cases.</p></div></li>
      <li><span><Icon name="activity" /></span><div><strong>Verify evidence</strong><p>Compare agent claims with API results.</p></div></li>
      <li><span><Icon name="shield" /></span><div><strong>Apply release gate</strong><p>Check for critical regressions.</p></div></li>
    </ol>
    <button className="text-button" onClick={onBrowse}>Browse scenarios <Icon name="arrow" size={15} /></button>
  </aside>;
}

export default function EvaluationConsole({ candidate, onCandidate, onRun, onPreview, loading, error,
  run, source, selected, onSelect, navigate }) {
  const decision = releaseLabel(run);
  return <>
    <div className="config-layout">
      <form className="panel config" aria-label="New evaluation" onSubmit={event => { event.preventDefault(); if (!loading) onRun(); }}>
        <header className="panel-heading config-heading"><span className="feature-icon"><Icon name="sliders" size={24} /></span>
          <div><h2>New Evaluation</h2><p>Select the baseline and candidate versions to evaluate.</p></div>
        </header>
        <div className="form-fields">
          <label>Baseline Agent<select value="v1.0" disabled><option value="v1.0">v1.0 — Baseline</option></select></label>
          <label>Candidate Agent<select name="candidate-agent" value={candidate} disabled={loading} onChange={event => onCandidate(event.target.value)}>
            <option value="v1.1">v1.1 — Unsafe Candidate</option><option value="v1.2">v1.2 — Corrected Candidate</option>
          </select></label>
        </div>
        <div className="suite"><span><Icon name="layers" size={17} />Scenario suite</span><strong>Synthetic banking</strong><span className="suite-count">{SCENARIOS.length} scenarios</span></div>
        <div className="form-actions">
          <button className="primary" type="submit" disabled={loading}><Icon name="play" size={16} />{loading ? 'Running evaluation…' : 'Run Evaluation'}</button>
          <button className="secondary" type="button" disabled={loading} onClick={onPreview}><Icon name="eye" size={17} />Preview Demo Data</button>
        </div>
        {loading && <p className="notice" role="status">Waiting for the evaluation service to return results.</p>}
        {error && <p className="notice error" role="alert">{error}</p>}
      </form>
      <Workflow onBrowse={() => navigate('library')} />
    </div>
    <div className="section-title"><h2>Evaluation results</h2>{!run && <Badge>{loading ? 'In progress' : 'Awaiting run'}</Badge>}</div>
    {run ? <div className="stack">
      <RunInfo run={run} source={source} />
      <div className="metrics">
        <Metric label="Total scenarios" value={run.total_tests} icon="layers" />
        <Metric label="Passed scenarios" value={run.passed} icon="check" tone="success" />
        <Metric label="Critical regressions" value={run.critical_regressions} icon="alert" tone={run.critical_regressions > 0 ? 'danger' : 'neutral'} />
        <Metric label="Release decision" value={decision} icon="shield" tone={statusClass(decision)} />
      </div>
      <section className="panel">
        <header className="panel-heading"><div><h2>Scenario results</h2><p>Select a scenario to inspect its evidence below.</p></div></header>
        <ScenarioTable rows={run.results} results selectedId={selected?.scenario_id} onSelect={onSelect} />
      </section>
      <EvidencePanel row={selected} run={run} onOpen={() => navigate('trace')} />
    </div> : <section className="panel"><EmptyState icon="file" title={loading ? 'Evaluation in progress' : 'Ready for your first evaluation'}>
      {loading ? 'Results will appear when the run finishes.' : 'Run an evaluation to see scenario results, evidence, and the release decision.'}
    </EmptyState></section>}
  </>;
}
