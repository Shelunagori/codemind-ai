import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReferralPrompt, CONNECTION_NOTE_LIMIT, fitConnectionNote, referralIssues } from './referral.js';

const resumeText = 'Backend engineer. Built Go services for 2,000 merchants at Acme.';

test('the prompt says who, where, for what, and whether they know each other', () => {
  const cold = buildReferralPrompt({ personName: 'Alex Kim', personRole: 'EM', company: 'Globex', jobTitle: 'Backend Engineer', resumeText, format: 'email' });
  assert.match(cold, /RECIPIENT: Alex Kim \(EM\)/);
  assert.match(cold, /not stated: this is a cold message/);
  assert.match(cold, /Subject:/);
  const warm = buildReferralPrompt({ personName: 'Alex', relationship: 'Same bootcamp in 2021', company: 'Globex', jobTitle: 'X', resumeText, format: 'connection_note' });
  assert.match(warm, /HOW_THEY_KNOW_EACH_OTHER: Same bootcamp in 2021/);
  assert.match(warm, new RegExp(`${CONNECTION_NOTE_LIMIT} characters or fewer`));
});

test('a connection note is cut to the limit at a sentence, or a word', () => {
  const long = `${'I build Go services for merchants. '.repeat(12)}Would you refer me?`;
  const fitted = fitConnectionNote(long);
  assert.ok(fitted.length <= CONNECTION_NOTE_LIMIT);
  assert.ok(fitted.endsWith('.'));
  assert.equal(fitConnectionNote('Short note.'), 'Short note.');
  const words = fitConnectionNote('word '.repeat(80));
  assert.ok(words.length <= CONNECTION_NOTE_LIMIT && !words.endsWith(' '));
});

test('a draft is checked for invented facts, voice and length', () => {
  const codes = (text, opts = {}) => referralIssues(text, { resumeText, format: 'linkedin_message', ...opts }).map((i) => i.code);
  assert.deepEqual(codes('Hi Alex, I built Go services for 2,000 merchants at Acme. Would you refer me?'), []);
  assert.ok(codes('Hi Alex, I built Go services for 20,000 merchants. Would you refer me?').includes('fact'));
  assert.ok(codes('Hi Alex, I leveraged Go to build robust services. Would you refer me?').includes('ai_tell'));
  assert.ok(codes('x '.repeat(200), { format: 'connection_note' }).includes('length'));
  assert.deepEqual(codes('Hi Alex, we met at the 2021 bootcamp. Would you refer me?', { relationship: 'Same bootcamp in 2021' }), [], 'the relationship backs its own facts');
});
