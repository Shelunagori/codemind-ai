import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gapPassProgressed } from './pipeline.js';

test('a gap pass is kept when the score rose, or when more verdicts are met and the score fell no further than the noise', () => {
  const met = (n, score) => ({ score, requirements: Array.from({ length: n }, () => ({ verdict: 'met' })), requiredSkillVerdicts: [{ verdict: 'weak' }] });
  assert.equal(gapPassProgressed(met(3, 70), met(3, 72)), true, 'the score rose');
  assert.equal(gapPassProgressed(met(3, 70), met(5, 69)), true, 'two more verdicts met, one point down: noise');
  assert.equal(gapPassProgressed(met(3, 70), met(5, 66)), false, 'four points down is more than noise');
  assert.equal(gapPassProgressed(met(3, 70), met(3, 70)), false, 'nothing moved');
  assert.equal(gapPassProgressed(met(3, 70), met(2, 70)), false, 'a verdict lost');
});
