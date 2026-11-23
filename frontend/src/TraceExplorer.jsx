import Icon from './Icon';
import { Badge, EmptyState, RunInfo } from './DashboardUI';
import EvidencePanel from './EvidencePanel';
import { verdict } from './runDisplay';

function CriticalRegressionAlert({ row, run }) {
  if (!row?.is_new_regression) return null;
  const isCritical = row.severity === 'CRITICAL';
  const headerTitle = isCritical
    ? `Critical Safety Regression — ${row.scenario_id}`
    : `Safety Policy Regression — ${row.scenario_id}`;

  const explanation = row.reason || `The agent reported ${row.agent_claim} while the authoritative banking API returned ${row.tool_status}.`;
  const decisionText = isCritical
    ? 'Release blocked due to a critical safety regression.'
    : 'Automated release gate flagged this regression for review.';

  return (
    <section className="critical-regression-card" aria-label="Critical safety regression details">
      <header className="critical-regression-header">
        <div className="critical-regression-title">
          <Icon name="alert" size={20} />
          <h3>{headerTitle}</h3>
        </div>
        <Badge tone="danger">{row.severity || 'CRITICAL'}</Badge>
      </header>

      <div className="critical-regression-table-wrap">
        <table className="critical-regression-table">
          <tbody>
            <tr>
              <th scope="row">Scenario</th>
              <td>{row.scenario_name || 'Name not reported'}</td>
            </tr>
            <tr>
              <th scope="row">Banking API Status</th>
              <td><span className="critical-field-val status-api">{row.tool_status || 'Unknown'}</span></td>
            </tr>
            <tr>
              <th scope="row">Agent Claim</th>
              <td><span className="critical-field-val status-claim">{row.agent_claim || 'Unknown'}</span></td>
            </tr>
            <tr>
              <th scope="row">Policy Violation</th>
              <td><span className="critical-policy-code">{row.policy_violation || 'Unclassified'}</span></td>
            </tr>
            <tr>
              <th scope="row">Severity</th>
              <td><Badge tone="danger">{row.severity || 'CRITICAL'}</Badge></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="critical-regression-body">
        <div className="critical-regression-explanation">
          <span className="critical-label">Evaluation Finding:</span>
          <p>{explanation}</p>
        </div>
        <div className="critical-regression-footer">
          <span className="critical-gate-impact">
            <strong>Decision Impact:</strong> {decisionText}
          </span>
        </div>
      </div>
    </section>
  );
}

function ExecutionTimeline({ events, row }) {
  if (!row) return null;
  const defaultEvents = [
    { sequence_number: 1, event_type: 'SCENARIO_LOADED', title: 'Scenario Loaded', details: { scenario: `${row.scenario_id}: ${row.scenario_name}` }, execution_mode: 'simulated' },
    { sequence_number: 2, event_type: 'AGENT_SELECTED', title: 'Agent Version Selected', details: { versions: 'Baseline v1.0 vs Candidate' }, execution_mode: 'simulated' },
    { sequence_number: 3, event_type: 'INPUT_SUPPLIED', title: 'Customer Question Delivered', details: { question: row.customer_question || 'Banking scenario request delivered to agent runtime' }, execution_mode: 'simulated' },
    { sequence_number: 4, event_type: 'BANKING_EVIDENCE_RECEIVED', title: 'Banking Tool Evidence Received', details: { status: `Authoritative API Status: ${row.tool_status}` }, execution_mode: 'simulated' },
    { sequence_number: 5, event_type: 'AGENT_RESPONSE_GENERATED', title: 'Agent Response Generated', details: { claim: `Extracted claim: ${row.agent_claim}` }, execution_mode: 'simulated' },
    { sequence_number: 6, event_type: 'EVIDENCE_VALIDATED', title: 'Evidence Validated Against Claim', details: { status: row.passed ? 'Agent claim matches authoritative banking evidence' : 'Contradiction detected: agent claim conflicts with tool evidence' }, execution_mode: 'simulated' },
    { sequence_number: 7, event_type: 'SAFETY_VERDICT_DETERMINED', title: 'Safety Verdict Determined', details: { verdict: row.passed ? 'PASSED: No safety violations detected' : `FAILED: ${row.policy_violation || 'Violation detected'} (${row.severity})` }, execution_mode: 'simulated' },
    { sequence_number: 8, event_type: 'VERSION_COMPARISON_COMPLETED', title: 'Version Comparison Completed', details: { comparison: row.is_new_regression ? 'CRITICAL REGRESSION: Candidate degraded compared to baseline' : 'Consistent with baseline' }, execution_mode: 'simulated' },
    { sequence_number: 9, event_type: 'RELEASE_GATE_ASSESSED', title: 'Release Gate Assessed', details: { gate: row.is_new_regression ? 'BLOCK: Critical regression prevents automated release' : 'ELIGIBLE: No critical regressions flagged' }, execution_mode: 'simulated' },
  ];
  const list = (events && events.length) ? events : defaultEvents;

  return (
    <section className="panel timeline-panel" aria-label="Observable execution timeline">
      <header className="panel-heading">
        <div>
          <h2>F. Observable execution timeline</h2>
          <p>Sequence of 9 observable execution events recorded for {row.scenario_id}. Distinguishes deterministic simulation from live LLM observations.</p>
        </div>
        <Badge tone="blue">9 Observable Events</Badge>
      </header>
      <div className="timeline-list">
        {list.map((ev, i) => {
          const descText = ev.details
            ? Object.entries(ev.details).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' | ')
            : (ev.desc || '');
          return (
            <div key={ev.sequence_number || i} className="timeline-event">
              <div className="timeline-seq" aria-hidden="true">{ev.sequence_number || i + 1}</div>
              <div className="timeline-content">
                <div className="timeline-meta">
                  <strong>{ev.event_type?.replace(/_/g, ' ') || ev.title}</strong>
                  <Badge tone={ev.execution_mode === 'live' ? 'blue' : 'neutral'}>
                    [{ev.execution_mode || 'simulated'}]
                  </Badge>
                </div>
                <p className="timeline-desc">{descText}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function TraceExplorer({ run, source, selected, onSelect, onPreview, loading }) {
  if (!run) return <section className="panel"><EmptyState icon="activity" title="No evaluation trace yet"
    action={<button className="secondary" disabled={loading} onClick={onPreview}>Load demo trace</button>}>
    Run an evaluation or preview a synthetic trace to inspect scenario evidence.
  </EmptyState></section>;

  return <div className="stack"><RunInfo source={source} run={run} />
    <div className="trace-layout">
      <section className="panel"><header className="panel-heading"><h2>Run scenarios</h2><Badge>{run.results.length}</Badge></header>
        <div className="trace-index">{run.results.map(row => <button key={row.scenario_id} onClick={() => onSelect(row.scenario_id)}
          aria-pressed={selected?.scenario_id === row.scenario_id}>
          <span><small>{row.scenario_id}</small><strong>{row.scenario_name || 'Name not reported'}</strong></span><Badge>{verdict(row)}</Badge>
        </button>)}</div>
      </section>
      <div className="stack">
        <CriticalRegressionAlert row={selected} run={run} />
        <EvidencePanel row={selected} run={run} />
        <ExecutionTimeline events={selected?.execution_events} row={selected} />
      </div>
    </div>
  </div>;
}
