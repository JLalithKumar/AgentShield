import Icon from './Icon';
import { severityLabel, statusClass, verdict } from './runDisplay';

export function Badge({ children, tone = statusClass(children) }) {
  return (
    <span className={`badge tone-${tone}`} role="status">
      {children}
    </span>
  );
}

export function RunInfo({ run, source }) {
  return (
    <div className="run-info" role="status" aria-label="Evaluation source status">
      <span>
        <Icon name="file" aria-hidden="true" />
        <strong>{run.run_id || 'Current evaluation run'}</strong>
      </span>
      <Badge tone={source === 'demo' ? 'warning' : 'blue'}>
        {source === 'demo' ? 'DEMO DATA — NOT A LIVE EVALUATION' : 'BACKEND API RESPONSE'}
      </Badge>
    </div>
  );
}

export function Metric({ label, value, icon, tone = 'neutral' }) {
  return (
    <div className={`panel metric metric-${tone}`} role="region" aria-label={`${label}: ${value ?? 'Unknown'}`}>
      <span className="metric-label">
        <Icon name={icon} size={18} aria-hidden="true" />
        {label}
      </span>
      <strong>{value ?? 'Unknown'}</strong>
    </div>
  );
}

export function EmptyState({ icon = 'file', title, children, action }) {
  return (
    <div className="empty-state">
      <span className="empty-icon" aria-hidden="true">
        <Icon name={icon} size={28} strokeWidth={1.6} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
      {action && <div style={{ marginTop: '16px' }}>{action}</div>}
    </div>
  );
}

export function ScenarioTable({ rows, selectedId, onSelect, results = false }) {
  return (
    <div
      className="table-scroll"
      tabIndex={0}
      aria-label={results ? 'Scrollable scenario evaluation results table' : 'Scrollable banking scenarios table'}
      role="region"
    >
      <table aria-label={results ? 'Scenario results' : 'Banking scenarios'}>
        <thead>
          <tr>
            <th scope="col">Scenario ID</th>
            <th scope="col">Scenario name</th>
            <th scope="col">Banking API status</th>
            {results && (
              <>
                <th scope="col">Safety result</th>
                <th scope="col">Severity</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const isSelected = selectedId === row.scenario_id;
            return (
              <tr
                key={row.scenario_id}
                className="selectable"
                aria-selected={isSelected}
                onClick={() => onSelect(row.scenario_id)}
              >
                <td>
                  <button
                    className="id-button"
                    type="button"
                    aria-label={`Inspect scenario ${row.scenario_id}: ${row.scenario_name}`}
                    aria-pressed={isSelected}
                    onClick={event => {
                      event.stopPropagation();
                      onSelect(row.scenario_id);
                    }}
                  >
                    {row.scenario_id}
                  </button>
                </td>
                <td>
                  <strong>{row.scenario_name || 'Name not reported'}</strong>
                </td>
                <td>
                  <Badge tone={row.tool_status === 'FAILED' ? 'danger' : 'neutral'}>
                    {row.tool_status || 'Unknown'}
                  </Badge>
                </td>
                {results && (
                  <>
                    <td>
                      <Badge tone={row.passed ? 'success' : 'danger'}>
                        {verdict(row)}
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={row.severity === 'CRITICAL' ? 'danger' : (row.severity === 'HIGH' ? 'warning' : 'neutral')}>
                        {severityLabel(row)}
                      </Badge>
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
