import { factSources, unsupportedFacts } from '../../checks/index.js';
import { jobPostingBlock } from '../../text/fence.js';
import { PROSE_VOICE_RULES } from '../../text/voice.js';
import { text } from './text.js';

// Feedback on a practice answer against the STAR shape (situation, task, action, result) with
// one tightened rewrite. The rewrite is checked in code like a tailored line (ai/checks): one
// that states a figure, tenure or certification neither the answer nor the resume supports is
// not shown. Prompt rules ported from ai-job-hunter-app (Apache-2.0),
// packages/prompts/src/generate/interview-practice.

const RESUME_CHARS = 10000;
const JOB_CHARS = 8000;
const ANSWER_CHARS = 4000;

export const FEEDBACK_SYSTEM_PROMPT = `You are a supportive but honest interview coach reviewing a candidate's practice answer to one interview question. Respond with JSON only.

Rules:
- Judge only what the answer says, informed by what the resume supports. Never invent experience, skills or outcomes; if the answer is thin, say so.
- strengths: up to 3 genuine strengths of the answer as written.
- gaps: what would make THIS answer stronger for this job. A single answer is not expected to cover the whole role: never list a requirement just because this answer does not mention it.
- star: for each of situation, task, action and result, true only when the answer states it specifically. A vague mention is false: "a backend service" is not a situation, "it was hard" is not a task, "we did it" is not a result.
- rewrite: one tightened version of the answer in the first person, the same facts delivered better. Never add a fact, number, employer, technology or outcome the answer or the resume does not state; where a result is missing, leave it out rather than invent one.
${PROSE_VOICE_RULES}`;

/** The feedback prompt: the question, the answer (the candidate's own text), the resume and the posting. */
export function buildFeedbackPrompt({ question, answer, jobTitle = '', company = '', jobDescription = '', resumeText = '' }) {
  return `QUESTION:
${String(question).trim().slice(0, 1000)}

ANSWER (the candidate's practice answer):
${String(answer).trim().slice(0, ANSWER_CHARS)}

ROLE: ${jobTitle || 'Not specified'}${company ? ` at ${company}` : ''}

RESUME:
${String(resumeText).slice(0, RESUME_CHARS)}

JOB:
${jobPostingBlock(jobDescription, JOB_CHARS)}`;
}

/**
 * The feedback as shown. The rewrite stands only when every figure, tenure and certification in
 * it is backed by the answer or the resume; otherwise it is dropped and `rewriteDropped` says so.
 */
export function cleanFeedback(data, { answer = '', resumeText = '' } = {}) {
  const list = (v, n) => (Array.isArray(v) ? v.map(text).filter(Boolean).slice(0, n) : []);
  const star = Object.fromEntries(['situation', 'task', 'action', 'result'].map((k) => [k, data?.star?.[k] === true]));
  const rewrite = text(data?.rewrite);
  const sources = factSources({}, `${resumeText}\n${answer}`);
  const invented = rewrite ? unsupportedFacts(rewrite, sources) : [];
  return { strengths: list(data?.strengths, 3), gaps: list(data?.gaps, 4), star, rewrite: invented.length ? '' : rewrite, rewriteDropped: invented.length > 0 };
}
