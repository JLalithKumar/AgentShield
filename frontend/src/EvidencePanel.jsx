import Icon from './Icon';
import { Badge, EmptyState } from './DashboardUI';
import { releaseLabel, severityLabel, statusClass, verdict } from './runDisplay';

export default function EvidencePanel({ row, run, onOpen }) {
  if (!row) {
    return (
      <section className="panel evidence" aria-label="Evidence details">
        <EmptyState title="No scenario evidence">This run returned no scenario results.</EmptyState>
      </section>
    );
  }

  const result = verdict(row);
  const decision = releaseLabel(run);
  const raw = row.api_evidence ?? row.tool_evidence ?? row.evidence ?? row.banking_api_response;
  const assessment = { FAIL: 'Safety check failed', PASS: 'Safety check passed', UNKNOWN: 'Assessment not reported' }[result];
  const isFailed = result === 'FAIL';
  const isCritical = row.severity === 'CRITICAL' || row.is_new_regression;

  return (
    <section className="panel evidence" aria-label={`Evidence and safety verdict for ${row.scenario_id}`}>
      <header className="panel-heading">
        <div>
          <h2>Evidence details</h2>
          <p>{row.scenario_id} · {row.scenario_name || 'Name not reported'}</p>
        </div>
        {onOpen && (
          <button className="text-button" type="button" onClick={onOpen}>
            <span>Open Trace Explorer</span>
            <Icon name="arrow" size={16} aria-hidden="true" />
          </button>
        )}
      </header>

      <div className="panel-body evidence-body">
        <div className="assessment">
          <Badge tone={isFailed ? 'danger' : 'success'}>{result}</Badge>
          <strong>{assessment}</strong>
        </div>

        <div className="evidence-pair" aria-label="Banking evidence and agent claim comparison">
          <div>
            <span><Icon name="server" size={16} aria-hidden="true" />Authoritative API status</span>
            <strong>{row.tool_status || 'Not supplied'}</strong>
          </div>
          <div className={result === 'FAIL' ? 'flagged-claim' : ''}>
            <span><Icon name="activity" size={16} aria-hidden="true" />Extracted agent claim</span>
            <strong>{row.agent_claim || 'Not supplied'}</strong>
          </div>
        </div>

        <div>
          <h3>Agent response</h3>
          <blockquote>{row.agent_response ?? 'Response text not included by API.'}</blockquote>
        </div>

        <div className="policy-details">
          <div>
            <h3>Violation severity</h3>
            <Badge tone={isFailed ? (row.severity === 'CRITICAL' ? 'danger' : 'warning') : 'neutral'}>
              {severityLabel(row)}
            </Badge>
          </div>
          <div>
            <h3>Safety policy</h3>
            <p>Policy: {row.policy_violation || (result === 'PASS' ? 'No policy violation' : 'Not reported')}</p>
          </div>
        </div>

        <div>
          <h3>Evaluation explanation</h3>
          <p>{row.reason || 'No explanation supplied.'}</p>
        </div>

        {isFailed && (
          <div style={{ padding: '16px 20px', background: 'var(--danger-soft)', border: '1px solid #FECACA', borderRadius: '8px' }}>
            <h4 style={{ color: '#991B1B', fontSize: '15px', fontWeight: 700, margin: '0 0 10px' }}>
              Safety Failure Investigation Breakdown
            </h4>
            <div style={{ display: 'grid', gap: '8px', fontSize: '14px', color: 'var(--text)' }}>
              <div>
                <strong style={{ color: '#991B1B' }}>What happened: </strong>
                {row.agent_claim && row.tool_status && row.agent_claim !== row.tool_status
                  ? `The candidate agent claimed "${row.agent_claim}" while the authoritative banking system recorded "${row.tool_status}".`
                  : (row.reason || 'Agent response violated configured safety policy.')}
              </div>
              <div>
                <strong style={{ color: '#991B1B' }}>Why it is unsafe: </strong>
                {isCritical
                  ? 'Falsely claiming a failed transaction succeeded misleads customers into believing money was transferred, risking financial loss and regulatory non-compliance.'
                  : 'Agent response failed the independent safety policy check.'}
              </div>
              <div>
                <strong style={{ color: '#991B1B' }}>Evidence that proves it: </strong>
                Banking core API confirmed status "{row.tool_status || 'UNKNOWN'}", contradicting extracted agent claim.
              </div>
              <div>
                <strong style={{ color: '#991B1B' }}>Release readiness impact: </strong>
                {isCritical
                  ? 'Automated Release Gate BLOCKED — Candidate cannot be approved for release until this critical contradiction is resolved.'
                  : 'Flagged for reviewer audit before release approval.'}
              </div>
            </div>
          </div>
        )}

        <div className="assessment-foot">
          <div>
            <h3>Baseline vs candidate regression</h3>
            <p>{row.is_new_regression === true ? 'New regression detected' : row.is_new_regression === false ? 'No new regression identified' : 'Not reported by this run'}</p>
          </div>
          <div>
            <h3>Release gate · entire run</h3>
            <Badge tone={statusClass(decision)}>Release {decision}</Badge>
          </div>
        </div>

        {raw != null && (
          <details>
            <summary>View raw evidence returned by API</summary>
            <pre>{typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2)}</pre>
          </details>
        )}
      </div>
    </section>
  );
}
