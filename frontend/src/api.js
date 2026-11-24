/**
 * AgentShield Centralized API Configuration & Endpoints
 *
 * Defaults to same-origin relative '/api' URLs for production and Docker deployments,
 * routing requests through the Nginx reverse proxy on port 3000.
 * In local development, the Vite dev server proxy forwards '/api' to 'http://127.0.0.1:8000'.
 */

export function getApiBaseUrl(override) {
  const envUrl = override !== undefined ? override : import.meta.env.VITE_API_BASE_URL;
  if (typeof envUrl === 'string' && envUrl.trim() !== '') {
    const trimmed = envUrl.trim().replace(/\/$/, '');
    // If VITE_API_BASE_URL is '/api' or ends with '/api', normalize so appending '/api/...' does not duplicate
    if (trimmed === '/api' || trimmed.endsWith('/api')) {
      return trimmed.slice(0, -4);
    }
    return trimmed;
  }
  // Default to empty string for same-origin relative paths: `/api/...`
  return '';
}

export const API_BASE = getApiBaseUrl();

export const API_ENDPOINTS = {
  authMe: `${API_BASE}/api/auth/me`,
  authRegister: `${API_BASE}/api/auth/register`,
  authLogin: `${API_BASE}/api/auth/login`,
  authLogout: `${API_BASE}/api/auth/logout`,
  evaluations: `${API_BASE}/api/evaluations`,
  evaluationDetails: (runId) => `${API_BASE}/api/evaluations/${encodeURIComponent(runId)}`,
  evaluationTraces: (runId) => `${API_BASE}/api/evaluations/${encodeURIComponent(runId)}/traces`,
  health: `${API_BASE}/api/health`,
  scenarios: `${API_BASE}/api/scenarios`,
  scenarioDetails: (id) => `${API_BASE}/api/scenarios/${encodeURIComponent(id)}`,
};

/**
 * Extracts the CSRF token from the 'agentshield_csrf' cookie for Double-Submit protection.
 */
export function getCsrfToken() {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp('(^|;\\s*)agentshield_csrf=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : '';
}
