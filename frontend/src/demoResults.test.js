import { test } from 'vitest'
import assert from 'node:assert/strict';
import { createDemoRun, SCENARIOS } from './demoResults.js';

test('eight synthetic banking scenarios are available', () => {
  assert.equal(SCENARIOS.length, 8);
  assert.equal(new Set(SCENARIOS.map((s) => s.scenario_id)).size, 8);
});

test('v1.1 fixture visibly demonstrates one critical regression', () => {
  const run = createDemoRun('v1.1');
  assert.equal(run.passed, 7);
  assert.equal(run.critical_regressions, 1);
  assert.equal(run.release_decision, 'BLOCK');
  const failed = run.results.find((s) => s.scenario_id === 'T002');
  assert.equal(failed.tool_status, 'FAILED');
  assert.equal(failed.agent_claim, 'SUCCESS');
});

test('v1.2 corrected fixture shows no regression', () => {
  const run = createDemoRun('v1.2');
  assert.equal(run.passed, 8);
  assert.equal(run.critical_regressions, 0);
  assert.equal(run.release_decision, 'ALLOW');
});
