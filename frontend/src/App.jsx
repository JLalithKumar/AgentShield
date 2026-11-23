import { useState, useEffect, useCallback, useRef } from 'react';
import { createDemoRun } from './demoResults';
import { firstScenario, normalizeResponse } from './runDisplay';
import WorkspaceShell from './WorkspaceShell';
import EvaluationConsole from './EvaluationConsole';
import ScenarioLibrary from './ScenarioLibrary';
import TraceExplorer from './TraceExplorer';
import EvaluationHistory from './EvaluationHistory';
import Homepage from './Homepage';
import AuthModal from './AuthModal';
import { API_ENDPOINTS } from './api';
import './App.css';
import './trace-enhancements.css';

export default function App({ initialView, initialUser }) {
  const defaultView = initialView || (import.meta.env.MODE === 'test' ? 'evaluations' : 'home');
  const [view, setView] = useState(defaultView);
  const [candidate, setCandidate] = useState('v1.1');
  const [run, setRun] = useState(null);
  const [source, setSource] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ query: '', status: 'ALL', id: 'T002' });
  const [historyRuns, setHistoryRuns] = useState([]);

  // Authentication State
  const [user, setUser] = useState(() => {
    if (initialUser !== undefined) return initialUser;
    if (import.meta.env.MODE === 'test') {
      return { id: 1, full_name: 'Test Engineer', email: 'qa@agentshield.test' };
    }
    return null;
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authExplanation, setAuthExplanation] = useState('');
  const [pendingView, setPendingView] = useState(null);
  const abortControllerRef = useRef(null);

  const selected = run?.results?.find(row => row.scenario_id === selectedId) || run?.results?.[0];

  const fetchHistory = useCallback(async () => {
    try {
      const resp = await fetch(API_ENDPOINTS.evaluations, {
        credentials: 'include',
      });
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data)) {
          const formatted = data.map(item => ({
            ...item,
            recorded_at: item.created_at || new Date().toISOString(),
          }));
          setHistoryRuns(formatted);
        }
      } else if (resp.status === 401) {
        setHistoryRuns([]);
      }
    } catch {
      // Backend not yet reachable or offline
    }
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const resp = await fetch(API_ENDPOINTS.authMe, {
        credentials: 'include',
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (import.meta.env.MODE !== 'test') {
      checkAuth();
      fetchHistory();
    }
  }, [checkAuth, fetchHistory]);

  function navigate(next) {
    if (!user && (next === 'evaluations' || next === 'trace' || next === 'history')) {
      setPendingView(next);
      setAuthModalMode('login');
      setAuthExplanation('Please sign in or create an account to access the evaluation platform.');
      setAuthError('');
      setAuthModalOpen(true);
      return;
    }
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
    if (run?.results?.some(row => row.scenario_id === id)) setSelectedId(id);
    else preview(id);
    navigate('trace');
  }

  async function runBackend() {
    if (loading) return;
    if (!user) {
      setPendingView('evaluations');
      setAuthModalMode('login');
      setAuthExplanation('Please sign in or create an account to run evaluations.');
      setAuthError('');
      setAuthModalOpen(true);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(true);
    setError('');

    try {
      const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ baseline_version: 'v1.0', candidate_version: candidate }),
        signal: controller.signal,
      };

      const response = await fetch(API_ENDPOINTS.evaluations, requestOptions);
      if (!response.ok) {
        if (response.status === 401) {
          setUser(null);
          setHistoryRuns([]);
          setRun(null);
          setView('home');
          setAuthModalMode('login');
          setAuthExplanation('Your session has expired. Please sign in again.');
          setAuthError('');
          setAuthModalOpen(true);
          return;
        }
        throw new Error(`Backend returned HTTP ${response.status}.`);
      }
      const data = normalizeResponse(await response.json());
      if (!controller.signal.aborted) {
        showRun(data, 'api');
        const saved = { ...data, candidate_version: data.candidate_version || candidate, recorded_at: new Date().toISOString() };
        setHistoryRuns(previous => [saved, ...previous.filter(r => r.run_id !== saved.run_id)].slice(0, 25));
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        return;
      }
      setError(`Unable to connect to the evaluation service. ${err.message} Check that the API backend service is available, then retry.`);
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setLoading(false);
      }
    }
  }

  async function openHistory(saved) {
    if (saved.results && saved.results.length > 0) {
      showRun(saved, 'api');
      setCandidate(saved.candidate_version);
      navigate('trace');
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch(API_ENDPOINTS.evaluationDetails(saved.run_id), {
        credentials: 'include',
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const fullRun = normalizeResponse(await resp.json());
      showRun(fullRun, 'api');
      setCandidate(fullRun.candidate_version);
      navigate('trace');
    } catch {
      // Fallback
      showRun(saved, 'api');
      setCandidate(saved.candidate_version);
      navigate('trace');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(email, password) {
    setAuthLoading(true);
    setAuthError('');
    try {
      const resp = await fetch(API_ENDPOINTS.authLogin, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.detail || 'Invalid email or password.');
      }
      const userData = await resp.json();
      setUser(userData);
      setAuthModalOpen(false);
      setAuthExplanation('');
      fetchHistory();
      if (pendingView) {
        const target = pendingView;
        setPendingView(null);
        navigate(target);
      } else if (view === 'home') {
        navigate('evaluations');
      }
    } catch (err) {
      setAuthError(err.message || 'Login failed.');
      throw err;
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleRegister(fullName, email, password) {
    setAuthLoading(true);
    setAuthError('');
    try {
      const resp = await fetch(API_ENDPOINTS.authRegister, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ full_name: fullName, email, password }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.detail || 'Registration failed.');
      }
      const userData = await resp.json();
      setUser(userData);
      setAuthModalOpen(false);
      setAuthExplanation('');
      fetchHistory();
      if (pendingView) {
        const target = pendingView;
        setPendingView(null);
        navigate(target);
      } else if (view === 'home') {
        navigate('evaluations');
      }
    } catch (err) {
      setAuthError(err.message || 'Registration failed.');
      throw err;
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignOut() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setUser(null);
    setRun(null);
    setSelectedId(null);
    setSource(null);
    setError('');
    setHistoryRuns([]);
    setPendingView(null);
    setCandidate('v1.1');
    setView('home');

    try {
      await fetch(API_ENDPOINTS.authLogout, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore
    }
  }

  function openSignInModal() {
    setAuthModalMode('login');
    setAuthExplanation('');
    setAuthError('');
    setAuthModalOpen(true);
  }

  function openSignUpModal() {
    setAuthModalMode('register');
    setAuthExplanation('');
    setAuthError('');
    setAuthModalOpen(true);
  }

  return (
    <>
      {view === 'home' ? (
        <Homepage
          user={user}
          onOpenConsole={() => {
            if (!user) {
              setPendingView('evaluations');
              setAuthModalMode('login');
              setAuthExplanation('Please sign in or create an account to run evaluations.');
              setAuthError('');
              setAuthModalOpen(true);
            } else {
              navigate('evaluations');
            }
          }}
          onOpenLibrary={() => navigate('library')}
          onOpenSignIn={openSignInModal}
          onOpenSignUp={openSignUpModal}
          onSignOut={handleSignOut}
        />
      ) : (
        <WorkspaceShell
          view={view}
          navigate={navigate}
          historyCount={historyRuns.length}
          user={user}
          onOpenSignIn={openSignInModal}
          onSignOut={handleSignOut}
          onGoHome={() => navigate('home')}
        >
          {view === 'evaluations' && (
            <EvaluationConsole
              candidate={candidate}
              onCandidate={resetCandidate}
              onRun={runBackend}
              onPreview={() => preview()}
              loading={loading}
              error={error}
              run={run}
              source={source}
              selected={selected}
              onSelect={setSelectedId}
              navigate={navigate}
            />
          )}
          {view === 'library' && (
            <ScenarioLibrary
              filters={filters}
              update={change => setFilters(previous => ({ ...previous, ...change }))}
              run={run}
              source={source}
              onExplore={explore}
              loading={loading}
            />
          )}
          {view === 'trace' && (
            <TraceExplorer
              run={run}
              source={source}
              selected={selected}
              onSelect={setSelectedId}
              onPreview={() => preview()}
              loading={loading}
            />
          )}
          {view === 'history' && (
            <EvaluationHistory
              runs={historyRuns}
              onOpen={openHistory}
              onConsole={() => navigate('evaluations')}
              loading={loading}
              user={user}
            />
          )}
        </WorkspaceShell>
      )}

      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onLogin={handleLogin}
        onRegister={handleRegister}
        loading={authLoading}
        error={authError}
        explanation={authExplanation}
        onClearError={() => setAuthError('')}
      />
    </>
  );
}
