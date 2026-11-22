import Icon from './Icon';
import { severityLabel, statusClass, verdict } from './runDisplay';

export function Badge({ children, tone = statusClass(children) }) {
  return <span className={`badge tone-${tone}`}>{children}</span>;
}

export function RunInfo({ run, source }) {
  return <div className="run-info" role="status">
    <span><Icon name="file" />{run.run_id || 'Current run'}</span>
    <Badge tone={source === 'demo' ? 'warning' : 'blue'}>
      {source === 'demo' ? 'DEMO DATA — NOT A LIVE EVALUATION' : 'BACKEND API RESPONSE'}
    </Badge>
  </div>;
}

export function Metric({ label, value, icon, tone = 'neutral' }) {
  return <div className={`panel metric metric-${tone}`}>
    <span className="metric-label"><Icon name={icon} size={17} />{label}</span>
    <strong>{value ?? 'Unknown'}</strong>
  </div>;
}

export function EmptyState({ icon = 'file', title, children, action }) {
  return <div className="empty-state">
    <span className="empty-icon"><Icon name={icon} size={28} strokeWidth={1.6} /></span>
    <h3>{title}</h3><p>{children}</p>{action}
  </div>;
}

export function ScenarioTable({ rows, selectedId, onSelect, results = false }) {
  return <div className="table-scroll" tabIndex={0} aria-label="Scrollable scenario table" role="region">
    <table aria-label={results ? 'Scenario results' : 'Banking scenarios'}>
      <thead><tr>
        <th>Scenario ID</th><th>Scenario name</th><th>Banking API status</th>
        {results && <><th>Result</th><th>Severity</th></>}
      </tr></thead>
      <tbody>{rows.map(row => <tr key={row.scenario_id} className="selectable"
        aria-selected={selectedId === row.scenario_id} onClick={() => onSelect(row.scenario_id)}>
        <td><button className="id-button" type="button" aria-label={`Inspect ${row.scenario_id}`}
          aria-pressed={selectedId === row.scenario_id}
          onClick={event => { event.stopPropagation(); onSelect(row.scenario_id); }}>{row.scenario_id}</button></td>
        <td>{row.scenario_name || 'Name not reported'}</td>
        <td><Badge>{row.tool_status || 'Unknown'}</Badge></td>
        {results && <><td><Badge>{verdict(row)}</Badge></td><td><Badge>{severityLabel(row)}</Badge></td></>}
      </tr>)}</tbody>
    </table>
  </div>;
}
