import Icon from './Icon';
import { Badge, EmptyState, Metric, RunInfo, ScenarioTable } from './DashboardUI';
import EvidencePanel from './EvidencePanel';
import { releaseLabel, statusClass } from './runDisplay';
import { SCENARIOS } from './demoResults';

function Workflow({ onBrowse }) {
  return (
    <aside className="workflow">
      <h2>Five-stage workflow</h2>
      <ol>
        <li>
          <span aria-hidden="true"><Icon name="layers" /></span>
          <div>
            <strong>1. Test scenarios</strong>
            <p>24 fixed banking benchmark cases across 12 categories.</p>
          </div>
        </li>
        <li>
          <span aria-hidden="true"><Icon name="play" /></span>
          <div>
            <strong>2. Run agents</strong>
            <p>Record observable execution steps for baseline & candidate.</p>
          </div>
        </li>
        <li>
          <span aria-hidden="true"><Icon name="server" /></span>
          <div>
            <strong>3. Validate evidence</strong>
            <p>Compare agent claims with authoritative API results.</p>
          </div>
        </li>
        <li>
          <span aria-hidden="true"><Icon name="activity" /></span>
          <div>
            <strong>4. Compare versions</strong>
            <p>Detect regressions and safety policy violations.</p>
          </div>
        </li>
        <li>
          <span aria-hidden="true"><Icon name="shield" /></span>
          <div>
            <strong>5. Release Gate</strong>
            <p>Independent gate decides ALLOW or BLOCK.</p>
          </div>
        </li>
      </ol>
      <button className="text-button" type="button" onClick={onBrowse}>
        Browse 24 scenarios <Icon name="arrow" size={15} aria-hidden="true" />
      </button>
    </aside>
  );
}

