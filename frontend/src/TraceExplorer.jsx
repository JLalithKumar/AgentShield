import { Badge, EmptyState, RunInfo } from './DashboardUI';
import EvidencePanel from './EvidencePanel';
import { verdict } from './runDisplay';

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
      <EvidencePanel row={selected} run={run} />
    </div>
  </div>;
}
