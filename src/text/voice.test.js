import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aiTellWords, proseIssues, PROSE_VOICE_RULES, RESUME_VOICE_RULES } from './voice.js';
import { writeInVoice } from '../writing/letters/write.js';
import { resumeWarnings } from '../checks/index.js';

const codes = (issues) => issues.map((i) => i.code);
const DASH = String.fromCharCode(0x2014);

test('AI-sounding words are found as whole words, and the candidate\'s or employer\'s own are left alone', () => {
  assert.deepEqual(aiTellWords('Leveraged Kafka to build a robust, seamless pipeline.'), ['leveraged', 'robust', 'seamless']);
  assert.deepEqual(aiTellWords('Built fostering tools for a foster-care nonprofit.', 'foster-care nonprofit'), ['fostering']);
  assert.deepEqual(aiTellWords('Ran the robust testing program.', 'We need robust testing.'), [], 'the job used the word first');
  assert.deepEqual(aiTellWords('Worked on Robustness Gym and LeverageLabs.'), [], 'not inside another word');
  assert.deepEqual(aiTellWords(`It${String.fromCharCode(0x2019)}s worth noting that I shipped it.`), ["it's worth noting"], 'a typographic apostrophe still matches');
});

test('the prompts ban what the checks look for', () => {
  for (const word of ['delve', 'leverage', 'robust', 'seamless', 'spearheaded', 'passionate', 'in order to']) {
    assert.ok(RESUME_VOICE_RULES.includes(word) && PROSE_VOICE_RULES.includes(word), word);
  }
  assert.match(PROSE_VOICE_RULES, /Never use a long dash/);
});

test('connected writing: dashes, threes, flat cadence', () => {
  const dashy = `I built the billing service ${DASH} alone ${DASH} in Go. It ran for years.`;
  assert.ok(codes(proseIssues(dashy)).includes('dashes'));
  assert.ok(!codes(proseIssues(`I built the billing service ${DASH} alone. It ran for years.`)).includes('dashes'), 'one is allowed');

  const threes = 'I built APIs, queues, and caches. I led design, review, and rollout. I hired, trained, and mentored. It worked. We shipped.';
  assert.ok(codes(proseIssues(threes)).includes('rule_of_three'));

  const flat = Array.from({ length: 8 }, (_, i) => `I built the ${i} billing service for our merchants last year.`).join(' ');
  assert.ok(codes(proseIssues(flat)).includes('flat_cadence'));
  const varied = 'I built billing. It took two years of steady work across three teams, a rewrite of the ledger and a migration nobody wanted. It held. Merchants noticed within a week because payouts stopped arriving late on Fridays. Then we scaled it. The same design now carries four times the volume it launched with, on the same hardware. I would do it again. Most of all I learned to cut scope early.';
  assert.ok(!codes(proseIssues(varied)).includes('flat_cadence'));
});

test('a letter: template opener, and nothing about this job', () => {
  const letter = 'Dear team,\n\nI am writing to express my interest in the role. I like building things. I work hard.\n\nBest,\nJo';
  const issues = codes(proseIssues(letter, { letter: true, jobTerms: ['Go', 'Kafka', 'PostgreSQL'] }));
  assert.ok(issues.includes('template_opener'));
  assert.ok(issues.includes('generic_letter'));
  const specific = 'Dear team,\n\nAt Acme I moved our billing to Go and Kafka, and payouts stopped arriving late.\n\nBest,\nJo';
  assert.deepEqual(codes(proseIssues(specific, { letter: true, jobTerms: ['Go', 'Kafka', 'PostgreSQL'] })), []);
});

test('a draft with problems is revised once, and the better draft is kept', async () => {
  const calls = [];
  const check = (text) => proseIssues(text);
  const clean = await writeInVoice({ write: async (revise) => (calls.push(revise), 'I built billing in Go.'), check });
  assert.equal(clean, 'I built billing in Go.');
  assert.equal(calls.length, 1, 'a clean draft costs one call');

  calls.length = 0;
  const fixed = await writeInVoice({ write: async (revise) => (calls.push(revise), revise ? 'I built billing in Go.' : 'I leveraged Go to build robust billing.'), check });
  assert.equal(fixed, 'I built billing in Go.');
  assert.equal(calls.length, 2);
  assert.match(calls[1], /"leveraged", "robust"/, 'the revision is told exactly what to fix');
  assert.match(calls[1], /DRAFT:\nI leveraged Go/);

  const worse = await writeInVoice({ write: async (revise) => (revise ? 'I leveraged robust, seamless, crucial synergy.' : 'I leveraged Go.'), check });
  assert.equal(worse, 'I leveraged Go.', 'a revision that is no better is dropped');
  const failed = await writeInVoice({ write: async (revise) => { if (revise) throw new Error('timeout'); return 'I leveraged Go.'; }, check });
  assert.equal(failed, 'I leveraged Go.', 'a failed revision leaves the first draft');
});

test('the tailored resume page lists AI-sounding lines', () => {
  const warnings = resumeWarnings({ summary: 'Results-driven engineer.', skills: [], experience: [{ company: 'Acme', achievements: ['Spearheaded a seamless migration to Go.'] }] });
  const voice = warnings.filter((w) => w.code === 'ai_tell');
  assert.equal(voice.length, 2);
  assert.match(voice[1].message, /"seamless", "spearheaded"|"spearheaded", "seamless"/);
});
