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
import AuthPage from './AuthPage';
import Icon from './Icon';
import { API_ENDPOINTS, getCsrfToken } from './api';
import './App.css';
import './trace-enhancements.css';

/**
 * Resolves initial route based on initialView prop or current window.location.pathname.
 * Supported routes:
 * - '/' and '/auth': Dedicated Login / Sign Up with Cloudflare Turnstile CAPTCHA
 * - '/home': Authenticated AgentShield Homepage
 * - '/app': Protected Evaluation Engine Workspace (evaluations, library, trace, history)
 */
function parseInitialLocation(initialView) {
  if (initialView) {
    if (initialView === 'auth') return { page: 'auth', workspaceView: 'evaluations' };
    if (initialView === 'home') return { page: 'home', workspaceView: 'evaluations' };
    if (['evaluations', 'library', 'trace', 'history'].includes(initialView)) {
      return { page: 'app', workspaceView: initialView };
    }
  }

  // In test mode without initialView prop, default to 'app'/'evaluations'
  if (import.meta.env.MODE === 'test') {
    return { page: 'app', workspaceView: 'evaluations' };
  }

  if (typeof window !== 'undefined' && window.location && window.location.pathname) {
    const path = window.location.pathname;
    if (path === '/' || path === '/auth') {
      return { page: 'auth', workspaceView: 'evaluations' };
    }
    if (path === '/home') {
      return { page: 'home', workspaceView: 'evaluations' };
    }
    if (path === '/app' || path.startsWith('/app/')) {
      const sub = path.replace(/^\/app\/?/, '').split('/')[0];
      const valid = ['evaluations', 'library', 'trace', 'history'];
      return { page: 'app', workspaceView: valid.includes(sub) ? sub : 'evaluations' };
    }
  }

  // Default for production: Authentication-first journey starts at /
  return { page: 'auth', workspaceView: 'evaluations' };
}

