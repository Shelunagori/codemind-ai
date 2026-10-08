import { AiError } from '../../errors.js';
import { writerSettings } from '../letters/write.js';
import { PROMPT_VERSIONS } from '../../promptVersions.js';
import { complete } from '../../llm/index.js';
import { buildFeedbackPrompt, cleanFeedback, FEEDBACK_SYSTEM_PROMPT } from './feedback.js';
import { buildPrepPrompt, cleanPrep, PREP_SYSTEM_PROMPT } from './prep.js';
import { FEEDBACK_RESPONSE_FORMAT, PREP_RESPONSE_FORMAT } from './schema.js';

/**
 * Interview preparation for an application (prep.js): the questions this interviewer is likely
 * to ask, the questions worth asking back, what the posting gives reason to clarify, the
 * requirements mapped to resume evidence, and steps to take before the interview. One call,
 * written from the resume going out and the posting; the result carries its prompt version.
 *
 * @param {{ jobDescription: string, jobTitle?: string, company?: string, optimizedResumeText: string, model?: string }} input
 * @param {import('../../types.js').CallMeta} [meta]
 * @returns {Promise<{ likely: object[], toAsk: object[], redFlags: object[], talkingPoints: object[], actionPlan: string[], promptVersion: string }>}
 */
export async function generateInterviewPrep({ jobDescription, jobTitle = '', company = '', optimizedResumeText, model }, meta = {}) {
  const { data } = await complete(
    {
      ...writerSettings(model),
      system: PREP_SYSTEM_PROMPT,
      user: buildPrepPrompt({ jobTitle, company, jobDescription, resumeText: optimizedResumeText }),
      json: true,
      responseFormat: PREP_RESPONSE_FORMAT,
      temperature: 0.5,
    },
    { ...meta, kind: 'interview', promptVersion: PROMPT_VERSIONS.interviewPrep }
  );
  const prep = cleanPrep(data, { jobDescription: String(jobDescription || ''), resumeText: String(optimizedResumeText || '') });
  if (!prep.likely.length) throw AiError.upstream('The model did not return interview questions');
  return { ...prep, promptVersion: PROMPT_VERSIONS.interviewPrep };
}

/**
 * Feedback on one practice answer (feedback.js): strengths, gaps, which parts of STAR it states,
 * and one tightened rewrite that is dropped when it states a fact the answer and the resume do not.
 *
 * @param {{ question: string, answer: string, jobDescription: string, jobTitle?: string, company?: string, optimizedResumeText: string, model?: string }} input
 * @param {import('../../types.js').CallMeta} [meta]
 * @returns {Promise<{ strengths: string[], gaps: string[], star: object, rewrite: string }>}
 */
export async function reviewInterviewAnswer({ question, answer, jobDescription, jobTitle = '', company = '', optimizedResumeText, model }, meta = {}) {
  const { data } = await complete(
    {
      ...writerSettings(model),
      system: FEEDBACK_SYSTEM_PROMPT,
      user: buildFeedbackPrompt({ question, answer, jobTitle, company, jobDescription, resumeText: optimizedResumeText }),
      json: true,
      responseFormat: FEEDBACK_RESPONSE_FORMAT,
      temperature: 0.3,
    },
    { ...meta, kind: 'interview', promptVersion: PROMPT_VERSIONS.interviewFeedback }
  );
  return cleanFeedback(data, { answer, resumeText: optimizedResumeText });
}
