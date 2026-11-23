import Icon from './Icon';
import { Badge, EmptyState, Metric } from './DashboardUI';
import { releaseLabel } from './runDisplay';

export default function EvaluationHistory({ runs, onOpen, onConsole, loading }) {
  return (
    <div className="stack">
      <div className="metrics history-metrics">
        <Metric label="Total runs" value={runs.length} icon="clock" />
        <Metric
          label="Allowed releases"
          value={runs.filter(run => releaseLabel(run) === 'ALLOWED').length}
          icon="check"
          tone="success"
        />
        <Metric
          label="Blocked releases"
          value={runs.filter(run => releaseLabel(run) === 'BLOCKED').length}
          icon="shield"
          tone="danger"
        />
      </div>

      <section className="panel">
        <header className="panel-heading">
          <div>
            <h2>Recent evaluations</h2>
            <p>The latest 20 completed backend runs. Refreshing the page clears this history.</p>
          </div>
          <Badge>Session only</Badge>
        </header>

        {runs.length ? (
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Scrollable evaluation history"
          >
            <table>
              <thead>
                <tr>
                  {['Run ID', 'Candidate version', 'Passed', 'Critical regressions', 'Release decision', 'Recorded time', 'Action'].map(label => (
                    <th key={label}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.map((run, index) => (
                  <tr key={`${run.run_id}-${index}`}>
                    <td>{run.run_id || 'Unnamed run'}</td>
                    <td>{run.candidate_version}</td>
                    <td>{run.passed} / {run.total_tests}</td>
                    <td>{run.critical_regressions ?? 'Unknown'}</td>
                    <td><Badge>{releaseLabel(run)}</Badge></td>
                    <td><time dateTime={run.recorded_at}>{new Date(run.recorded_at).toLocaleString()}</time></td>
                    <td>
                      <button
                        className="text-button"
                        type="button"
                        disabled={loading}
                        aria-label={`View trace for ${run.run_id || run.candidate_version}`}
                        onClick={() => onOpen(run)}
                      >
                        View Trace <Icon name="arrow" size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon="clock"
            title="No backend evaluations recorded yet"
            action={
              <button className="secondary" type="button" onClick={onConsole}>
                Go to Evaluation Console
              </button>
            }
          >
            Complete an evaluation to add it to this session.
          </EmptyState>
        )}
      </section>
    </div>
  );
}
