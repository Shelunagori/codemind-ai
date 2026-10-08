import { DICTIONARY } from './data.js';

// A curated skill vocabulary: aliases resolve to a canonical slug ("k8s" and "kubernetes"
// both read "kubernetes"), each slug has one display label ("ci-cd" reads "CI/CD"), and
// anything outside the vocabulary resolves to nothing rather than a guess. Ported from
// freehire's skilltag package; the matching rules follow its Parse and Canonicalize.

// Maps rather than the raw objects, so a token like "constructor" cannot read a prototype
// property as a skill.
const WORD_ALIASES = new Map(Object.entries(DICTIONARY.wordAliases));
const ACRONYMS = new Map(Object.entries(DICTIONARY.acronyms));
const LABELS = new Map(Object.entries(DICTIONARY.labels));
const DESCRIPTIONS = new Map(Object.entries(DICTIONARY.descriptions));
const AMBIGUOUS_WORDS = new Set(DICTIONARY.ambiguousWords);
const NON_CORROBORATING = new Set(DICTIONARY.nonCorroboratingPhrases);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A term is standalone when neither neighbour is a letter or digit. The class is Unicode
// rather than ASCII because an accented letter is still a letter: read byte by byte, "elk"
// is a whole word inside the Hungarian "elkészítése". A leading '.' or '-' is not a left
// boundary either, so "asp.net" does not read as ".net" and "objective-c" does not leak
// "c"; a trailing '.' is a sentence period and is allowed.
const LEFT_EDGE = '(?<![\\p{L}\\p{N}.-])';
const RIGHT_EDGE = '(?![\\p{L}\\p{N}])';
const SEPARATORS = /[-_\s]+/;

// A multi-word alias matches its spaced, hyphenated and underscored forms alike
// ("react native", "react-native", "react_native"); a single token (c++, node.js, ci/cd)
// keeps its punctuation as written.
function phrasePattern(alias) {
  const body = alias.split(SEPARATORS).filter(Boolean).map(escapeRegex).join('[-_\\s]+');
  return new RegExp(`${LEFT_EDGE}${body}${RIGHT_EDGE}`, 'u');
}

const PHRASES = DICTIONARY.phraseAliases.map(([alias, canonical]) => ({ canonical, pattern: phrasePattern(alias.toLowerCase()) }));
// An acronym is matched in its exact case on the original text, because its lowercase
// form means something else ("ML" is machine learning; "ml" is a millilitre).
const ACRONYM_PATTERNS = [...ACRONYMS].map(([surface, canonical]) => ({
  canonical,
  pattern: new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(surface)}${RIGHT_EDGE}`, 'u'),
}));

const collapseSeparators = (text) => text.replace(/[-_\s]+/g, ' ').trim();
// Whole-token lookup of a phrase alias: "React Native" and "react-native" share one key.
const PHRASE_EXACT = new Map(DICTIONARY.phraseAliases.map(([alias, canonical]) => [collapseSeparators(alias.toLowerCase()), canonical]));

// A canonical is not automatically an alias of itself: "go" is absent from the alias
// tables because in prose it is a verb. A caller naming a skill outright (a model's
// answer, a job's stored skill) may still hand over the slug, so the set of slugs is kept
// for that route alone; parseSkills never consults it.
const CANONICALS = new Set([...WORD_ALIASES.values(), ...PHRASES.map((p) => p.canonical), ...ACRONYMS.values()]);

const ALIASES = new Map();
for (const [alias, canonical] of [...WORD_ALIASES, ...DICTIONARY.phraseAliases, ...ACRONYMS]) {
  if (!ALIASES.has(canonical)) ALIASES.set(canonical, new Set());
  ALIASES.get(canonical).add(alias);
}

const HTML_TAG = /<[^>]*>/g;
// Apply links tokenize into aliases ("about-us.html", a ".php" query) that name a place,
// not a requirement.
const URL_TEXT = /\b(?:https?:\/\/|www\.)\S+/gi;
const WORD_TOKEN = /[\p{L}\p{N}]+/gu;

// Tags and URLs become a space, not nothing, so "<b>Go</b>Engineer" cannot fuse.
const stripMarkup = (text) => String(text ?? '').replace(HTML_TAG, ' ').replace(URL_TEXT, ' ');
const normalize = (text) => stripMarkup(text).toLowerCase().trim();

/** The canonical slug a skill name resolves to as a whole ("k8s" → "kubernetes"), or null. */
export function canonicalSkill(name) {
  const cased = stripMarkup(name).trim();
  if (!cased) return null;
  if (ACRONYMS.has(cased)) return ACRONYMS.get(cased);
  const norm = normalize(cased);
  return WORD_ALIASES.get(norm) ?? PHRASE_EXACT.get(collapseSeparators(norm)) ?? (CANONICALS.has(norm) ? norm : null);
}

/** How a slug is written for a reader: the curated label, else the slug title-cased on its hyphens. */
export function skillLabel(slug) {
  const key = String(slug ?? '');
  if (LABELS.has(key)) return LABELS.get(key);
  return key
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

/** A sentence saying what the skill is, or '' for a slug the dictionary does not know. */
export function skillDescription(slug) {
  return DESCRIPTIONS.get(String(slug ?? '')) ?? '';
}

/** Every spelling that resolves to the slug, sorted ("kubernetes" → ["k8s", "kubernetes"]); [] for an unknown slug. */
export function skillAliases(slug) {
  return [...(ALIASES.get(String(slug ?? '')) ?? [])].sort();
}

/**
 * The canonical slugs named in free text, sorted. A skill is found by an acronym in its
 * exact case, a phrase (punctuated or multi-word), or a whole word. A word that is also
 * plain English (react, swift, spring) is kept only when the text also names an
 * unambiguous technology: "must react to changes" tags nothing, "React and TypeScript"
 * tags both. A phrase naming a discipline rather than a technology (content marketing,
 * HIPAA) tags itself but does not vouch for such words. `corroborate: false` keeps every
 * ambiguous word, for text that is a list of skills rather than prose.
 */
export function parseSkills(text, { corroborate = true } = {}) {
  const strong = new Set();
  const weak = new Set();
  const standalone = new Set();

  const cased = stripMarkup(text);
  for (const { canonical, pattern } of ACRONYM_PATTERNS) if (pattern.test(cased)) strong.add(canonical);

  const norm = normalize(text);
  for (const { canonical, pattern } of PHRASES) {
    if (pattern.test(norm)) (NON_CORROBORATING.has(canonical) ? standalone : strong).add(canonical);
  }
  for (const token of norm.match(WORD_TOKEN) ?? []) {
    const canonical = WORD_ALIASES.get(token);
    if (canonical) (AMBIGUOUS_WORDS.has(token) ? weak : strong).add(canonical);
  }

  if (strong.size > 0 || !corroborate) for (const canonical of weak) strong.add(canonical);
  for (const canonical of standalone) strong.add(canonical);
  return [...strong].sort();
}
