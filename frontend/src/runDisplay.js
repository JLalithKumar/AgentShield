export function statusClass(value) {
  const normalized = String(value || '').toUpperCase();
  if (['BLOCK', 'BLOCKED', 'CRITICAL', 'FAIL', 'FAILED'].includes(normalized)) return 'danger';
  if (['ALLOW', 'ALLOWED', 'PASS', 'SUCCESS'].includes(normalized)) return 'success';
  if (['HIGH', 'MEDIUM', 'LOW'].includes(normalized)) return 'warning';
  return 'neutral';
}
export function normalizeResponse(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.results)) {
    throw new Error('The API response is missing a results array. Check docs/api-contract.md.');
  }
  return {
    ...data,
    total_tests: data.total_tests ?? data.results.length,
    passed: data.passed ?? data.results.filter((row) => row.passed === true).length,
    critical_regressions: data.critical_regressions ?? null,
    release_decision: String(data.release_decision || 'UNKNOWN').toUpperCase(),
  };
}
export function severityLabel(row) {
  const severity = String(row?.severity ?? '').toUpperCase();
  if (row?.passed === true && (severity === 'NONE' || severity === '')) return 'NO VIOLATION';
  return severity || 'NOT REPORTED';
}

export function releaseLabel(run) {
  const raw = String(run?.release_decision ?? '').toUpperCase();
  if (raw === 'BLOCK' || raw === 'BLOCKED') return 'BLOCKED';
  if (raw === 'ALLOW' || raw === 'ALLOWED') return 'ALLOWED';
  return raw || 'NOT REPORTED';
}
export function verdict(row) {
  if (row.passed === true) return 'PASS';
  if (row.passed === false) return 'FAIL';
  return 'UNKNOWN';
}
export function firstScenario(run) {
  return (run.results.find(row => row.passed === false) || run.results[0])?.scenario_id ?? null;
}
