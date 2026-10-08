import { toFile } from 'openai';
import { clientFor } from './client.js';

// OpenAI's Batch API: a file of requests answered within a day at half price. The caller keeps
// the batch's id and its own record of what went in; this side only talks to the API.

// The statuses of a batch still at work; any other means it has ended (completed, failed, expired,
// cancelled) and its files, if any, can be read.
export const OPEN_BATCH_STATUSES = new Set(['validating', 'in_progress', 'finalizing', 'cancelling']);

/**
 * Upload `jsonl` (one chat.completions request per line, batchLines in enrich/batch.js) and start a
 * batch on `model`'s provider. Returns { batchId, inputFileId, status }.
 *
 * @param {string} model
 * @param {string} jsonl
 * @param {{ filename?: string, metadata?: object }} [options]
 * @returns {Promise<{ batchId: string, inputFileId: string, status: string }>}
 */
export async function startBatch(model, jsonl, { filename = 'batch.jsonl', metadata } = {}) {
  const client = clientFor(model);
  const file = await client.files.create({ file: await toFile(Buffer.from(jsonl, 'utf8'), filename), purpose: 'batch' });
  const remote = await client.batches.create({
    input_file_id: file.id,
    endpoint: '/v1/chat/completions',
    completion_window: '24h',
    ...(metadata ? { metadata } : {}),
  });
  return { batchId: remote.id, inputFileId: file.id, status: remote.status };
}

/**
 * Where a batch stands: { status, open } while it works; once it has ended, also `outputs`, the
 * text of its output and error files in that order (a cancelled or expired batch still returns,
 * and bills, the requests that finished), empty when it left none.
 *
 * @param {string} model
 * @param {string} batchId
 * @returns {Promise<{ status: string, open: boolean, outputs?: string[] }>}
 */
export async function readBatch(model, batchId) {
  const client = clientFor(model);
  const remote = await client.batches.retrieve(batchId);
  if (OPEN_BATCH_STATUSES.has(remote.status)) return { status: remote.status, open: true };
  const outputs = [];
  for (const fileId of [remote.output_file_id, remote.error_file_id].filter(Boolean)) {
    const response = await client.files.content(fileId);
    outputs.push(await response.text());
  }
  return { status: remote.status, open: false, outputs };
}
