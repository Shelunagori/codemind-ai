import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createCodemind } from '../index.js';
import { readEnrichmentBatch, recordBatchAnswer, submitEnrichmentBatch } from '../enrich/batch.js';
import { PROMPT_VERSION } from '../enrich/prompt.js';
import { DEFAULT_MODELS } from '../testing/fakeLlm.js';

// The Batch API as the enrichment worker drives it: one upload and one batch per submission, a
// retrieve per collection, and the output then error file read once the batch has ended.

function fakeBatchApi({ remote, files = {} }) {
  const calls = [];
  const client = {
    files: {
      create: async (args) => {
        calls.push(['files.create', { purpose: args.purpose, name: args.file.name, text: await args.file.text() }]);
        return { id: 'file-in' };
      },
      content: async (id) => {
        calls.push(['files.content', id]);
        return { text: async () => files[id] };
      },
    },
    batches: {
      create: async (args) => {
        calls.push(['batches.create', args]);
        return { id: 'batch-1', status: 'validating' };
      },
      retrieve: async (id) => {
        calls.push(['batches.retrieve', id]);
        return remote;
      },
    },
  };
  const events = [];
  createCodemind({ providers: { openai: { client } }, models: () => DEFAULT_MODELS, onUsage: (e) => events.push(e) });
  return { calls, events };
}

afterEach(() => createCodemind({}));

const JOB = { _id: 'job-1', title: 'Data Engineer', company: 'Acme', description: 'Build pipelines in Python.' };
const STEP = { model: 'gpt-5-nano', reasoningEffort: 'low', withFeedback: false };

test('a submission uploads the lines and starts one 24-hour batch, tagged with the prompt', async () => {
  const api = fakeBatchApi({ remote: null });
  const started = await submitEnrichmentBatch('gpt-5-nano', [{ job: JOB, step: STEP }]);
  assert.deepEqual(started, { batchId: 'batch-1', inputFileId: 'file-in', status: 'validating' });
  assert.equal(api.calls[0][0], 'files.create');
  assert.equal(api.calls[0][1].purpose, 'batch');
  assert.equal(api.calls[0][1].name, 'job-enrichment.jsonl');
  assert.equal(JSON.parse(api.calls[0][1].text).custom_id, 'job-1');
  assert.deepEqual(api.calls[1], [
    'batches.create',
    { input_file_id: 'file-in', endpoint: '/v1/chat/completions', completion_window: '24h', metadata: { purpose: 'job-enrichment', prompt: PROMPT_VERSION } },
  ]);
});

test('a batch still at work is only retrieved; an ended one has its output, then error, file read', async () => {
  let api = fakeBatchApi({ remote: { status: 'in_progress' } });
  assert.deepEqual(await readEnrichmentBatch('gpt-5-nano', 'batch-1'), { status: 'in_progress', open: true });
  assert.deepEqual(api.calls, [['batches.retrieve', 'batch-1']]);

  const line = (id, content) => JSON.stringify({ custom_id: id, response: { status_code: 200, body: { choices: [{ message: { content } }], usage: { prompt_tokens: 10, completion_tokens: 5 } } } });
  api = fakeBatchApi({
    remote: { status: 'expired', output_file_id: 'out', error_file_id: 'err' },
    files: { out: line('job-1', '{"a":1}'), err: JSON.stringify({ custom_id: 'job-2', error: { message: 'x' } }) },
  });
  const ended = await readEnrichmentBatch('gpt-5-nano', 'batch-1');
  assert.deepEqual(api.calls.map(([name, arg]) => `${name} ${arg}`), ['batches.retrieve batch-1', 'files.content out', 'files.content err']);
  assert.equal(ended.open, false);
  assert.equal(ended.leftFiles, true);
  assert.equal(ended.answers.get('job-1').text, '{"a":1}');
  assert.ok(ended.answers.get('job-2').error);

  fakeBatchApi({ remote: { status: 'failed' } });
  const empty = await readEnrichmentBatch('gpt-5-nano', 'batch-1');
  assert.equal(empty.leftFiles, false);
  assert.equal(empty.answers.size, 0);
});

test('a batch answer is metered at half price as its attempt of the job, and its cost returned', async () => {
  const api = fakeBatchApi({ remote: null });
  const cost = await recordBatchAnswer({ model: 'gpt-5-nano', attempt: 2, ref: 'job-1', answer: { tokensIn: 1_000_000, tokensOut: 0, cachedIn: 0 } });
  assert.equal(cost, 0.025);
  assert.equal(api.events.length, 1);
  const { period, ...event } = api.events[0];
  assert.match(period, /^\d{4}-\d{2}$/);
  assert.deepEqual(event, {
    userId: null,
    kind: 'job_enrich',
    model: 'gpt-5-nano',
    promptVersion: PROMPT_VERSION,
    attempt: 2,
    tokensIn: 1_000_000,
    tokensOut: 0,
    cachedIn: 0,
    costUsd: 0.025,
    batch: true,
    flex: false,
    latencyMs: 0,
    ok: true,
    error: '',
    ref: 'job-1',
    requestId: '',
  });
});
