import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENRICH_GROUPS, ENRICHMENT_RESPONSE_FORMAT, fillOmitted, JOB_ENRICHMENT_SCHEMA, groupSchemas } from './schema.js';

test('the JSON schema meets strict mode: every object is closed and lists every property as required', () => {
  const walk = (node, where) => {
    if (node.properties) {
      assert.equal(node.additionalProperties, false, `${where}: additionalProperties`);
      assert.deepEqual([...node.required].sort(), Object.keys(node.properties).sort(), `${where}: required`);
      for (const [key, child] of Object.entries(node.properties)) walk(child, `${where}.${key}`);
    }
    if (node.items) walk(node.items, `${where}[]`);
  };
  walk(JOB_ENRICHMENT_SCHEMA, 'schema');
  assert.deepEqual(ENRICHMENT_RESPONSE_FORMAT, {
    type: 'json_schema',
    json_schema: { name: 'job_enrichment', strict: true, schema: JOB_ENRICHMENT_SCHEMA },
  });
});

test('the local group checks cover exactly the fields of the JSON schema', () => {
  assert.deepEqual(Object.keys(JOB_ENRICHMENT_SCHEMA.properties), ENRICH_GROUPS);
  for (const group of ENRICH_GROUPS) {
    assert.deepEqual(
      Object.keys(groupSchemas[group].shape).sort(),
      Object.keys(JOB_ENRICHMENT_SCHEMA.properties[group].properties).sort(),
      group
    );
  }
});

test('fillOmitted fills a left-out field that can be empty, and nothing else', () => {
  const filled = fillOmitted({ location: { locations: [] }, category: { primary: 'backend' } });
  assert.equal(filled.location.mustResideIn, null);
  assert.deepEqual(filled.location.remoteEligibleCountries, []);
  assert.equal(filled.location.remoteScope, null);
  assert.equal('isSoftwareRole' in filled.category, false);
  assert.equal('salary' in filled, false);
});
