import { buildRequest, cachedTokensOf, costFor, recordUsage } from '../llm/index.js';
import { readBatch, startBatch } from '../llm/batch.js';
import { enrichmentRequest } from './enrichJob.js';
import { PROMPT_VERSION } from './prompt.js';

// OpenAI Batch API files. Input: one line per job with one enrichment attempt as a chat completion
// request, the job id as custom_id. Output (and error) files: one line per request.

/**
 * The JSONL input file for a batch. Each entry is { job, step, failedChecks }, so one batch can
 * mix first attempts with second attempts -- a retry names the checks its first answer failed, and
 * the Batch API takes a different model per line.
 */
export function batchLines(entries) {
  return entries
    .map(({ job, step, failedChecks = [] }) =>
      JSON.stringify({
        custom_id: String(job._id),
        method: 'POST',
        url: '/v1/chat/completions',
        body: buildRequest(enrichmentRequest(job, step, failedChecks)),
      })
    )
    .join('\n');
}

/**
 * Output or error file lines → Map(job id → { text, tokensIn, tokensOut, cachedIn } or { error }).
 * Lines that are not JSON or carry no custom_id are skipped.
 */
export function parseBatchOutput(jsonl) {
  const results = new Map();
  for (const line of String(jsonl || '').split('\n')) {
    if (!line.trim()) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (!entry?.custom_id) continue;

    const body = entry.response?.body;
    const status = entry.response?.status_code;
    if (entry.error || status !== 200 || !body) {
      const error = entry.error?.message || body?.error?.message || `status ${status ?? 'unknown'}`;
      results.set(entry.custom_id, { error });
      continue;
    }
    results.set(entry.custom_id, {
      text: body.choices?.[0]?.message?.content?.trim() || '',
      tokensIn: body.usage?.prompt_tokens || 0,
      tokensOut: body.usage?.completion_tokens || 0,
      cachedIn: cachedTokensOf(body.usage),
    });
  }
  return results;
}

/**
 * Submit `entries` (as batchLines takes them) as one Batch API job on `model`'s provider.
 * Returns { batchId, inputFileId, status }.
 *
 * @param {string} model
 * @param {{ job: object, step: object, failedChecks?: string[] }[]} entries
 * @returns {Promise<{ batchId: string, inputFileId: string, status: string }>}
 */
export function submitEnrichmentBatch(model, entries) {
  return startBatch(model, batchLines(entries), { filename: 'job-enrichment.jsonl', metadata: { purpose: 'job-enrichment', prompt: PROMPT_VERSION } });
}

/**
 * Where an enrichment batch stands: { status, open }, and once it has ended `answers`, its output
 * and error files read into one Map (parseBatchOutput), and `leftFiles`, whether it left any.
 *
 * @param {string} model
 * @param {string} batchId
 * @returns {Promise<{ status: string, open: boolean, leftFiles?: boolean, answers?: Map<string, object> }>}
 */
export async function readEnrichmentBatch(model, batchId) {
  const state = await readBatch(model, batchId);
  if (state.open) return state;
  const answers = new Map();
  for (const text of state.outputs) for (const [id, answer] of parseBatchOutput(text)) answers.set(id, answer);
  return { status: state.status, open: false, leftFiles: state.outputs.length > 0, answers };
}

/**
 * Meter one batch answer (half price) as enrichment's attempt `attempt` of job `ref`, through the
 * app's usage recorder, and return what it cost.
 *
 * @param {{ model: string, attempt: number, ref: *, answer: { tokensIn: number, tokensOut: number, cachedIn: number } }} input
 * @returns {Promise<number>} What the answer cost, in USD.
 */
export async function recordBatchAnswer({ model, attempt, ref, answer }) {
  await recordUsage({
    kind: 'job_enrich',
    model,
    promptVersion: PROMPT_VERSION,
    attempt,
    ref,
    tokensIn: answer.tokensIn,
    tokensOut: answer.tokensOut,
    cachedIn: answer.cachedIn,
    ok: true,
    batch: true,
  });
  return costFor(model, answer.tokensIn, answer.tokensOut, { batch: true, cachedIn: answer.cachedIn });
}
