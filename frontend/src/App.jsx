import { useState } from 'react';
import { createDemoRun } from './demoResults';
import { firstScenario, normalizeResponse } from './runDisplay';
import WorkspaceShell from './WorkspaceShell';
import EvaluationConsole from './EvaluationConsole';
import ScenarioLibrary from './ScenarioLibrary';
import TraceExplorer from './TraceExplorer';
import EvaluationHistory from './EvaluationHistory';
import './App.css';
import './trace-enhancements.css';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

export default function App() {
  const [view, setView] = useState('evaluations');
  const [candidate, setCandidate] = useState('v1.1');
  const [run, setRun] = useState(null);
  const [source, setSource] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ query: '', status: 'ALL', id: 'T002' });
  const [historyRuns, setHistoryRuns] = useState([]);
  const selected = run?.results.find(row => row.scenario_id === selectedId) || run?.results[0];

  function navigate(next) {
    setView(next);
    const main = document.getElementById('main-content');
    main?.focus({ preventScroll: true });
    document.documentElement.scrollTop = 0;
  }
  function showRun(data, origin, id) {
    setRun(data);
    setSource(origin);
    setSelectedId(id || firstScenario(data));
    setError('');
  }
  function resetCandidate(value) {
    setCandidate(value);
    setRun(null);
    setSelectedId(null);
    setSource(null);
    setError('');
  }
  function preview(id) {
    showRun(createDemoRun(candidate), 'demo', id);
  }
  function explore(id) {
    if (run?.results.some(row => row.scenario_id === id)) setSelectedId(id);
    else preview(id);
    navigate('trace');
  }
  async function runBackend() {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/evaluations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseline_version: 'v1.0', candidate_version: candidate }),
      });
      if (!response.ok) throw new Error(`Backend returned HTTP ${response.status}.`);
      const data = normalizeResponse(await response.json());
      showRun(data, 'api');
      const saved = { ...data, candidate_version: data.candidate_version || candidate, recorded_at: new Date().toISOString() };
      setHistoryRuns(previous => [saved, ...previous].slice(0, 20));
    } catch (err) {
      setError(`Evaluation could not be completed. ${err.message} Check the evaluation service and try again.`);
    } finally {
      setLoading(false);
    }
  }
  function openHistory(saved) {
    showRun(saved, 'api');
    setCandidate(saved.candidate_version);
    navigate('trace');
  }

  return <WorkspaceShell view={view} navigate={navigate} historyCount={historyRuns.length}>
    {view === 'evaluations' && <EvaluationConsole candidate={candidate} onCandidate={resetCandidate} onRun={runBackend}
      onPreview={() => preview()} loading={loading} error={error} run={run} source={source} selected={selected} onSelect={setSelectedId} navigate={navigate} />}
    {view === 'library' && <ScenarioLibrary filters={filters} update={change => setFilters(previous => ({ ...previous, ...change }))}
      run={run} source={source} onExplore={explore} loading={loading} />}
    {view === 'trace' && <TraceExplorer run={run} source={source} selected={selected} onSelect={setSelectedId} onPreview={() => preview()} loading={loading} />}
    {view === 'history' && <EvaluationHistory runs={historyRuns} onOpen={openHistory} onConsole={() => navigate('evaluations')} loading={loading} />}
  </WorkspaceShell>;
}
