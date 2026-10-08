import { test } from 'node:test';
import assert from 'node:assert/strict';
import { batchLines, parseBatchOutput } from './batch.js';

const JOB = { _id: 'job-1', title: 'Senior Backend Engineer', company: 'Acme', location: 'Remote', description: 'Build APIs.' };

const FIRST_STEP = { model: 'gpt-5-nano', reasoningEffort: 'low', withFeedback: false };
const RETRY_STEP = { model: 'gpt-5-nano', reasoningEffort: 'low', withFeedback: true };

test('each batch line is the first enrichment attempt for one job, as a chat completion request', () => {
  const lines = batchLines([
    { job: JOB, step: FIRST_STEP },
    { job: { ...JOB, _id: 'job-2' }, step: FIRST_STEP },
  ])
    .split('\n')
    .map((line) => JSON.parse(line));
  assert.equal(lines.length, 2);
  assert.deepEqual([lines[0].custom_id, lines[0].method, lines[0].url, lines[1].custom_id], ['job-1', 'POST', '/v1/chat/completions', 'job-2']);

  const { body } = lines[0];
  assert.equal(body.model, 'gpt-5-nano');
  assert.equal(body.reasoning_effort, 'low');
  assert.equal(body.max_completion_tokens, 8000);
  assert.equal(body.response_format.type, 'json_schema');
  assert.equal('temperature' in body, false);
  assert.match(body.messages[1].content, /^<job_posting>\nTITLE: Senior Backend Engineer\nCOMPANY: Acme/, 'the posting goes in fenced');
});

test('one batch mixes first attempts with retries, and a retry names the checks it failed', () => {
  const lines = batchLines([
    { job: JOB, step: FIRST_STEP },
    { job: { ...JOB, _id: 'job-2' }, step: RETRY_STEP, failedChecks: ['salary.max is not in the posting'] },
  ])
    .split('\n')
    .map((line) => JSON.parse(line));

  assert.equal(lines[0].body.messages[1].content.includes('FAILED THESE CHECKS'), false);
  assert.match(lines[1].body.messages[1].content, /FAILED THESE CHECKS/);
  assert.match(lines[1].body.messages[1].content, /salary\.max is not in the posting/);
});

test('batch output lines become answers with token usage, or per-job errors', () => {
  const output = [
    JSON.stringify({
      custom_id: 'job-1',
      response: { status_code: 200, body: { choices: [{ message: { content: ' {"a":1} ' } }], usage: { prompt_tokens: 3000, completion_tokens: 400, prompt_tokens_details: { cached_tokens: 2560 } } } },
      error: null,
    }),
    JSON.stringify({ custom_id: 'job-2', response: { status_code: 400, body: { error: { message: 'Invalid schema' } } }, error: null }),
    JSON.stringify({
      custom_id: 'job-3',
      response: null,
      error: { code: 'batch_expired', message: 'This request could not be executed before the completion window expired.' },
    }),
    'not json',
    '',
  ].join('\n');

  const answers = parseBatchOutput(output);
  assert.equal(answers.size, 3);
  assert.deepEqual(answers.get('job-1'), { text: '{"a":1}', tokensIn: 3000, tokensOut: 400, cachedIn: 2560 });
  assert.deepEqual(answers.get('job-2'), { error: 'Invalid schema' });
  assert.match(answers.get('job-3').error, /completion window expired/);
});
