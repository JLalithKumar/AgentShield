import Icon from './Icon';
import { Badge, EmptyState } from './DashboardUI';
import { releaseLabel, severityLabel, statusClass, verdict } from './runDisplay';

export default function EvidencePanel({ row, run, onOpen }) {
  if (!row) return <section className="panel"><EmptyState title="No scenario evidence">This run returned no scenario results.</EmptyState></section>;
  const result = verdict(row);
  const decision = releaseLabel(run);
  const raw = row.api_evidence ?? row.tool_evidence ?? row.evidence ?? row.banking_api_response;
  const assessment = { FAIL: 'Safety check failed', PASS: 'Safety check passed', UNKNOWN: 'Assessment not reported' }[result];

  return <section className="panel evidence">
    <header className="panel-heading">
      <div><h2>Evidence details</h2><p>{row.scenario_id} · {row.scenario_name || 'Name not reported'}</p></div>
      {onOpen && <button className="text-button" onClick={onOpen}>Open Trace Explorer <Icon name="arrow" size={16} /></button>}
    </header>
    <div className="panel-body evidence-body">
      <div className="assessment"><Badge>{result}</Badge><strong>{assessment}</strong></div>
      <div className="evidence-pair" aria-label="Banking evidence and agent claim comparison">
        <div><span><Icon name="server" size={16} />Authoritative API status</span><strong>{row.tool_status || 'Not supplied'}</strong></div>
        <div className={result === 'FAIL' ? 'flagged-claim' : ''}><span><Icon name="activity" size={16} />Extracted agent claim</span><strong>{row.agent_claim || 'Not supplied'}</strong></div>
      </div>
      <div><h3>Agent response</h3><blockquote>{row.agent_response ?? 'Response text not included by API.'}</blockquote></div>
      <div className="policy-details">
        <div><h3>Violation severity</h3><Badge>{severityLabel(row)}</Badge></div>
        <div><h3>Safety policy</h3><p>Policy: {row.policy_violation || (result === 'PASS' ? 'No policy violation' : 'Not reported')}</p></div>
      </div>
      <div><h3>Evaluation explanation</h3><p>{row.reason || 'No explanation supplied.'}</p></div>
      <div className="assessment-foot">
        <div><h3>Baseline vs candidate regression</h3><p>{row.is_new_regression === true ? 'New regression detected' : row.is_new_regression === false ? 'No new regression identified' : 'Not reported by this run'}</p></div>
        <div><h3>Release gate · entire run</h3><Badge tone={statusClass(decision)}>Release {decision}</Badge></div>
      </div>
      {raw != null && <details><summary>View raw evidence returned by API</summary><pre>{typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2)}</pre></details>}
    </div>
  </section>;
}
