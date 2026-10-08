import { lower, squash } from './text.js';

// ── Estimated figures ──────────────────────────────────────────────────────
//
// Most bullets state no result (71% in production), and a rewrite may not invent one. So the
// model may add a realistic figure to a few of the most relevant ones, as a clause of its own
// ("…, cutting response times by ~30%"), and says which clause it added. Each one goes into the
// resume and is listed for the candidate to edit to their real number or remove; the clause is
// what is taken out, so the rest of the bullet stands as written.

// How many a resume may carry is the mode's (style.js TAILOR_MODES maxEstimates): the
// score-first mode answers each measured requirement with a figure, and a posting can ask for six.

// A believable figure, not an impressive one: no percentage above this and no multiplier.
const MAX_ESTIMATE_PERCENT = 40;
/** True when an estimate claims more than a hiring manager would believe unasked: "~60%", "3x", "10×". */
export function overstatedEstimate(clause) {
  const text = String(clause || '');
  if (/\b\d+(?:\.\d+)?\s*(?:x|×)(?![a-z])/i.test(text) || /\b(?:doubl|tripl|quadrupl)\w*/i.test(text)) return true;
  return (text.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)/gi) || []).some((p) => parseFloat(p) > MAX_ESTIMATE_PERCENT);
}

const tidy = (text) =>
  squash(text)
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/[,;:]+(\.?)$/, '$1')
    .trim();

/** The estimate's clause as it is shown and edited: "cutting response times by ~30%". */
export const estimateClause = (clause) => squash(clause).replace(/^[,;:\s]+|[.,;\s]+$/g, '');

// Two clauses that end the same way state the same figure of the same thing ("…and reducing
// recurring production issues by ~15%" is "reducing recurring production issues by ~15%" again).
export const sameFigure = (a, b) => {
  const tail = (c) => lower(estimateClause(c)).split(/\s+/).slice(-4).join(' ');
  return Boolean(tail(a)) && tail(a) === tail(b);
};

/** A bullet without its estimate clause, or null when the clause is not in it. */
export function withoutEstimate(text, clause) {
  const at = clause ? text.lastIndexOf(clause) : -1;
  if (at < 0) return null;
  const rest = tidy(text.slice(0, at) + text.slice(at + clause.length));
  return rest && rest !== tidy(text) ? rest : null;
}

/** A bullet with an estimate clause at its end: "Optimized X." + "cutting ~25%" gives "Optimized X, cutting ~25%." */
export function withEstimate(plain, clause) {
  const c = estimateClause(clause);
  if (!c) return plain;
  const stop = /\.$/.test(plain) ? '.' : '';
  return `${plain.replace(/\.$/, '')}, ${c}${stop}`;
}