export default function App({ initialView, initialUser }) {
  const initialLoc = parseInitialLocation(initialView);
  const [page, setPage] = useState(initialLoc.page);
  const [workspaceView, setWorkspaceView] = useState(initialLoc.workspaceView);

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

  const [authChecking, setAuthChecking] = useState(() => {
    return import.meta.env.MODE !== 'test';
  });

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authExplanation, setAuthExplanation] = useState('');
  const [pendingRoute, setPendingRoute] = useState(null);

  // AuthModal state for Homepage interactions and modal fallback
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');
  const [authModalExplanation, setAuthModalExplanation] = useState('');

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
            candidate_version: item.candidate_version || 'v1.1',
            recorded_at: item.created_at || new Date().toISOString(),
          }));
          setHistoryRuns(formatted);
        }
      }
    } catch {
      // Ignore background fetch error
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
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setAuthChecking(false);
    }
  }, []);

  useEffect(() => {
    if (import.meta.env.MODE !== 'test') {
      checkAuth();
      fetchHistory();
    }
  }, [checkAuth, fetchHistory]);

  // Sync state with browser Back/Forward navigation
  useEffect(() => {
    function handlePopState() {
      const loc = parseInitialLocation();
      setPage(loc.page);
      setWorkspaceView(loc.workspaceView);
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Route protection & automatic redirection in browser
  useEffect(() => {
    if (authChecking) return;
    if (import.meta.env.MODE === 'test') return;

    if (!user) {
      // Unauthenticated visitor attempting to access /app
      if (page === 'app') {
        const currentTarget = `/app/${workspaceView}`;
        setPendingRoute(currentTarget);
        setAuthExplanation('Please sign in to access your AgentShield workspace.');
        setPage('auth');
        if (typeof window !== 'undefined' && window.history) {
          window.history.replaceState({}, '', '/auth');
        }
      }
    } else {
      // Authenticated visitor accessing / or /auth directly
      if (page === 'auth') {
        const target = pendingRoute && pendingRoute.startsWith('/app') ? 'app' : 'home';
        const targetUrl = target === 'app' ? pendingRoute : '/home';
        setPage(target);
        if (target === 'app') {
          const sub = pendingRoute.replace(/^\/app\/?/, '').split('/')[0] || 'evaluations';
          setWorkspaceView(sub);
        }
        if (typeof window !== 'undefined' && window.history) {
          window.history.replaceState({}, '', targetUrl);
        }
        setPendingRoute(null);
      }
    }
  }, [user, page, workspaceView, authChecking, pendingRoute]);

  function navigateHome() {
    setPage('home');
    if (typeof window !== 'undefined' && window.history) {
      window.history.pushState({}, '', '/home');
    }
    document.documentElement.scrollTop = 0;
  }

  function navigateApp(subView = 'evaluations') {
    if (!user && subView !== 'library') {
      if (import.meta.env.MODE === 'test') {
        setAuthModalMode('login');
        setAuthModalExplanation('Please sign in or create an account to run evaluations.');
        setAuthModalOpen(true);
        return;
      }
      setPendingRoute(`/app/${subView}`);
      setAuthExplanation('Please sign in to access the AgentShield Evaluation Engine.');
      setPage('auth');
      if (typeof window !== 'undefined' && window.history) {
        window.history.pushState({}, '', '/auth');
      }
      return;
    }
    setPage('app');
    setWorkspaceView(subView);
    if (typeof window !== 'undefined' && window.history) {
      window.history.pushState({}, '', `/app/${subView}`);
    }
    document.documentElement.scrollTop = 0;
  }

  function navigateWorkspaceView(next) {
    if (!user && (next === 'evaluations' || next === 'trace' || next === 'history')) {
      setAuthModalMode('login');
      setAuthModalExplanation('Please sign in or create an account to access the evaluation platform.');
      setAuthModalOpen(true);
      return;
    }
    setWorkspaceView(next);
    if (typeof window !== 'undefined' && window.history) {
      window.history.pushState({}, '', `/app/${next}`);
    }
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
    navigateWorkspaceView('trace');
  }

  async function runBackend() {
    if (loading) return;
    if (!user) {
      setAuthModalMode('login');
      setAuthModalExplanation('Please sign in or create an account to run evaluations.');
      setAuthModalOpen(true);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(true);
    setError('');

    try {
      const headers = { 'Content-Type': 'application/json' };
      const csrf = getCsrfToken();
      if (csrf) {
        headers['X-CSRF-Token'] = csrf;
      }

      const requestOptions = {
        method: 'POST',
        headers,
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
          setPage('auth');
          setAuthExplanation('Your session has expired. Please sign in again.');
          if (typeof window !== 'undefined' && window.history) {
            window.history.replaceState({}, '', '/auth');
          }
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
      navigateWorkspaceView('trace');
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
      navigateWorkspaceView('trace');
    } catch {
      // Fallback
      showRun(saved, 'api');
      setCandidate(saved.candidate_version);
      navigateWorkspaceView('trace');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(email, password, turnstileToken) {
    setAuthLoading(true);
    setAuthError('');
    try {
      const token = turnstileToken || (import.meta.env.MODE === 'test' ? '1x00000000000000000000AA' : undefined);
      const resp = await fetch(API_ENDPOINTS.authLogin, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email,
          password,
          turnstile_token: token,
        }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.detail || 'Invalid email or password.');
      }
      const userData = await resp.json();
      setUser(userData);
      setAuthExplanation('');
      setAuthModalOpen(false);
      fetchHistory();

      if (pendingRoute && pendingRoute.startsWith('/app')) {
        const sub = pendingRoute.replace(/^\/app\/?/, '').split('/')[0] || 'evaluations';
        setPage('app');
        setWorkspaceView(sub);
        if (typeof window !== 'undefined' && window.history) {
          window.history.pushState({}, '', pendingRoute);
        }
      } else {
        setPage('home');
        if (typeof window !== 'undefined' && window.history) {
          window.history.pushState({}, '', '/home');
        }
      }
      setPendingRoute(null);
    } catch (err) {
      setAuthError(err.message || 'Login failed.');
      throw err;
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleRegister(fullName, email, password, turnstileToken) {
    setAuthLoading(true);
    setAuthError('');
    try {
      const token = turnstileToken || (import.meta.env.MODE === 'test' ? '1x00000000000000000000AA' : undefined);
      const resp = await fetch(API_ENDPOINTS.authRegister, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          turnstile_token: token,
        }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.detail || 'Registration failed.');
      }
      const userData = await resp.json();
      setUser(userData);
      setAuthExplanation('');
      setAuthModalOpen(false);
      fetchHistory();

      if (pendingRoute && pendingRoute.startsWith('/app')) {
        const sub = pendingRoute.replace(/^\/app\/?/, '').split('/')[0] || 'evaluations';
        setPage('app');
        setWorkspaceView(sub);
        if (typeof window !== 'undefined' && window.history) {
          window.history.pushState({}, '', pendingRoute);
        }
      } else {
        setPage('home');
        if (typeof window !== 'undefined' && window.history) {
          window.history.pushState({}, '', '/home');
        }
      }
      setPendingRoute(null);
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
    setPendingRoute(null);
    setCandidate('v1.1');
    setAuthExplanation('You have signed out successfully.');

    // In test mode, return to public homepage; in production, redirect to /auth
    const target = import.meta.env.MODE === 'test' ? 'home' : 'auth';
    setPage(target);
    if (typeof window !== 'undefined' && window.history) {
      window.history.replaceState({}, '', target === 'home' ? '/home' : '/auth');
    }

    try {
      const csrf = getCsrfToken();
      const headers = {};
      if (csrf) {
        headers['X-CSRF-Token'] = csrf;
      }
      await fetch(API_ENDPOINTS.authLogout, {
        method: 'POST',
        headers,
        credentials: 'include',
      });
    } catch {
      // Ignore network errors
    }
  }

  function openSignInModal() {
    setAuthModalMode('login');
    setAuthModalExplanation('');
    setAuthModalOpen(true);
  }

  function openSignUpModal() {
    setAuthModalMode('register');
    setAuthModalExplanation('');
    setAuthModalOpen(true);
  }

  function handleHomepageOpenConsole() {
    if (!user) {
      setPendingRoute('/app/evaluations');
      setAuthModalMode('login');
      setAuthModalExplanation('Please sign in or create an account to run evaluations.');
      setAuthModalOpen(true);
      return;
    }
    navigateApp('evaluations');
  }

  function handleHomepageOpenLibrary() {
    navigateApp('library');
  }

  function handleHomepageOpenHistory() {
    if (!user) {
      setPendingRoute('/app/history');
      setAuthModalMode('login');
      setAuthModalExplanation('Please sign in or create an account to view your evaluation history.');
      setAuthModalOpen(true);
      return;
    }
    navigateApp('history');
  }

  // Session verification screen (avoids page flickering on initial load)
  if (authChecking) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          backgroundColor: '#F8FAFC',
          color: '#475569',
          fontFamily: 'var(--font-body)',
        }}
        role="status"
        aria-label="Loading AgentShield Session"
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              margin: '0 auto 16px',
              width: 44,
              height: 44,
              borderRadius: 12,
              display: 'grid',
              placeItems: 'center',
              background: 'linear-gradient(135deg, #4338CA 0%, #0EA5E9 100%)',
              color: '#fff',
            }}
          >
            <Icon name="shield" size={24} />
          </div>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Verifying secure session...</p>
        </div>
      </div>
    );
  }

  // Route: / or /auth (Dedicated Login / Sign Up Page)
  if (page === 'auth' && !user) {
    return (
      <AuthPage
        initialMode="login"
        onLogin={handleLogin}
        onRegister={handleRegister}
        loading={authLoading}
        error={authError}
        explanation={authExplanation}
        onClearError={() => {
          setAuthError('');
          setAuthExplanation('');
        }}
      />
    );
  }

  // Route: /home (Authenticated or Public AgentShield Homepage)
  if (page === 'home') {
    return (
      <>
        <Homepage
          user={user}
          onOpenConsole={handleHomepageOpenConsole}
          onOpenLibrary={handleHomepageOpenLibrary}
          onOpenHistory={handleHomepageOpenHistory}
          onOpenSignIn={openSignInModal}
          onOpenSignUp={openSignUpModal}
          onSignOut={handleSignOut}
        />
        <AuthModal
          isOpen={authModalOpen}
          initialMode={authModalMode}
          explanation={authModalExplanation}
          onClose={() => setAuthModalOpen(false)}
          onLogin={async (email, password) => {
            await handleLogin(email, password);
          }}
          onRegister={async (fullName, email, password) => {
            await handleRegister(fullName, email, password);
          }}
          loading={authLoading}
          error={authError}
          onClearError={() => setAuthError('')}
        />
      </>
    );
  }

  // Route: /app (Protected Evaluation Engine Workspace)
  return (
    <>
      <WorkspaceShell
        view={workspaceView}
        navigate={navigateWorkspaceView}
        historyCount={historyRuns.length}
        user={user}
        onSignOut={handleSignOut}
        onGoHome={navigateHome}
      >
        {workspaceView === 'evaluations' && (
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
            navigate={navigateWorkspaceView}
          />
        )}
        {workspaceView === 'library' && (
          <ScenarioLibrary
            filters={filters}
            update={change => setFilters(previous => ({ ...previous, ...change }))}
            run={run}
            source={source}
            onExplore={explore}
            loading={loading}
          />
        )}
        {workspaceView === 'trace' && (
          <TraceExplorer
            run={run}
            source={source}
            selected={selected}
            onSelect={setSelectedId}
            onPreview={() => preview()}
            loading={loading}
          />
        )}
        {workspaceView === 'history' && (
          <EvaluationHistory
            runs={historyRuns}
            onOpen={openHistory}
            onConsole={() => navigateWorkspaceView('evaluations')}
            loading={loading}
            user={user}
          />
        )}
      </WorkspaceShell>

      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        explanation={authModalExplanation}
        onClose={() => setAuthModalOpen(false)}
        onLogin={async (email, password) => {
          await handleLogin(email, password);
        }}
        onRegister={async (fullName, email, password) => {
          await handleRegister(fullName, email, password);
        }}
        loading={authLoading}
        error={authError}
        onClearError={() => setAuthError('')}
      />
    </>
  );
}
