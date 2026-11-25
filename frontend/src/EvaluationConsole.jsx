import { useState } from 'react';
import Icon from './Icon';
import { Badge, EmptyState, Metric, RunInfo, ScenarioTable } from './DashboardUI';
import EvidencePanel from './EvidencePanel';
import { releaseLabel, severityTone, statusClass } from './runDisplay';
import { CANDIDATE_VERSION_INFO, SCENARIOS } from './demoResults';

const categoryCount = new Set(SCENARIOS.map(s => s.category).filter(Boolean)).size;

function Workflow({ onBrowse }) {
  return (
    <aside className="workflow">
      <h2>Five-stage workflow</h2>
      <ol>
        <li>
          <span aria-hidden="true"><Icon name="layers" /></span>
          <div>
            <strong>1. Test scenarios</strong>
            <p>{SCENARIOS.length} ordered banking benchmark cases across {categoryCount} domains.</p>
          </div>
        </li>
        <li>
          <span aria-hidden="true"><Icon name="play" /></span>
          <div>
            <strong>2. Run agents</strong>
            <p>Record observable execution steps for baseline &amp; candidate.</p>
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
            <p>Independent gate evaluates ALLOW or BLOCK policy.</p>
          </div>
        </li>
      </ol>
      <button className="text-button" type="button" onClick={onBrowse}>
        Browse {SCENARIOS.length} scenarios <Icon name="arrow" size={15} aria-hidden="true" />
      </button>
    </aside>
  );
}

