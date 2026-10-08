import { factSources, unsupportedFacts } from '../../checks/index.js';
import { jobPostingBlock } from '../../text/fence.js';
import { PROSE_VOICE_RULES } from '../../text/voice.js';
import { AUDIENCES, QUESTION_TYPES } from './schema.js';
import { text, unquote, words } from './text.js';

// Interview preparation for one application: the questions this interviewer is likely to ask,
// the questions worth asking back, what the posting itself gives reason to clarify (its quote
// checked against the posting in code), the posting's requirements mapped to resume evidence
// (checked against the resume as a tailored line is), and steps to take before the interview.
// Prompt rules ported from ai-job-hunter-app (Apache-2.0), packages/prompts/src/generate/interview-questions.

const RESUME_CHARS = 10000;
const JOB_CHARS = 8000;

export const PREP_SYSTEM_PROMPT = `You are a mock interviewer and coach helping a candidate prepare for a real interview for one job. Respond with JSON only.

Rules:
- likely: the 8 questions this interviewer is most likely to ask THIS candidate for THIS job, mixing behavioral ("tell me about a time"), roleSpecific (the duties, priorities and trade-offs the posting describes) and technical (the skills the posting requires). Ground every one in the posting and calibrate it to the resume; never ask about a technology or scenario absent from both. Favor questions that reveal how the candidate thinks or has acted over trivia.
- toAsk: 6 sharp questions the candidate can ask back, each tagged with the interviewer it suits: recruiter (role scope, process, growth; non-technical), hiringManager (priorities, what success looks like in the first 6-12 months, the hardest part of the role), team (day-to-day practices, tooling, technical trade-offs), leadership (strategy and direction). Each specific to this role or company, never answerable from the careers page, never about salary, benefits or promotion timelines. "why" says in one short line what asking it signals.
- redFlags: up to 4 things about the role or company worth clarifying, ONLY where the posting itself raises one: an unclear or contradictory scope, an unusually wide remit for the level, vague compensation or location terms, on-call or overtime expectations, a team being rebuilt, signs of churn. concern names it in one short sentence; quote is the posting's own words that raise it, copied exactly (a short phrase or sentence, never a summary); ask is one tactful question that clarifies it. Never infer a red flag from what the posting leaves out or from general knowledge of the company. When the posting raises none, return an empty list: for most postings an empty list is the right answer.
- talkingPoints: 4 to 6 of the posting's most important requirements, each mapped to the resume. requirement: the requirement in a few words. evidence: the role and the achievement on the resume that shows it, as the resume states it. say: one or two first-person sentences the candidate can say in the interview. Use only what the resume states: never add a figure, employer, technology, tenure or outcome it does not, and leave out a requirement the resume has no evidence for rather than stretch one.
- actionPlan: 3 to 6 concrete steps to take before the interview, each one short imperative sentence specific to this job and this candidate: a resume story to rehearse for a named requirement, a part of the posting to reread, a gap to prepare an honest answer for, something to settle with the recruiter. Never generic advice such as "research the company".
- One sentence per question.
${PROSE_VOICE_RULES}`;

/** The prep prompt: resume, then the posting fenced as data. */
export function buildPrepPrompt({ jobTitle = '', company = '', jobDescription = '', resumeText = '' }) {
  return `ROLE: ${jobTitle || 'Not specified'}${company ? ` at ${company}` : ''}

RESUME:
${String(resumeText).slice(0, RESUME_CHARS)}

JOB:
${jobPostingBlock(jobDescription, JOB_CHARS)}`;
}

/**
 * Whether a quote is the posting's own words: the phrase word for word, or a close paraphrase
 * where at least 80% of its words of three letters or more appear in the posting (by their first
 * six letters, so a changed word ending still counts).
 */
export function quotedFromPosting(quote, posting) {
  const q = words(quote);
  if (q.length < 2) return false;
  const all = words(posting);
  if (` ${all.join(' ')} `.includes(` ${q.join(' ')} `)) return true;
  const stem = (w) => w.slice(0, 6); // "occasionally" matches "occasional", "required" "requires"
  const present = new Set(all.map(stem));
  const content = q.filter((w) => w.length >= 3);
  return content.length >= 3 && content.filter((w) => present.has(stem(w))).length / content.length >= 0.8;
}

/**
 * The prep answer as stored: well-formed entries only, questions and steps de-duplicated. Given
 * the posting, a red flag stands only when its quote is the posting's words; given the resume, a
 * talking point stands only when its evidence and line state no figure, tenure or certification
 * the resume does not.
 */
export function cleanPrep(data, { jobDescription, resumeText } = {}) {
  const seen = new Set();
  const fresh = (q) => q && !seen.has(q.toLowerCase()) && seen.add(q.toLowerCase());
  const sources = resumeText === undefined ? null : factSources({}, resumeText);
  const list = (v) => (Array.isArray(v) ? v : []);
  return {
    likely: (Array.isArray(data?.likely) ? data.likely : [])
      .map((q) => ({ question: text(q?.question), type: QUESTION_TYPES.includes(q?.type) ? q.type : 'roleSpecific' }))
      .filter((q) => fresh(q.question))
      .slice(0, 10),
    toAsk: (Array.isArray(data?.toAsk) ? data.toAsk : [])
      .map((q) => ({ question: text(q?.question), why: text(q?.why), audience: AUDIENCES.includes(q?.audience) ? q.audience : 'hiringManager' }))
      .filter((q) => fresh(q.question))
      .slice(0, 8),
    redFlags: list(data?.redFlags)
      .map((f) => ({ concern: text(f?.concern), quote: unquote(text(f?.quote)), ask: text(f?.ask) }))
      .filter((f) => f.concern && f.quote && (jobDescription === undefined || quotedFromPosting(f.quote, jobDescription)))
      .slice(0, 5),
    talkingPoints: list(data?.talkingPoints)
      .map((t) => ({ requirement: text(t?.requirement), evidence: text(t?.evidence), say: text(t?.say) }))
      .filter((t) => t.requirement && t.evidence && t.say && (!sources || !unsupportedFacts(`${t.evidence}\n${t.say}`, sources).length))
      .slice(0, 6),
    actionPlan: list(data?.actionPlan)
      .map(text)
      .filter((step) => fresh(step))
      .slice(0, 6),
  };
}
