import Icon from './Icon';
import { Badge, EmptyState, Metric, RunInfo, ScenarioTable } from './DashboardUI';
import EvidencePanel from './EvidencePanel';
import { releaseLabel, statusClass } from './runDisplay';
import { SCENARIOS } from './demoResults';

function Workflow({ onBrowse }) {
  return <aside className="workflow">
    <h2>Five-stage workflow</h2>
    <ol>
      <li><span><Icon name="layers" /></span><div><strong>1. Test scenarios</strong><p>24 fixed banking benchmark cases across 12 categories.</p></div></li>
      <li><span><Icon name="play" /></span><div><strong>2. Run agents</strong><p>Record observable execution steps for baseline & candidate.</p></div></li>
      <li><span><Icon name="server" /></span><div><strong>3. Validate evidence</strong><p>Compare agent claims with authoritative API results.</p></div></li>
      <li><span><Icon name="activity" /></span><div><strong>4. Compare versions</strong><p>Detect regressions and safety policy violations.</p></div></li>
      <li><span><Icon name="shield" /></span><div><strong>5. Release Gate</strong><p>Independent gate decides ALLOW or BLOCK.</p></div></li>
    </ol>
    <button className="text-button" onClick={onBrowse}>Browse 24 scenarios <Icon name="arrow" size={15} /></button>
  </aside>;
}

function FiveStageStepper({ run, loading, candidate }) {
  const isBlocked = run ? releaseLabel(run) === 'BLOCKED' : false;
  const stages = [
    { stage_id: 1, name: '1. Test Scenarios', description: `${SCENARIOS.length} fixed benchmark cases`, status: run ? 'COMPLETED' : 'READY' },
    { stage_id: 2, name: '2. Run Agent', description: `Baseline v1.0 & Candidate ${candidate}`, status: run ? 'COMPLETED' : (loading ? 'RUNNING' : 'PENDING') },
    { stage_id: 3, name: '3. Validate Evidence', description: 'Evaluate against banking API results', status: run ? 'COMPLETED' : (loading ? 'RUNNING' : 'PENDING') },
    { stage_id: 4, name: '4. Compare Versions', description: run ? `${run.critical_regressions || 0} critical regressions` : 'Baseline vs Candidate', status: run ? (run.critical_regressions > 0 ? 'REGRESSION' : 'COMPLETED') : 'PENDING' },
    { stage_id: 5, name: '5. Release Decision', description: run?.reason || 'Independent Release Gate', status: run ? (isBlocked ? 'GATE BLOCKED' : 'GATE ALLOWED') : 'PENDING' },
  ];

  return <section className="panel stage-stepper-panel" aria-label="Five-stage evaluation workflow status">
    <header className="panel-heading">
      <div>
        <h2>Five-stage workflow execution</h2>
        <p>End-to-end change control verification pipeline from fixed scenarios to Release Gate decision.</p>
      </div>
      <Badge tone={run ? (isBlocked ? 'danger' : 'success') : (loading ? 'blue' : 'neutral')}>
        {run ? (isBlocked ? 'GATE: BLOCKED' : 'GATE: ALLOWED') : (loading ? 'PIPELINE RUNNING' : 'AWAITING RUN')}
      </Badge>
    </header>
    <div className="stepper-grid">
      {stages.map((st, idx) => {
        let badgeTone = 'neutral';
        if (st.status === 'COMPLETED' || st.status === 'GATE ALLOWED') badgeTone = 'success';
        else if (st.status === 'GATE BLOCKED' || st.status === 'REGRESSION') badgeTone = 'danger';
        else if (st.status === 'RUNNING' || st.status === 'READY') badgeTone = 'blue';

        return <div key={st.stage_id || idx} className={`stepper-step stepper-${st.status?.toLowerCase().replace(/\s+/g, '-')}`}>
          <div className="stepper-step-header">
            <span className="stepper-number">{idx + 1}</span>
            <Badge tone={badgeTone}>{st.status}</Badge>
          </div>
          <strong className="stepper-title">{st.name}</strong>
          <p className="stepper-desc">{st.description}</p>
        </div>;
      })}
    </div>
    {run?.reason && <div className={`gate-rationale-box ${isBlocked ? 'rationale-blocked' : 'rationale-allowed'}`}>
      <Icon name="shield" size={18} />
      <div>
        <strong>Decision Rationale ({isBlocked ? 'Gate Blocked' : 'Gate Allowed'})</strong>
        <p>{run.reason}</p>
      </div>
    </div>}
  </section>;
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
      <FiveStageStepper run={run} loading={loading} candidate={candidate} />
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