function FiveStageStepper({ run, loading, candidate }) {
  const isBlocked = run ? releaseLabel(run) === 'BLOCKED' : false;
  const stages = [
    {
      stage_id: 1,
      name: '1. Test Scenarios',
      description: `${SCENARIOS.length} fixed benchmark cases`,
      status: run ? 'COMPLETED' : 'READY',
    },
    {
      stage_id: 2,
      name: '2. Run Agent',
      description: `Baseline v1.0 & Candidate ${candidate}`,
      status: run ? 'COMPLETED' : (loading ? 'RUNNING' : 'PENDING'),
    },
    {
      stage_id: 3,
      name: '3. Validate Evidence',
      description: 'Evaluate against banking API results',
      status: run ? 'COMPLETED' : (loading ? 'RUNNING' : 'PENDING'),
    },
    {
      stage_id: 4,
      name: '4. Compare Versions',
      description: run ? `${run.critical_regressions || 0} critical regressions` : 'Baseline vs Candidate',
      status: run ? (run.critical_regressions > 0 ? 'REGRESSION' : 'COMPLETED') : 'PENDING',
    },
    {
      stage_id: 5,
      name: '5. Release Decision',
      description: run?.reason || 'Independent Release Gate',
      status: run ? (isBlocked ? 'GATE BLOCKED' : 'GATE ALLOWED') : 'PENDING',
    },
  ];

  return (
    <section className="panel stage-stepper-panel" aria-label="Five-stage evaluation workflow status">
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

          return (
            <div
              key={st.stage_id || idx}
              className={`stepper-step stepper-${st.status?.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className="stepper-step-header">
                <span className="stepper-number" aria-hidden="true">{idx + 1}</span>
                <Badge tone={badgeTone}>{st.status}</Badge>
              </div>
              <strong className="stepper-title">{st.name}</strong>
              <p className="stepper-desc">{st.description}</p>
            </div>
          );
        })}
      </div>
      {run?.reason && (
        <div className={`gate-rationale-box ${isBlocked ? 'rationale-blocked' : 'rationale-allowed'}`}>
          <Icon name="shield" size={18} aria-hidden="true" />
          <div>
            <strong>Decision Rationale ({isBlocked ? 'Gate Blocked' : 'Gate Allowed'})</strong>
            <p>{run.reason}</p>
          </div>
        </div>
      )}
    </section>
  );
}

function ReleaseDecisionSummary({ run, onExplore }) {
  if (!run) return null;
  const isBlocked = releaseLabel(run) === 'BLOCKED';
  const passRate = run.total_tests ? ((run.passed / run.total_tests) * 100).toFixed(1) : 0;

  return (
    <section
      className={`panel release-summary-card ${isBlocked ? 'summary-blocked' : 'summary-allowed'}`}
      style={{
        borderLeft: `4px solid ${isBlocked ? 'var(--danger)' : 'var(--success)'}`,
        padding: '20px 24px',
        background: isBlocked ? 'var(--danger-soft)' : 'var(--success-soft)',
      }}
      aria-label="Release Decision Summary"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: isBlocked ? 'var(--danger)' : 'var(--success)' }}>
            Release Gate Outcome
          </span>
          <h3 style={{ margin: '4px 0', fontSize: '20px', color: isBlocked ? '#991B1B' : '#166534' }}>
            {isBlocked ? 'AUTOMATED RELEASE BLOCKED' : 'AUTOMATED RELEASE ALLOWED'}
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text)' }}>
            {isBlocked
              ? `Candidate ${run.candidate_version || 'v1.1'} introduced ${run.critical_regressions} critical regression on scenario T002 (hallucinating payment success when API failed). Release is prohibited until corrected.`
              : `Candidate ${run.candidate_version || 'v1.2'} passed all ${run.total_tests} banking scenarios with 0 critical regressions. All agent claims match authoritative API evidence.`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Badge tone={isBlocked ? 'danger' : 'success'}>
            {isBlocked ? 'GATE: BLOCKED' : 'GATE: ALLOWED'}
          </Badge>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
            {run.passed}/{run.total_tests} ({passRate}%)
          </span>
        </div>
      </div>
      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '13px', color: 'var(--secondary)' }}>
        <span>
          <strong>Policy Note:</strong> Evaluation decision is based on 24 synthetic banking benchmark tests. This gate confirms policy compliance and does not deploy directly to production.
        </span>
        {isBlocked && (
          <button
            type="button"
            className="secondary"
            onClick={onExplore}
            style={{ fontSize: '13px', padding: '6px 14px', minHeight: '36px' }}
          >
            Inspect T002 Failure <Icon name="arrow" size={14} aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}

export default function EvaluationConsole({
  candidate,
  onCandidate,
  onRun,
  onPreview,
  loading,
  error,
  run,
  source,
  selected,
  onSelect,
  navigate
}) {
  const decision = releaseLabel(run);

  return (
    <>
      {/* Guidance Header for Personas */}
      <div
        className="panel"
        style={{ padding: '14px 20px', marginBottom: '20px', background: 'var(--surface)', border: '1px solid var(--border)' }}
        role="note"
        aria-label="Workflow guidance"
      >
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text)', lineHeight: 1.5 }}>
          <strong>Change Control Objective:</strong> Compare an updated AI agent against the approved baseline using 24 synthetic banking scenarios. Select candidate version, execute evaluation, inspect verifiable evidence, and review the independent Release Gate decision.
        </p>
      </div>

      <div className="config-layout">
        <form
          className="panel config"
          aria-label="New evaluation"
          onSubmit={event => {
            event.preventDefault();
            if (!loading) onRun();
          }}
        >
          <header className="panel-heading config-heading">
            <span className="feature-icon" aria-hidden="true">
              <Icon name="sliders" size={24} />
            </span>
            <div>
              <h2>New Evaluation</h2>
              <p>Select the baseline and candidate versions to evaluate.</p>
            </div>
          </header>
          <div className="form-fields">
            <label>
              Baseline Agent
              <select value="v1.0" disabled>
                <option value="v1.0">v1.0 — Baseline</option>
              </select>
            </label>
            <label>
              Candidate Agent
              <select
                name="candidate-agent"
                value={candidate}
                disabled={loading}
                onChange={event => onCandidate(event.target.value)}
              >
                <option value="v1.1">v1.1 — Unsafe Candidate</option>
                <option value="v1.2">v1.2 — Corrected Candidate</option>
              </select>
            </label>
          </div>
          <div className="suite">
            <span><Icon name="layers" size={17} aria-hidden="true" />Scenario suite</span>
            <strong>Synthetic banking</strong>
            <span className="suite-count">{SCENARIOS.length} scenarios</span>
          </div>
          <div className="form-actions">
            <button className="primary" type="submit" disabled={loading}>
              <Icon name="play" size={16} aria-hidden="true" />
              {loading ? 'Running evaluation…' : 'Run Evaluation'}
            </button>
            <button className="secondary" type="button" disabled={loading} onClick={onPreview}>
              <Icon name="eye" size={17} aria-hidden="true" />
              Preview Demo Data
            </button>
          </div>
          {loading && (
            <p className="notice" role="status">
              Waiting for the evaluation service to return results.
            </p>
          )}
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
        </form>
        <Workflow onBrowse={() => navigate('library')} />
      </div>

      <div className="section-title">
        <h2>Evaluation results</h2>
        {!run && <Badge>{loading ? 'In progress' : 'Awaiting run'}</Badge>}
      </div>

      {run ? (
        <div className="stack">
          <RunInfo run={run} source={source} />
          <ReleaseDecisionSummary run={run} onExplore={() => { onSelect('T002'); navigate('trace'); }} />
          <FiveStageStepper run={run} loading={loading} candidate={candidate} />
          <div className="metrics">
            <Metric label="Total scenarios" value={run.total_tests} icon="layers" />
            <Metric label="Passed scenarios" value={run.passed} icon="check" tone="success" />
            <Metric
              label="Critical regressions"
              value={run.critical_regressions}
              icon="alert"
              tone={run.critical_regressions > 0 ? 'danger' : 'neutral'}
            />
            <Metric
              label="Release decision"
              value={decision}
              icon="shield"
              tone={statusClass(decision)}
            />
          </div>
          <section className="panel">
            <header className="panel-heading">
              <div>
                <h2>Scenario results</h2>
                <p>Select a scenario to inspect its evidence below.</p>
              </div>
            </header>
            <ScenarioTable
              rows={run.results}
              results
              selectedId={selected?.scenario_id}
              onSelect={onSelect}
            />
          </section>
          <EvidencePanel row={selected} run={run} onOpen={() => navigate('trace')} />
        </div>
      ) : (
        <section className="panel">
          <EmptyState
            icon="file"
            title={loading ? 'Evaluation in progress' : 'Ready for your first evaluation'}
          >
            {loading
              ? 'Results will appear when the run finishes.'
              : 'Run an evaluation to see scenario results, evidence, and the release decision.'}
          </EmptyState>
        </section>
      )}
    </>
  );
}
