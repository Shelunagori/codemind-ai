import { hasKeyword } from '../text/keywords.js';
import { aiTellWords } from '../text/voice.js';
import { escapeRegex } from './certifications.js';

// ── Hygiene warnings ───────────────────────────────────────────────────────
//
// Things a recruiter or a keyword scanner reads badly: bullets too long to scan, a role buried
// under bullets, the same bullet twice, a keyword repeated until it reads as stuffing, a skill
// listed that no line shows. Warnings only, for the user to fix. Thresholds ported from
// ai-job-hunter-app (Apache-2.0), apps/desktop/src-tauri/src/validate/content/ats.rs and duplicates.rs.

export const MAX_BULLET_CHARS = 200; // about two printed lines at resume column width
export const MAX_BULLETS_PER_ROLE = 6;
export const MAX_KEYWORD_OCCURRENCES = 6;
export const MAX_KEYWORD_SHARE = 0.04;
// Below this many words the share is noise (in a 20-word text any word twice is 10%).
export const MIN_WORDS_FOR_SHARE = 75;
export const DUPLICATE_OVERLAP = 0.8; // four of every five distinct content words shared
const MIN_WORDS_FOR_DUPLICATE = 4;
const MAX_VOICE_WARNINGS = 5;

const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'into', 'that', 'this', 'using', 'used', 'over', 'across', 'our', 'their', 'its', 'was', 'were', 'has', 'have', 'had', 'are', 'a', 'an', 'of', 'to', 'in', 'on', 'at', 'by', 'as', 'or', 'is', 'be']);
const contentWords = (text) => new Set(String(text || '').toLowerCase().split(/[^\p{L}\p{N}+#.]+/u).map((w) => w.replace(/\.+$/, '')).filter((w) => w.length > 1 && !STOP.has(w)));
const wordCount = (text) => (String(text || '').match(/[\p{L}\p{N}][\p{L}\p{N}+#.'-]*/gu) || []).length;
const escapeTerm = (term) => term.split(/[-_\s]+/).filter(Boolean).map(escapeRegex).join('[-_\\s]+');
const countTerm = (text, term) => {
  const body = escapeTerm(term);
  return body ? (String(text || '').match(new RegExp(`(?<![\\p{L}\\p{N}+#])${body}(?![\\p{L}\\p{N}+#])`, 'giu')) || []).length : 0;
};
const shorten = (text, n = 90) => (text.length > n ? `${text.slice(0, n - 1)}…` : text);

function jaccard(a, b) {
  let shared = 0;
  for (const w of a) if (b.has(w)) shared += 1;
  return shared / (a.size + b.size - shared);
}

/**
 * What a recruiter or a keyword scanner would read badly in resume `form`, as
 * [{ code, message, text }]. `keywords` are the job's terms: repeating one past stuffing, or
 * listing one under Skills with no line that shows it, is only worth saying about those.
 */
export function resumeWarnings(form, { keywords = [] } = {}) {
  const warnings = [];
  const experience = form?.experience || [];
  const bullets = experience.flatMap((e) => (e.achievements || []).map((text) => ({ text: String(text || ''), company: e.company })));
  const projectLines = (form?.projects || []).flatMap((p) => p.highlights || []);

  for (const b of bullets) {
    if (b.text.length > MAX_BULLET_CHARS) warnings.push({ code: 'long_bullet', message: `A bullet at ${b.company || 'a role'} runs past two printed lines; a recruiter skims past it.`, text: shorten(b.text) });
  }
  for (const e of experience) {
    const n = (e.achievements || []).length;
    if (n > MAX_BULLETS_PER_ROLE) warnings.push({ code: 'bullet_count', message: `${e.company || 'A role'} has ${n} bullets; past ${MAX_BULLETS_PER_ROLE} the strongest ones get buried.`, text: '' });
  }

  const compared = bullets.map((b) => ({ ...b, words: contentWords(b.text) })).filter((b) => b.words.size >= MIN_WORDS_FOR_DUPLICATE).slice(0, 200);
  for (let i = 0; i < compared.length; i += 1) {
    for (let j = i + 1; j < compared.length; j += 1) {
      if (jaccard(compared[i].words, compared[j].words) >= DUPLICATE_OVERLAP) {
        warnings.push({ code: 'duplicate_bullet', message: 'Two bullets say nearly the same thing; keep the stronger one.', text: shorten(compared[j].text) });
      }
    }
  }

  const body = [form?.summary, ...bullets.map((b) => b.text), ...projectLines].filter(Boolean).join('\n');
  const everything = [body, ...(form?.skills || [])].join('\n');
  const words = wordCount(everything);
  const terms = [...new Map(keywords.filter((k) => typeof k === 'string' && k.trim()).map((k) => [k.trim().toLowerCase(), k.trim()])).values()];
  for (const term of terms) {
    const n = countTerm(everything, term);
    if (n > MAX_KEYWORD_OCCURRENCES || (words >= MIN_WORDS_FOR_SHARE && n / words > MAX_KEYWORD_SHARE && n > 3)) {
      warnings.push({ code: 'keyword_stuffing', message: `"${term}" appears ${n} times; past a handful it reads as keyword stuffing.`, text: '' });
    }
  }
  for (const skill of form?.skills || []) {
    const job = terms.find((t) => hasKeyword(skill, t));
    if (job && !hasKeyword(body, job)) warnings.push({ code: 'skill_not_shown', message: `${job} is under Skills, but no line shows where you used it.`, text: '' });
  }

  // Words that read as AI-written, wherever they came from: a recruiter reads them the same way.
  const lines = [form?.summary, ...bullets.map((b) => b.text), ...projectLines].filter(Boolean);
  let flagged = 0;
  for (const line of lines) {
    const words = aiTellWords(line);
    if (!words.length || flagged >= MAX_VOICE_WARNINGS) continue;
    flagged += 1;
    warnings.push({ code: 'ai_tell', message: `${words.map((w) => `"${w}"`).join(', ')} reads as AI-written; say the plain thing instead.`, text: shorten(line) });
  }
  return warnings;
}
