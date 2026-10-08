// Writing that reads as a person's rather than a model's. The same lists do two jobs: the
// prompts ban them, and the code checks the output against them, so a rule the model ignored is
// caught rather than shipped. Every check is a warning about style, never about truth: a resume
// that says "robust" is not wrong, and the candidate's own wording is theirs to keep.
//
// Word lists, prompt wording and thresholds ported from ai-job-hunter-app
// (github.com/saeedkolivand/ai-job-hunter-app, Apache-2.0):
// packages/prompts/src/generate/natural-voice/natural-voice.ts and
// apps/desktop/src-tauri/src/validate/content/voice.rs.

/** Words and phrases a model reaches for and a person rarely writes. */
export const AI_TELL_WORDS = [
  'delve', 'leverage', 'leveraged', 'leveraging', 'robust', 'seamless', 'seamlessly', 'cutting-edge', 'tapestry', 'testament', 'realm',
  'underscore', 'underscores', 'showcase', 'showcased', 'showcasing', 'foster', 'fostered', 'fostering', 'intricate', 'pivotal', 'vibrant',
  'garner', 'garnered', 'vital', 'crucial', 'harness', 'harnessed', 'harnessing', 'elevate', 'elevated', 'unlock', 'unlocked', 'empower',
  'empowered', 'empowering', 'multifaceted', 'ever-evolving', 'paradigm shift', 'passionate', 'results-driven', 'proven track record',
  'team player', 'go-getter', 'synergy', 'detail-oriented', 'meticulous', 'world-class', 'spearheaded', 'utilize', 'utilized',
  'studies show', 'experts say', 'widely regarded as', 'in order to', 'due to the fact that', 'at this point in time', 'has the ability to',
  'it is important to note', "it's important to note", 'it is worth noting', "it's worth noting", "in today's world",
  'generally speaking', 'with that in mind', 'building on this',
];

/** How a template letter opens. Checked in a letter's first 200 characters. */
export const TEMPLATE_OPENERS = [
  'i am writing to apply', 'i am writing to express', 'i am writing in response to', 'i am excited to apply',
  "i'm excited to apply", 'i would like to apply for the position', 'please accept this letter', 'with great interest i read',
  'i hope this message finds you well', 'i hope this email finds you well', 'as a passionate',
];

// ── Prompt wording ─────────────────────────────────────────────────────────

const WORD_BANS = `- Drop AI vocabulary: delve, leverage, robust, seamless, cutting-edge, tapestry, testament, realm, underscore, showcase, foster, intricate, pivotal, vibrant, garner, vital, crucial, harness, elevate, unlock, empower, multifaceted, ever-evolving, paradigm shift, spearheaded, utilize. Use the plain word for the real thing instead.
- No inflated self-description: passionate, results-driven, proven track record, team player, go-getter, synergy, detail-oriented, meticulous, world-class, dynamic, "excited to", "eager to".
- No vague attributions: "studies show", "experts say", "widely regarded as". Name who, or drop the claim.
- Cut filler: "in order to" is "to", "due to the fact that" is "because", "has the ability to" is "can".
- These apply to words you introduce. A word the resume itself uses, or an exact term from the job, stays.`;

/** Voice rules for resume bullets and summaries. */
export const RESUME_VOICE_RULES = `Voice:
- Plain, specific, human. Where the candidate's own phrasing is already clear, keep it.
${WORD_BANS}
- Specificity: prefer the real number, tool or project name the resume already gives over a generic claim. "Cut checkout latency from 480ms to 90ms with Redis caching" beats "improved performance using caching".
- Vary the construction within a role so bullets are not identical verb, what, tech, metric templates. Do not open every bullet with a different showy verb either, and do not end bullets with a list of keywords.
- Plain text only: no bullet symbols, no markdown, no dashes used as asides.`;

/** Voice rules for connected writing: cover letters and application answers. */
export const PROSE_VOICE_RULES = `Human voice (critical):
${WORD_BANS}
- Never use a long dash (em or en dash). Use a period, comma, colon or parentheses.
- Do not force ideas into groups of three.
- Delete outright: "in today's world", "it is worth noting", "it is important to note", "generally speaking", "with that in mind".
- No "not just X, but Y", no rhetorical question you answer yourself, no "Here's the thing", and no closing aphorism or "In conclusion". End on the clearest concrete sentence.
- Cadence: mix short sentences of 3 to 7 words with longer ones of 20 to 30. Never three sentences in a row of the same length or shape.
- Portability test: a sentence that could move unchanged to another candidate, company or role is filler. Replace it with a number, tool or result specific to this one, or cut it.
- None of this licenses a new fact: every number, tool and project still comes from the resume.`;

