import { hasKeyword } from '../text/keywords.js';
import { shows, squash, unique } from './text.js';

// ── Headline ───────────────────────────────────────────────────────────────
//
// The line under the name is written apart from the rewrite: the candidate's level and the role
// family the job belongs to, with up to three specialties — "Senior AI Systems Engineer | LLMs ·
// Agentic Systems". Copying the job's title ("Machine Learning Engineer: Personalization") reads
// as tailored rather than as the candidate, so code refuses a role that carries the posting's
// qualifier or company, or a level the resume never states, and keeps the resume's own title.

const HEADLINE_ROLE_CHARS = 60;
const SPECIALTY_CHARS = 30;
const MAX_SPECIALTIES = 3;
const LEVEL_RE = /\b(senior|sr|staff|principal|lead|head|director|chief|vp|vice president|distinguished|architect)\b/gi;
// "Machine Learning Engineer: Personalization", "… - Payments", "…, Ads", "… (Search)".
const TITLE_QUALIFIER_RE = /\s*(?::|\s[-–—|/]\s|,|\(|\))\s*/;

/** Why a headline role may not stand, or null when it may. */
function headlineRoleProblem(role, { sourceText, jobTitle, company }) {
  if (!role || role.length > HEADLINE_ROLE_CHARS || /[:()|]/.test(role)) return 'shape';
  const qualifiers = String(jobTitle || '').split(TITLE_QUALIFIER_RE).slice(1).map(squash).filter(Boolean);
  // A qualifier the resume itself shows ("Backend" for a backend engineer) is the candidate's own.
  if (qualifiers.some((q) => hasKeyword(role, q) && !shows(sourceText, q))) return 'copies the job title';
  if (company && hasKeyword(role, company)) return 'names the company';
  const levels = role.match(LEVEL_RE) || [];
  if (levels.some((level) => !hasKeyword(sourceText, level))) return 'claims a level';
  return null;
}

/**
 * The tailored headline from the model's { role, specialties }: "Role | A · B · C". A role that
 * carries the job title's qualifier, names its company or claims a level the resume never states gives way
 * to the resume's own title; a specialty stays only when the resume (or a keyword the candidate
 * confirmed) shows it. No headline at all is the resume's own title.
 */
export function resumeHeadline(source, headline, { jobTitle = '', company = '', sourceText = '' } = {}) {
  const sourceTitle = squash(source?.title);
  const proposed = squash(headline?.role).replace(/[.,;]+$/, '');
  const role = headlineRoleProblem(proposed, { sourceText, jobTitle, company }) ? sourceTitle : proposed;
  // A resume's own title that already lists its specialties keeps them as they are.
  if (!role || (role === sourceTitle && sourceTitle.includes('|'))) return role;
  const specialties = unique(
    (Array.isArray(headline?.specialties) ? headline.specialties : [])
      .map((s) => squash(s).replace(/[.,;|·]+/g, ''))
      .filter((s) => s && s.length <= SPECIALTY_CHARS && shows(sourceText, s) && !shows(role, s))
  ).slice(0, MAX_SPECIALTIES);
  return specialties.length ? `${role} | ${specialties.join(' · ')}` : role;
}
