export function statusClass(value) {
  const normalized = String(value || '').toUpperCase();
  if (['BLOCK', 'BLOCKED', 'CRITICAL', 'FAIL', 'FAILED'].includes(normalized)) return 'danger';
  if (['ALLOW', 'ALLOWED', 'PASS', 'SUCCESS', 'COMPLETED'].includes(normalized)) return 'success';
  if (['HIGH', 'MEDIUM', 'LOW', 'WARNING', 'REGRESSION'].includes(normalized)) return 'warning';
  return 'neutral';
}

export function compareScenarioIds(a, b) {
  const parse = (id) => {
    const raw = String(id || '').trim();
    const match = raw.match(/^([A-Za-z-]+?)(\d+)$/);
    if (!match) return { prefix: raw.toUpperCase(), num: 0, raw };
    return { prefix: match[1].toUpperCase(), num: Number(match[2]), raw };
  };
  const left = parse(a);
  const right = parse(b);
  if (left.prefix !== right.prefix) return left.prefix.localeCompare(right.prefix);
  if (left.num !== right.num) return left.num - right.num;
  return left.raw.localeCompare(right.raw);
}

export function sortByScenarioId(items) {
  if (!Array.isArray(items)) return [];
  return [...items].sort((left, right) => compareScenarioIds(left?.scenario_id, right?.scenario_id));
}

export function normalizeResponse(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.results)) {
    throw new Error('The API response is missing a results array. Check docs/api-contract.md.');
  }
  const results = sortByScenarioId(data.results);
  const totalTests = data.total_tests ?? results.length;
  const passed = data.passed ?? results.filter((row) => row.passed === true).length;
  const failed = data.failed ?? Math.max(0, totalTests - passed);
  const regressedRows = results.filter((row) => row.is_new_regression === true);
  const criticalRegressions = data.critical_regressions
    ?? regressedRows.filter((row) => String(row.severity || '').toUpperCase() === 'CRITICAL').length;
  const highRegressions = data.high_regressions
    ?? regressedRows.filter((row) => String(row.severity || '').toUpperCase() === 'HIGH').length;
  const mediumRegressions = data.medium_regressions
    ?? regressedRows.filter((row) => String(row.severity || '').toUpperCase() === 'MEDIUM').length;
  const lowRegressions = data.low_regressions
    ?? regressedRows.filter((row) => String(row.severity || '').toUpperCase() === 'LOW').length;
  const regressionScenarios = data.regression_scenarios ?? regressedRows.length;

  let totalViolations = data.total_violations;
  let violationCounts = data.violation_counts;
  if (totalViolations == null || !violationCounts) {
    const counts = {};
    for (const row of results) {
      if (row.passed === true) continue;
      if (Array.isArray(row.violations) && row.violations.length > 0) {
        for (const v of row.violations) {
          const code = String(v?.code || 'UNCLASSIFIED_VIOLATION');
          counts[code] = (counts[code] || 0) + 1;
        }
      } else if (row.policy_violation) {
        const code = String(row.policy_violation);
        counts[code] = (counts[code] || 0) + 1;
      }
    }
    violationCounts = counts;
    totalViolations = Object.values(counts).reduce((sum, n) => sum + n, 0);
  }

  return {
    ...data,
    results,
    total_tests: totalTests,
    passed,
    failed,
    critical_regressions: criticalRegressions,
    high_regressions: highRegressions,
    medium_regressions: mediumRegressions,
    low_regressions: lowRegressions,
    regression_scenarios: regressionScenarios,
    violation_counts: violationCounts,
    total_violations: totalViolations,
    release_decision: String(data.release_decision || 'UNKNOWN').toUpperCase(),
  };
}

export function severityTone(severity) {
  const normalized = String(severity || '').toUpperCase();
  if (normalized === 'CRITICAL') return 'danger';
  if (['HIGH', 'MEDIUM', 'LOW'].includes(normalized)) return 'warning';
  return 'neutral';
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
