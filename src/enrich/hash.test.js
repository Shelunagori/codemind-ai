import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enrichmentHash } from './hash.js';

test('the content hash ignores whitespace, letter case and repaired characters, and changes with the text', () => {
  const hash = enrichmentHash({ title: 'Senior Engineer', company: 'Acme', description: 'Build   APIs.\nRemote.' });
  assert.match(hash, /^[0-9a-f]{40}$/);
  assert.equal(enrichmentHash({ title: ' senior engineer ', company: 'ACME', description: 'Build APIs. Remote.' }), hash);
  assert.notEqual(enrichmentHash({ title: 'Senior Engineer', company: 'Acme', description: 'Build APIs. Hybrid.' }), hash);

  const garbled = Buffer.from('Ubicación: LATAM', 'utf8').toString('latin1');
  assert.equal(
    enrichmentHash({ title: 'T', company: '', description: garbled }),
    enrichmentHash({ title: 'T', company: '', description: 'Ubicación: LATAM' })
  );
});
