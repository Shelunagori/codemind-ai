import crypto from 'crypto';
import { repairMojibake } from '../text/mojibake.js';

/**
 * Identifies the text a model reads for enrichment: title, company and description. A job whose
 * hash is unchanged never needs a new reading; whitespace, letter case and repaired characters do
 * not count as a change. The location is left out: a new city is added by rules, not by a model.
 * So are the prompt and the schema: a field they come to ask for is read on jobs posted from then
 * on, never by reading the stored ones again.
 */
export function enrichmentHash({ title, company, description }) {
  const text = [title, company, description]
    .map((value) => repairMojibake(value).replace(/\s+/g, ' ').trim().toLowerCase())
    .join('\n');
  return crypto.createHash('sha1').update(text).digest('hex');
}
