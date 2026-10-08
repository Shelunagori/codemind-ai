import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addedKeywords, changedLines, hasKeyword, skillFit } from './keywords.js';

test('hasKeyword matches whole terms, including symbols', () => {
  const text = 'Built services in Node.js and C++; some JavaScript. Deployed on .NET and k8s.';
  assert.equal(hasKeyword(text, 'node.js'), true);
  assert.equal(hasKeyword(text, 'C++'), true);
  assert.equal(hasKeyword(text, '.NET'), true);
  assert.equal(hasKeyword(text, 'javascript'), true);
  assert.equal(hasKeyword(text, 'Java'), false);
  assert.equal(hasKeyword(text, 'C'), false);
  assert.equal(hasKeyword(text, ''), false);
});

test('skillFit splits skills and drops case duplicates', () => {
  const fit = skillFit('React and TypeScript on AWS', ['React', 'react', 'Kafka', 'AWS', null]);
  assert.deepEqual(fit, { have: ['react', 'AWS'], missing: ['Kafka'] });
});

test('addedKeywords lists only terms the tailoring introduced', () => {
  const added = addedKeywords('React developer', 'React developer using Kafka and gRPC', ['Kafka', 'kafka', 'gRPC', 'React', 'Go']);
  assert.deepEqual(added, ['Kafka', 'gRPC']);
});

test('changedLines returns new or rewritten lines, ignoring bullets and short lines', () => {
  const original = 'Summary\n• Built a payments API used by 2M customers\n• Led a team';
  const tailored = 'Summary\n- Built a payments API used by 2M customers\n- Built event pipelines on Kafka for order processing\n- Led a team';
  assert.deepEqual(changedLines(original, tailored), ['Built event pipelines on Kafka for order processing']);
});

test('hasKeyword counts a dictionary alias of the skill, keeping whole-term matching', () => {
  const text = 'Wrote golang services on k8s with a JavaScript front end and Full-Stack ownership';
  assert.equal(hasKeyword(text, 'Go'), true);
  assert.equal(hasKeyword(text, 'Kubernetes'), true);
  assert.equal(hasKeyword(text, 'Full Stack'), true);
  assert.equal(hasKeyword(text, 'Java'), false);
  assert.equal(hasKeyword(text, 'React'), false);
  assert.equal(hasKeyword('vi möts på kontoret', 'TypeScript'), false);
  assert.deepEqual(skillFit(text, ['Go', 'Kubernetes', 'Java']), { have: ['Go', 'Kubernetes'], missing: ['Java'] });
});