function FiveStageStepper({ run, loading, candidate }) {
  const isBlocked = run ? releaseLabel(run) === 'BLOCKED' : false;
  const totalCount = run?.total_tests ?? SCENARIOS.length;
  const failedCount = run ? (run.failed ?? Math.max(0, totalCount - (run.passed ?? 0))) : 0;
  const criticalCount = run?.critical_regressions ?? 0;
  const highCount = run?.high_regressions ?? 0;

  let compareDescription = 'Baseline vs Candidate';
  if (run) {
    if (failedCount === 0) {
      compareDescription = `0 regressions across ${totalCount} scenarios`;
    } else if (failedCount === 1) {
      compareDescription = `1 regression (${criticalCount} critical, ${highCount} high)`;
    } else {
      compareDescription = `${failedCount} regressions (${criticalCount} critical, ${highCount} high)`;
    }
  }

  const stages = [
    {
      stage_id: 1,
      name: '1. Test Scenarios',
      description: `${totalCount} ordered benchmark cases`,
      status: run ? 'COMPLETED' : 'READY',
    },
    {
      stage_id: 2,
      name: '2. Run Agent',
      description: `Baseline v1.0 & Candidate ${run?.candidate_version || candidate}`,
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
      description: compareDescription,
      status: run ? (failedCount > 0 ? 'REGRESSION' : 'COMPLETED') : 'PENDING',
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
          <p>End-to-end change control verification pipeline from ordered scenarios to Release Gate decision.</p>
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

function ReleaseDecisionSummary({ run, onInspectRegressions, onOpenTrace }) {
  if (!run) return null;
  const isBlocked = releaseLabel(run) === 'BLOCKED';
  const totalTests = run.total_tests || run.results.length || 0;
  const passedTests = run.passed ?? run.results.filter(r => r.passed).length;
  const failedRows = run.results.filter(r => r.passed === false);
  const failedCount = run.failed ?? failedRows.length;
  const criticalCount = run.critical_regressions ?? failedRows.filter(r => r.severity === 'CRITICAL').length;
  const highCount = run.high_regressions ?? failedRows.filter(r => r.severity === 'HIGH').length;
  const mediumCount = run.medium_regressions ?? failedRows.filter(r => r.severity === 'MEDIUM').length;
  const lowCount = run.low_regressions ?? failedRows.filter(r => r.severity === 'LOW').length;
  const violationTotal = run.total_violations ?? failedCount;
  const passRate = totalTests ? ((passedTests / totalTests) * 100).toFixed(1) : '0.0';
  const candidateVer = run.candidate_version || 'candidate';

  const sevParts = [];
  if (criticalCount > 0) sevParts.push(`${criticalCount} critical`);
  if (highCount > 0) sevParts.push(`${highCount} high`);
  if (mediumCount > 0) sevParts.push(`${mediumCount} medium`);
  if (lowCount > 0) sevParts.push(`${lowCount} low`);
  const severitySummary = sevParts.length ? sevParts.join(', ') : `${failedCount} policy failure${failedCount === 1 ? '' : 's'}`;
  const affectedDomains = new Set(failedRows.map(r => r.category).filter(Boolean)).size;
  const firstFailedId = failedRows[0]?.scenario_id || null;

  let narrative;
  if (!isBlocked && failedCount === 0) {
    narrative = `Candidate ${candidateVer} passed all ${totalTests} banking scenarios with 0 safety regressions. All agent claims match authoritative API evidence.`;
  } else if (failedCount === 1 && firstFailedId) {
    narrative = `Candidate ${candidateVer} introduced 1 safety regression (${severitySummary}) on scenario ${firstFailedId} (${failedRows[0]?.policy_violation || 'policy violation'}). Release gate recommends blocking promotion until resolved.`;
  } else {
    narrative = `Candidate ${candidateVer} introduced ${failedCount} safety regressions (${severitySummary}) across ${affectedDomains || 'multiple'} risk domain${affectedDomains === 1 ? '' : 's'} (${violationTotal} policy violation${violationTotal === 1 ? '' : 's'}). Release gate recommends blocking promotion until resolved.`;
  }

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
            {narrative}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Badge tone={isBlocked ? 'danger' : 'success'}>
            {isBlocked ? 'GATE: BLOCKED' : 'GATE: ALLOWED'}
          </Badge>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
            {passedTests}/{totalTests} ({passRate}%)
          </span>
        </div>
      </div>
      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '13px', color: 'var(--secondary)' }}>
        <span>
          <strong>Policy Note:</strong> Evaluation decision is derived from {totalTests} synthetic banking safety scenarios. This gate evaluates policy compliance and does not deploy directly to production.
        </span>
        {failedCount > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {failedCount === 1 && firstFailedId ? (
              <button
                type="button"
                className="secondary"
                onClick={() => onOpenTrace(firstFailedId)}
                style={{ fontSize: '13px', padding: '6px 14px', minHeight: '36px' }}
              >
                Inspect {firstFailedId} Trace <Icon name="arrow" size={14} aria-hidden="true" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="secondary"
                  onClick={onInspectRegressions}
                  style={{ fontSize: '13px', padding: '6px 14px', minHeight: '36px' }}
                >
                  Inspect {failedCount} Regressions <Icon name="arrow" size={14} aria-hidden="true" />
                </button>
                {firstFailedId && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => onOpenTrace(firstFailedId)}
                    style={{ fontSize: '13px', padding: '6px 10px' }}
                  >
                    Open Trace Explorer <Icon name="arrow" size={14} aria-hidden="true" />
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function DetectedRegressionsPanel({ run, severityFilter, onSeverityFilter, onInspect }) {
  const regressedRows = run.results.filter(row => row.passed === false);
  const criticalRows = regressedRows.filter(row => String(row.severity || '').toUpperCase() === 'CRITICAL');
  const highRows = regressedRows.filter(row => String(row.severity || '').toUpperCase() === 'HIGH');
  const otherRows = regressedRows.filter(row => !['CRITICAL', 'HIGH'].includes(String(row.severity || '').toUpperCase()));

  const visibleRows = regressedRows.filter(row => {
    const sev = String(row.severity || '').toUpperCase();
    if (severityFilter === 'ALL') return true;
    if (severityFilter === 'OTHER') return !['CRITICAL', 'HIGH'].includes(sev);
    return sev === severityFilter;
  });

  return (
    <section
      id="detected-regressions"
      className="panel regressions-panel"
      aria-label="Detected Safety Regressions"
    >
      <header className="panel-heading">
        <div>
          <h2>Detected Safety Regressions</h2>
          <p>
            Policy violations identified between baseline ({run.baseline_version || 'v1.0'}) and candidate ({run.candidate_version}).
          </p>
        </div>
        <Badge tone={regressedRows.length > 0 ? 'danger' : 'success'}>
          {regressedRows.length} {regressedRows.length === 1 ? 'Regression' : 'Regressions'}
        </Badge>
      </header>

      {regressedRows.length === 0 ? (
        <div className="panel-body">
          <EmptyState icon="check" title="No safety regressions detected">
            Candidate {run.candidate_version} passed all {run.total_tests} banking scenarios without violating safety policies.
          </EmptyState>
        </div>
      ) : (
        <>
          <div className="filter-pills" role="group" aria-label="Filter regressions by severity">
            <button
              type="button"
              className={`filter-pill ${severityFilter === 'ALL' ? 'active' : ''}`}
              aria-pressed={severityFilter === 'ALL'}
              onClick={() => onSeverityFilter('ALL')}
            >
              All ({regressedRows.length})
            </button>
            <button
              type="button"
              className={`filter-pill sev-critical ${severityFilter === 'CRITICAL' ? 'active' : ''}`}
              aria-pressed={severityFilter === 'CRITICAL'}
              onClick={() => onSeverityFilter('CRITICAL')}
            >
              Critical ({criticalRows.length})
            </button>
            <button
              type="button"
              className={`filter-pill sev-high ${severityFilter === 'HIGH' ? 'active' : ''}`}
              aria-pressed={severityFilter === 'HIGH'}
              onClick={() => onSeverityFilter('HIGH')}
            >
              High ({highRows.length})
            </button>
            {otherRows.length > 0 && (
              <button
                type="button"
                className={`filter-pill ${severityFilter === 'OTHER' ? 'active' : ''}`}
                aria-pressed={severityFilter === 'OTHER'}
                onClick={() => onSeverityFilter('OTHER')}
              >
                Medium / Low ({otherRows.length})
              </button>
            )}
          </div>

          {visibleRows.length === 0 ? (
            <div className="panel-body">
              <EmptyState icon="shield" title={`No ${severityFilter.toLowerCase()} regressions in this run`}>
                Adjust the severity filter above to inspect all {regressedRows.length} detected safety regressions.
              </EmptyState>
            </div>
          ) : (
            <div className="regressions-list" role="list">
              {visibleRows.map((row) => {
                const sev = String(row.severity || 'HIGH').toUpperCase();
                const tone = severityTone(sev);
                const multiViolations = Array.isArray(row.violations) ? row.violations : [];
                return (
                  <article
                    key={row.scenario_id}
                    className={`regression-card regression-sev-${tone}`}
                    role="listitem"
                    aria-label={`${row.scenario_id} ${row.scenario_name} regression`}
                  >
                    <div className="regression-card-top">
                      <div className="regression-card-identity">
                        <Badge tone="blue">{row.scenario_id}</Badge>
                        <strong>{row.scenario_name}</strong>
                        {row.category && <Badge tone="neutral">{row.category}</Badge>}
                      </div>
                      <div className="regression-card-severity">
                        <span className={`severity-indicator sev-${tone}`}>
                          <Icon name={sev === 'CRITICAL' ? 'alert' : 'shield'} size={14} aria-hidden="true" />
                          <span>{sev}</span>
                        </span>
                      </div>
                    </div>

                    <div className="regression-meta-grid">
                      <div>
                        <small>Baseline → Candidate</small>
                        <div className="regression-status-shift">
                          <Badge tone={row.baseline_passed === false ? 'danger' : 'success'}>
                            {row.baseline_status || 'PASSED'}
                          </Badge>
                          <span aria-hidden="true">→</span>
                          <Badge tone="danger">FAILED</Badge>
                        </div>
                      </div>
                      <div>
                        <small>Violation policy</small>
                        <div className="regression-violation-code">
                          <code>{row.policy_violation || 'UNCLASSIFIED_VIOLATION'}</code>
                          {multiViolations.length > 1 && (
                            <Badge tone="warning">+{multiViolations.length - 1} more</Badge>
                          )}
                        </div>
                      </div>
                      <div>
                        <small>API status vs Agent claim</small>
                        <div className="regression-claim-diff">
                          <span>{row.tool_status}</span>
                          <span aria-hidden="true">vs</span>
                          <strong className="claim-mismatch">{row.agent_claim}</strong>
                        </div>
                      </div>
                    </div>

                    <p className="regression-summary">{row.reason}</p>

                    <div className="regression-card-actions">
                      <button
                        type="button"
                        className="secondary regression-inspect-btn"
                        onClick={() => onInspect(row.scenario_id)}
                      >
                        Inspect Trace <Icon name="arrow" size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
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
  const [regressionFilter, setRegressionFilter] = useState('ALL');
  const [tableFilter, setTableFilter] = useState('ALL');

  const decision = releaseLabel(run);
  const candidateMeta = CANDIDATE_VERSION_INFO[candidate] || null;

  const totalTests = run?.total_tests ?? 0;
  const passedCount = run?.passed ?? 0;
  const failedCount = run ? (run.failed ?? Math.max(0, totalTests - passedCount)) : 0;
  const criticalCount = run?.critical_regressions ?? 0;
  const highCount = run?.high_regressions ?? 0;
  const violationTotal = run?.total_violations ?? failedCount;
  const passRate = totalTests ? ((passedCount / totalTests) * 100).toFixed(1) : '0.0';

  const tableRows = run?.results
    ? run.results.filter(row => {
      if (tableFilter === 'PASSED') return row.passed === true;
      if (tableFilter === 'FAILED') return row.passed === false;
      if (tableFilter === 'CRITICAL') return row.passed === false && String(row.severity || '').toUpperCase() === 'CRITICAL';
      if (tableFilter === 'HIGH') return row.passed === false && String(row.severity || '').toUpperCase() === 'HIGH';
      return true;
    })
    : [];

  function handleInspectTrace(scenarioId) {
    if (scenarioId) onSelect(scenarioId);
    navigate('trace');
  }

  function handleScrollToRegressions() {
    const el = document.getElementById('detected-regressions');
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

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
          <strong>Change Control Objective:</strong> Compare an updated AI agent against the approved baseline using {SCENARIOS.length} ordered synthetic banking scenarios. Select candidate version, execute evaluation, inspect verifiable evidence, and review the independent Release Gate decision.
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
                onChange={event => {
                  setRegressionFilter('ALL');
                  setTableFilter('ALL');
                  onCandidate(event.target.value);
                }}
              >
                <option value="v1.1">v1.1 — Single Regression</option>
                <option value="v1.2">v1.2 — Corrected Update</option>
                <option value="v1.3">v1.3 — Multiple Safety Regressions</option>
              </select>
            </label>
          </div>
          {candidateMeta && (
            <p className="candidate-helper-note" role="note">
              <strong>{candidateMeta.label}:</strong> {candidateMeta.description}
            </p>
          )}
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
          <ReleaseDecisionSummary
            run={run}
            onInspectRegressions={handleScrollToRegressions}
            onOpenTrace={handleInspectTrace}
          />
          <FiveStageStepper run={run} loading={loading} candidate={candidate} />
          <div className="metrics metrics-six" aria-label="Evaluation summary metrics">
            <Metric label="Total scenarios" value={totalTests} icon="layers" />
            <Metric label="Passed scenarios" value={passedCount} icon="check" tone="success" />
            <Metric
              label="Failed scenarios"
              value={failedCount}
              icon="alert"
              tone={failedCount > 0 ? 'danger' : 'neutral'}
            />
            <Metric
              label="Critical regressions"
              value={criticalCount}
              icon="alert"
              tone={criticalCount > 0 ? 'danger' : 'neutral'}
            />
            <Metric
              label="High-severity regressions"
              value={highCount}
              icon="activity"
              tone={highCount > 0 ? 'warning' : 'neutral'}
            />
            <Metric
              label="Release decision"
              value={decision}
              icon="shield"
              tone={statusClass(decision)}
              hint={`${passRate}% pass · ${violationTotal} violation${violationTotal === 1 ? '' : 's'}`}
            />
          </div>

          <DetectedRegressionsPanel
            run={run}
            severityFilter={regressionFilter}
            onSeverityFilter={setRegressionFilter}
            onInspect={handleInspectTrace}
          />

          <section className="panel">
            <header className="panel-heading">
              <div>
                <h2>Scenario results</h2>
                <p>Complete naturally ordered suite results. Select any scenario to inspect its evidence below.</p>
              </div>
              <span className="count" role="status">
                {tableRows.length} of {run.results.length} shown
              </span>
            </header>
            <div className="filter-pills" role="group" aria-label="Filter scenario results table">
              <button
                type="button"
                className={`filter-pill ${tableFilter === 'ALL' ? 'active' : ''}`}
                aria-pressed={tableFilter === 'ALL'}
                onClick={() => setTableFilter('ALL')}
              >
                All ({run.results.length})
              </button>
              <button
                type="button"
                className={`filter-pill sev-pass ${tableFilter === 'PASSED' ? 'active' : ''}`}
                aria-pressed={tableFilter === 'PASSED'}
                onClick={() => setTableFilter('PASSED')}
              >
                Passed ({passedCount})
              </button>
              <button
                type="button"
                className={`filter-pill sev-critical ${tableFilter === 'FAILED' ? 'active' : ''}`}
                aria-pressed={tableFilter === 'FAILED'}
                onClick={() => setTableFilter('FAILED')}
              >
                Failed ({failedCount})
              </button>
              <button
                type="button"
                className={`filter-pill sev-critical ${tableFilter === 'CRITICAL' ? 'active' : ''}`}
                aria-pressed={tableFilter === 'CRITICAL'}
                onClick={() => setTableFilter('CRITICAL')}
              >
                Critical ({criticalCount})
              </button>
              <button
                type="button"
                className={`filter-pill sev-high ${tableFilter === 'HIGH' ? 'active' : ''}`}
                aria-pressed={tableFilter === 'HIGH'}
                onClick={() => setTableFilter('HIGH')}
              >
                High ({highCount})
              </button>
            </div>
            <ScenarioTable
              rows={tableRows}
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
