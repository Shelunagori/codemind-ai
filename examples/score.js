// Score a resume against a job with a real model call (OpenAI, a fraction of a cent).
//
//   OPENAI_API_KEY=sk-... node examples/score.js
import { createCodemind } from '../src/index.js';
import { job, models, resume } from './sample.js';

if (!process.env.OPENAI_API_KEY) {
  console.error('Set OPENAI_API_KEY, or run examples/offline.js, which needs no key.');
  process.exit(1);
}

const ai = createCodemind({
  providers: { openai: { apiKey: process.env.OPENAI_API_KEY } },
  models: () => models,
  onUsage: (event) => console.log(`usage: ${event.kind} ${event.model} ${event.tokensIn}+${event.tokensOut} tokens, $${event.costUsd.toFixed(5)}`),
  logger: console,
});

const score = await ai.quickScoreResume(resume, job);
console.log(`\nscore ${score.score}/100 (${score.model})`);
for (const r of score.requirements) console.log(`  ${r.verdict.padEnd(7)} ${r.text}${r.quote ? `  — "${r.quote}"` : ''}`);
console.log(`  matched: ${score.matchedKeywords.join(', ')}`);
console.log(`  missing: ${score.topMissingKeywords.join(', ')}`);