// ── Checks ─────────────────────────────────────────────────────────────────

export const TEMPLATE_OPENER_SCAN_CHARS = 200;
export const MIN_SENTENCES_FOR_CADENCE = 8;
export const MIN_SENTENCE_LENGTH_STDDEV = 4; // words; below it the rhythm reads machine-flat
export const MAX_TRIPLETS_PER_TEN_SENTENCES = 2;
export const WORDS_PER_ALLOWED_DASH = 150;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const phraseRe = (phrase) => new RegExp(`(?<![\\p{L}\\p{N}])${phrase.split(/[\s-]+/).map(escapeRegex).join('[\\s-]+')}(?![\\p{L}\\p{N}])`, 'iu');
const WORD_RES = AI_TELL_WORDS.map((word) => [word, phraseRe(word)]);
// Folds the typographic apostrophe onto the plain one, so "it’s worth noting" is caught.
const plain = (text) => String(text || '').replace(new RegExp(String.fromCharCode(0x2019), 'g'), "'");

/**
 * The AI-sounding words in `text`, leaving out any that `ownText` (the resume, the job) already
 * uses: those are the candidate's wording or the employer's term, not the model's.
 */
export function aiTellWords(text, ownText = '') {
  const body = plain(text);
  const own = plain(ownText);
  return WORD_RES.filter(([, re]) => re.test(body) && !re.test(own)).map(([word]) => word);
}

const DASH_RE = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]|\\s--\\s`, 'g');
const sentencesOf = (text) =>
  plain(text)
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => /\p{L}/u.test(s) && s.split(/\s+/).length > 1);
const wordsIn = (text) => (String(text || '').match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu) || []).length;

/**
 * What in a piece of connected writing reads as machine-made, as [{ code, message }]. `ownText`
 * is the resume and the job, whose words are not the model's; `letter` adds the checks only a
 * cover letter needs (a template opener, and nothing about this job in it).
 */
export function proseIssues(text, { ownText = '', letter = false, jobTerms = [] } = {}) {
  const issues = [];
  const body = plain(text);
  const words = aiTellWords(body, ownText);
  if (words.length) issues.push({ code: 'ai_tell', message: `Uses words that read as AI-written: ${words.map((w) => `"${w}"`).join(', ')}.` });

  const dashes = (body.match(DASH_RE) || []).length;
  if (dashes > Math.max(1, Math.floor(wordsIn(body) / WORDS_PER_ALLOWED_DASH))) issues.push({ code: 'dashes', message: `Uses ${dashes} long dashes; replace them with periods or commas.` });

  const sentences = sentencesOf(body);
  // "X, Y, and Z": the comma before the last item is what marks a list of three or more.
  const triplets = (body.match(/,\s+(?:and|or)\s+/gi) || []).length;
  if (sentences.length >= 5 && (triplets / sentences.length) * 10 > MAX_TRIPLETS_PER_TEN_SENTENCES) {
    issues.push({ code: 'rule_of_three', message: 'Groups too many ideas in threes ("X, Y, and Z").' });
  }
  if (sentences.length >= MIN_SENTENCES_FOR_CADENCE) {
    const lengths = sentences.map((s) => s.split(/\s+/).length);
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const sd = Math.sqrt(lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / lengths.length);
    if (sd < MIN_SENTENCE_LENGTH_STDDEV) issues.push({ code: 'flat_cadence', message: 'Every sentence is about the same length; mix short ones with long ones.' });
  }

  if (letter) {
    const opening = body.slice(0, TEMPLATE_OPENER_SCAN_CHARS).toLowerCase();
    const opener = TEMPLATE_OPENERS.find((o) => opening.includes(o));
    if (opener) issues.push({ code: 'template_opener', message: `Opens with a template line ("${opener}").` });
    const terms = [...new Set(jobTerms.filter((t) => typeof t === 'string' && t.trim()).map((t) => t.trim()))];
    if (terms.length >= 2 && terms.filter((t) => phraseRe(t).test(body)).length < 2) {
      issues.push({ code: 'generic_letter', message: 'Names almost nothing this job asks for; it could be sent to any company.' });
    }
  }
  return issues;
}
