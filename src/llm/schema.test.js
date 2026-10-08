import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PARSE_RESUME_RESPONSE_FORMAT } from '../parse/schema.js';
import { SCORE_RESPONSE_FORMAT } from '../ats/schema.js';
import { TAILOR_RESPONSE_FORMAT } from '../tailor/schema.js';
import { SCORE_WEIGHTS } from '../ats/index.js';
import { cleanStructuredResume } from '../resume/structuredResume.js';

// Strict mode rejects a schema where any object leaves a property optional or allows extras.
function assertStrict(schema, at = 'root') {
  if (schema.type === 'object') {
    assert.deepEqual([...schema.required].sort(), Object.keys(schema.properties).sort(), `${at}: required`);
    assert.equal(schema.additionalProperties, false, `${at}: additionalProperties`);
    for (const [key, child] of Object.entries(schema.properties)) assertStrict(child, `${at}.${key}`);
  } else if (schema.type === 'array') {
    assertStrict(schema.items, `${at}[]`);
  }
}

test('ATS response formats are strict JSON schemas', () => {
  for (const format of [SCORE_RESPONSE_FORMAT, PARSE_RESUME_RESPONSE_FORMAT, TAILOR_RESPONSE_FORMAT]) {
    assert.equal(format.type, 'json_schema');
    assert.equal(format.json_schema.strict, true);
    assertStrict(format.json_schema.schema);
  }
});

test('the score schema asks for a verdict per requirement and no number: the score is worked out in code', () => {
  const props = SCORE_RESPONSE_FORMAT.json_schema.schema.properties;
  assert.equal(Object.keys(props)[0], 'verdicts', 'the verdicts come first');
  for (const key of ['score', 'breakdown', 'matchedRequirements']) assert.equal(key in props, false, key);
  const verdict = props.verdicts.items.properties;
  assert.deepEqual(Object.keys(verdict), ['id', 'verdict', 'quote']);
  assert.deepEqual(verdict.verdict.enum, ['met', 'weak', 'missing']);
  for (const key of ['verdicts', 'matchedKeywords', 'topMissingKeywords', 'tailoringOpportunities']) assert.ok(props[key].maxItems > 0, `${key} is bounded`);
  assert.deepEqual(Object.keys(SCORE_WEIGHTS).sort(), ['education', 'experience', 'preferredSkills', 'requiredSkills', 'responsibilities']);
});

test('the parse schema has exactly the resume form fields', () => {
  const fields = Object.keys(PARSE_RESUME_RESPONSE_FORMAT.json_schema.schema.properties).sort();
  assert.deepEqual(fields, Object.keys(cleanStructuredResume({})).sort());
});

