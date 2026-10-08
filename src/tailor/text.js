import { hasKeyword } from '../text/keywords.js';

// Text helpers the tailoring modules share: how lines, words and terms are compared.

export const lower = (s) => String(s || '').trim().toLowerCase();
export const squash = (s) => String(s || '').replace(/\s+/g, ' ').trim();
export const sameTerm = (a, b) => lower(a) === lower(b);

/** Drop repeats, keeping the first spelling. */
export function unique(items) {
  const seen = new Set();
  return items.filter((s) => !seen.has(lower(s)) && seen.add(lower(s)));
}

/** The `terms` that `text` names. */
export const termsIn = (text, terms) => (terms || []).filter((k) => typeof k === 'string' && k.trim() && hasKeyword(text, k));

// Words that say what a bullet is about: long enough to mean something, or carrying a number.
const STOP_WORDS = new Set(['with', 'that', 'this', 'from', 'into', 'over', 'were', 'have', 'been', 'their', 'using', 'used', 'across', 'which', 'while', 'where', 'team', 'teams']);
export const contentWords = (text) =>
  new Set(
    lower(text)
      .split(/[^a-z0-9+#.]+/)
      .map((w) => w.replace(/^\.+|\.+$/g, ''))
      .filter((w) => (w.length >= 4 || /\d/.test(w)) && !STOP_WORDS.has(w))
      // "built" and "building" are one word here.
      .map((w) => (w.length > 4 ? w.slice(0, 4) : w))
  );

/** How much of the longer line's content the two share, 0 to 1: 1 when they say the same thing. */
export function sameWording(a, b) {
  const [x, y] = [contentWords(a), contentWords(b)];
  let shared = 0;
  for (const w of x) if (y.has(w)) shared += 1;
  return shared / Math.max(x.size, y.size, 1);
}
/** Two lines that share this much say the same thing in all but a word or two. */
export const SAME_WORDING = 0.85;

/** How much of the shorter line's content the two share, 0 to 1. */
export function overlap(a, b) {
  const [x, y] = [contentWords(a), contentWords(b)];
  if (!x.size || !y.size) return 0;
  let shared = 0;
  for (const w of x) if (y.has(w)) shared += 1;
  return shared / Math.min(x.size, y.size);
}
/** Two lines that share this much are about the same work. */
export const RELATED = 0.25;

// Words compared without case or a plural, and a long word by its stem: "LLMs" is "LLM",
// "Systems" is "System", "Recommender" is "recommendation".
export const STEM_CHARS = 7;
export const words = (s) =>
  lower(s)
    .split(/[^a-z0-9+#]+/)
    .filter(Boolean)
    .map((w) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w))
    .map((w) => w.slice(0, STEM_CHARS));
/** True when `text` has every word of `term`, stems compared. */
export const shows = (text, term) => {
  const have = new Set(words(text));
  const need = words(term);
  return need.length > 0 && need.every((w) => have.has(w));
};

/** The text's words as stems, each marked as a full word (five letters or more) or not. */
export const stems = (text) =>
  lower(text)
    .split(/[^a-z0-9+#]+/)
    .filter(Boolean)
    .map((w) => ({ stem: w.slice(0, STEM_CHARS), full: w.length >= 5 }));

// A sentence ends at a full stop followed by a space and a capital, or at the end: "Next.js" and
// "Node.js" are not two sentences. Each piece keeps its trailing space, so joining them is the text.
export const sentencesOf = (text) => String(text || '').match(/[^]+?[.!?]+(?=\s+[A-Z0-9"“(]|\s*$)\s*|[^]+$/g) || [];
