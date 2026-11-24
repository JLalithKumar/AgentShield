import { describe, expect, it } from 'vitest';
import { API_BASE, API_ENDPOINTS, getApiBaseUrl } from '../api';

describe('Centralized API Configuration', () => {
  it('defaults to same-origin relative URLs without hardcoded host or port 8000', () => {
    const base = getApiBaseUrl('');
    expect(base).toBe('');
    expect(API_BASE).toBe('');

    // Ensure no hardcoded localhost:8000 exists in default endpoints
    Object.entries(API_ENDPOINTS).forEach(([key, endpoint]) => {
      const url = typeof endpoint === 'function' ? endpoint('RUN-123') : endpoint;
      expect(url).not.toContain('8000');
      expect(url).not.toContain('localhost');
      expect(url).not.toContain('127.0.0.1');
      expect(url.startsWith('/api/')).toBe(true);
    });
  });

  it('generates correct relative paths for all core API endpoints', () => {
    expect(API_ENDPOINTS.authMe).toBe('/api/auth/me');
    expect(API_ENDPOINTS.authRegister).toBe('/api/auth/register');
    expect(API_ENDPOINTS.authLogin).toBe('/api/auth/login');
    expect(API_ENDPOINTS.authLogout).toBe('/api/auth/logout');
    expect(API_ENDPOINTS.evaluations).toBe('/api/evaluations');
    expect(API_ENDPOINTS.evaluationDetails('RUN-ABC')).toBe('/api/evaluations/RUN-ABC');
    expect(API_ENDPOINTS.evaluationTraces('RUN-ABC')).toBe('/api/evaluations/RUN-ABC/traces');
    expect(API_ENDPOINTS.health).toBe('/api/health');
    expect(API_ENDPOINTS.scenarios).toBe('/api/scenarios');
  });

  it('normalizes VITE_API_BASE_URL when set to /api so it avoids double slashes or /api/api', () => {
    expect(getApiBaseUrl('/api')).toBe('');
    expect(getApiBaseUrl('/api/')).toBe('');
    expect(getApiBaseUrl('https://api.agentshield.ai/api')).toBe('https://api.agentshield.ai');
    expect(getApiBaseUrl('https://api.agentshield.ai/')).toBe('https://api.agentshield.ai');
  });
});
