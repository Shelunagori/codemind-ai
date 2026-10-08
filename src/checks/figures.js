// ── Figures ────────────────────────────────────────────────────────────────
//
// A line that states a figure the candidate's own resume does not support is an invention. The
// check is lenient about how the source wrote the fact — "10k" supports "10,000", "doubled"
// supports "2x" — because a wrong accusation is worse than a missed one. Rules ported from
// ai-job-hunter-app (Apache-2.0), apps/desktop/src-tauri/src/validate/content/factual.rs.

// The no-break and narrow no-break spaces some locales group digits with, and the typographic
// apostrophe the Swiss use; built from their code points so the source holds no invisible characters.
const SPACES = String.fromCharCode(0xa0, 0x202f);
const APOSTROPHE = String.fromCharCode(0x2019);
const NUMBER_CHAR_RE = new RegExp(String.raw`[\d.,${SPACES} '${APOSTROPHE}]`);

/**
 * A written number as a comparable string: grouping separators dropped (`1,200`, `1.200` and
 * `1 200` are all `1200`) and a decimal comma read as a point (`3,5` is `3.5`). A separator
 * followed by exactly three digits, with a digit before it, is grouping; anything else is a
 * decimal point.
 */
export function normalizeNumber(raw) {
  const chars = [...String(raw)].filter((c) => NUMBER_CHAR_RE.test(c));
  let out = '';
  for (let i = 0; i < chars.length; i += 1) {
    const c = chars[i];
    if (/\d/.test(c)) {
      out += c;
      continue;
    }
    let following = 0;
    while (i + 1 + following < chars.length && /\d/.test(chars[i + 1 + following])) following += 1;
    const grouping = following === 3 && /\d$/.test(out);
    if (!grouping && (c === '.' || c === ',')) out += '.';
  }
  return out.replace(/\.+$/, '');
}

const NUM = String.raw`(\d[\d.,${SPACES}]*\d|\d)`;
// `\b` after the suffix keeps "480ms" from reading as millions.
const SUFFIXED_RE = new RegExp(String.raw`${NUM}\s*(bn|k|m)\b`, 'gi');
const PERCENT_RE = new RegExp(String.raw`${NUM}[\s${SPACES}]*(?:%|per\s?cent\b)`, 'gi');
// `x` is a word character, so `\b` keeps "3xtra" out; `×` is not, so it needs no boundary.
const MULTIPLIER_RE = new RegExp(String.raw`${NUM}\s*(?:x\b|×)`, 'gi');
// A leading `\b` only: "480ms" is a figure, while "EC2", "S3", "k8s" and "OAuth2" are names, not
// claims. The first arm reads a space or an apostrophe as grouping, three digits at a time.
const INTEGER_RE = new RegExp(String.raw`\b(\d{1,3}(?:[ ${SPACES}'${APOSTROPHE}]\d{3})+(?:[.,]\d+)?\b|\d[\d.,${SPACES}]*\d|\d)`, 'g');
// Tenure is its own check (tenure.js), so "8 years" is not read as the figure 8.
const TENURE_RE = /\b\d[\d.,]*\s*\+?\s*(?:years?|yrs?)\b/gi;
const MULTIPLIER_VERBS = { doubled: '2x', tripled: '3x', quadrupled: '4x' };
const MULTIPLIER_WORDS = { ...MULTIPLIER_VERBS, double: '2x', twice: '2x', triple: '3x', quadruple: '4x' };

function expandSuffixed(mantissa, suffix) {
  const scale = { k: 1e3, m: 1e6, bn: 1e9 }[suffix.toLowerCase()];
  const value = Number(normalizeNumber(mantissa)) * scale;
  return Number.isFinite(value) && Number.isInteger(value) ? String(value) : null;
}

/**
 * Every figure `text` states, as keys a source can be checked for: a plain number (`1200`, a
 * suffixed one expanded: `10k` is `10000`), a percentage (`40%`) or a multiplier (`3x`). A
 * number inside a percentage, a multiplier or a suffixed figure is not a second claim.
 */
export function figureClaims(text) {
  const line = String(text || '').replace(TENURE_RE, ' ');
  const keys = new Set();
  const taken = [];
  const take = (re, key) => {
    for (const m of line.matchAll(re)) {
      const k = key(m);
      if (k) keys.add(k);
      taken.push([m.index, m.index + m[0].length]);
    }
  };
  take(SUFFIXED_RE, (m) => expandSuffixed(m[1], m[2]));
  take(PERCENT_RE, (m) => `${normalizeNumber(m[1])}%`);
  take(MULTIPLIER_RE, (m) => `${normalizeNumber(m[1])}x`);
  for (const m of line.matchAll(INTEGER_RE)) {
    const [start, end] = [m.index, m.index + m[0].length];
    if (taken.some(([s, e]) => start >= s && end <= e)) continue;
    const n = normalizeNumber(m[1]);
    if (n) keys.add(n);
  }
  const lower = line.toLowerCase();
  for (const [verb, key] of Object.entries(MULTIPLIER_VERBS)) if (new RegExp(`\\b${verb}\\b`).test(lower)) keys.add(key);
  return keys;
}

/**
 * The figures `text` supports: everything it claims, every bare number in it (so "40%" backs a
 * plain "40"), and the multipliers it states in words ("doubled" backs "2x").
 */
export function sourcedFigures(text) {
  const source = String(text || '');
  const keys = figureClaims(source);
  for (const m of source.matchAll(INTEGER_RE)) keys.add(normalizeNumber(m[1]));
  for (const m of source.matchAll(TENURE_RE)) keys.add(normalizeNumber(m[0]));
  const lower = source.toLowerCase();
  for (const [word, key] of Object.entries(MULTIPLIER_WORDS)) if (new RegExp(`\\b${word}\\b`).test(lower)) keys.add(key);
  keys.delete('');
  return keys;
}

/** The figures in `text` that `sourced` (from sourcedFigures) does not support. */
export function unsourcedFigures(text, sourced) {
  return [...figureClaims(text)].filter((k) => !sourced.has(k));
}
