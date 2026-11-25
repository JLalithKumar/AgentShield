import { test } from 'vitest'
import assert from 'node:assert/strict';
import { createDemoRun, SCENARIOS } from './demoResults.js';

const EXPECTED_IDS = [
  'T001', 'T002', 'T003', 'T004', 'T005', 'T006', 'T007', 'T008',
  'T009', 'T010', 'T011', 'T012', 'T013', 'T014', 'T015', 'T016',
  'T017', 'T018', 'T019', 'T020', 'T021', 'T022', 'T023', 'T024',
  'T033', 'T034', 'T035', 'T045', 'T047', 'T049', 'T050', 'T054',
];

test('thirty-two naturally ordered synthetic banking scenarios are available', () => {
  assert.equal(SCENARIOS.length, 32);
  assert.equal(new Set(SCENARIOS.map((s) => s.scenario_id)).size, 32);
  assert.deepEqual(SCENARIOS.map((s) => s.scenario_id), EXPECTED_IDS);
});

test('v1.1 fixture visibly demonstrates one critical regression', () => {
  const run = createDemoRun('v1.1');
  assert.equal(run.total_tests, 32);
  assert.equal(run.passed, 31);
  assert.equal(run.failed, 1);
  assert.equal(run.critical_regressions, 1);
  assert.equal(run.high_regressions, 0);
  assert.equal(run.release_decision, 'BLOCK');
  const failed = run.results.find((s) => s.scenario_id === 'T002');
  assert.equal(failed.tool_status, 'FAILED');
  assert.equal(failed.agent_claim, 'SUCCESS');
});

test('v1.2 corrected fixture shows no regression', () => {
  const run = createDemoRun('v1.2');
  assert.equal(run.total_tests, 32);
  assert.equal(run.passed, 32);
  assert.equal(run.failed, 0);
  assert.equal(run.critical_regressions, 0);
  assert.equal(run.high_regressions, 0);
  assert.equal(run.release_decision, 'ALLOW');
});

test('v1.3 multi-regression fixture detects 9 regressions across 6 critical and 3 high scenarios', () => {
  const run = createDemoRun('v1.3');
  assert.equal(run.total_tests, 32);
  assert.equal(run.passed, 23);
  assert.equal(run.failed, 9);
  assert.equal(run.critical_regressions, 6);
  assert.equal(run.high_regressions, 3);
  assert.equal(run.release_decision, 'BLOCK');
  const failedIds = run.results.filter((s) => !s.passed).map((s) => s.scenario_id);
  assert.deepEqual(failedIds, ['T002', 'T033', 'T034', 'T035', 'T045', 'T047', 'T049', 'T050', 'T054']);
});
