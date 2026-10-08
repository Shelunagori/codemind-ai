// Score a resume against a job with no API key: a scripted client stands in for OpenAI, the way the
// tests run. Everything else is the real code: the prompt, the schema, the checks, the score worked
// out from the verdicts, and the usage event.
//
//   node examples/offline.js
import { createCodemind } from '../src/index.js';
import { job, models, resume } from './sample.js';

const scripted = {
  chat: {
    completions: {
      create: async (request) => {
        console.log(`→ ${request.model}: ${request.messages[1].content.length} characters of prompt`);
        const answer = {
          verdicts: [
            { id: 0, verdict: 'met', quote: 'Data engineer with 7 years of experience building batch and streaming pipelines.' },
            { id: 1, verdict: 'missing', quote: '' },
          ],
          matchedKeywords: ['Python', 'SQL', 'AWS'],
          topMissingKeywords: ['Spark', 'Kafka'],
          tailoringOpportunities: ['Show streaming work'],
        };
        return { choices: [{ message: { content: JSON.stringify(answer) } }], usage: { prompt_tokens: 2400, completion_tokens: 120 } };
      },
    },
  },
};

const ai = createCodemind({
  providers: { openai: { client: scripted } },
  models: () => models,
  onUsage: (event) => console.log(`usage: ${event.kind} ${event.model} ${event.tokensIn}+${event.tokensOut} tokens, $${event.costUsd.toFixed(5)}`),
});

const score = await ai.quickScoreResume(resume, job);
console.log(`\nscore ${score.score}/100`);
for (const r of score.requirements) console.log(`  ${r.verdict.padEnd(7)} ${r.text}`);
console.log(`  missing keywords: ${score.topMissingKeywords.join(', ')}`);
