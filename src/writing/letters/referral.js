import { factSources, unsupportedFacts } from '../../checks/index.js';
import { PROMPT_VERSIONS } from '../../promptVersions.js';
import { complete } from '../../llm/index.js';
import { PROSE_VOICE_RULES, proseIssues } from '../../text/voice.js';
import { writeInVoice, writerSettings } from './write.js';

// A message asking one person to refer the candidate for one job, in three formats: an email,
// a LinkedIn message, or a LinkedIn connection note (300 characters at most, LinkedIn's limit).
// Every claim about the candidate comes from the resume, and a shared history is mentioned only
// when the candidate states one. Prompt rules ported from ai-job-hunter-app (Apache-2.0),
// packages/prompts/src/generate/referral.

export const REFERRAL_FORMATS = ['email', 'linkedin_message', 'connection_note'];
export const CONNECTION_NOTE_LIMIT = 300;

const FORMAT_LABEL = { email: 'an email', linkedin_message: 'a LinkedIn message', connection_note: 'a LinkedIn connection-request note' };
const FORMAT_RULE = {
  email: 'A first line "Subject: ..." naming the role, a blank line, then 90-150 words: greeting, who the candidate is in one line, one resume-backed reason they fit, the ask, thanks, the candidate\'s name.',
  linkedin_message: '60-120 words, no subject line: greeting, one resume-backed reason the candidate fits, the ask, thanks.',
  connection_note: `${CONNECTION_NOTE_LIMIT} characters or fewer, counted with spaces: who the candidate is, the role, the ask. No greeting line of its own and no sign-off beyond a first name.`,
};

const RESUME_CHARS = 8000;

export const REFERRAL_SYSTEM_PROMPT = `You help a job candidate write a short message to one person asking whether they would refer the candidate for a job. It is the note a thoughtful person actually sends, never a templated mass message.

Rules:
- Every claim about the candidate comes from RESUME. Never invent a skill, employer, title, metric, date or project.
- Never say the candidate and the recipient know each other, worked together or share a connection unless HOW_THEY_KNOW_EACH_OTHER says so. Without it, write a polite cold message.
- One clear, low-pressure ask: would they be open to referring the candidate, or pointing them to the right person. Never demanding, never guilt.
- Name the real role and company, and anchor on one genuine, resume-backed reason the candidate fits.
- Output the message only: no preamble, no quotation marks around it, no labels other than an email's Subject line.
${PROSE_VOICE_RULES}`;

/** The user prompt for one referral message. */
export function buildReferralPrompt({ personName, personRole = '', relationship = '', company = '', jobTitle = '', resumeText = '', format }) {
  const recipient = personRole.trim() ? `${personName.trim()} (${personRole.trim()})` : personName.trim();
  return `FORMAT: ${FORMAT_LABEL[format]}. ${FORMAT_RULE[format]}

RECIPIENT: ${recipient}
COMPANY: ${company || 'Not specified'}
ROLE: ${jobTitle || 'Not specified'}
HOW_THEY_KNOW_EACH_OTHER: ${relationship.trim() || '(not stated: this is a cold message)'}

RESUME:
${String(resumeText).slice(0, RESUME_CHARS)}

Write ${FORMAT_LABEL[format]} from the candidate to ${personName.trim()}, asking whether they would be open to referring the candidate for the ${jobTitle || 'role'} at ${company || 'the company'}.`;
}

/** A connection note cut to LinkedIn's limit at the last sentence (or word) that fits. */
export function fitConnectionNote(text) {
  const note = String(text || '').trim();
  if (note.length <= CONNECTION_NOTE_LIMIT) return note;
  const head = note.slice(0, CONNECTION_NOTE_LIMIT);
  const sentence = head.search(/[.!?][^.!?]*$/);
  if (sentence > CONNECTION_NOTE_LIMIT * 0.6) return head.slice(0, sentence + 1);
  return head.slice(0, head.lastIndexOf(' ')).replace(/[,;:\s]+$/, '');
}

/**
 * What in a drafted message needs another pass, as [{ code, message }]: a figure, tenure or
 * certification the resume does not support, the voice checks for connected writing, and a
 * connection note over the limit.
 */
export function referralIssues(text, { resumeText = '', relationship = '', format }) {
  const issues = proseIssues(text, { ownText: `${resumeText}\n${relationship}` });
  const sources = factSources({}, `${resumeText}\n${relationship}`);
  for (const f of unsupportedFacts(text, sources)) issues.push({ code: 'fact', message: `It states "${f.value}", which the resume does not; leave it out.` });
  if (format === 'connection_note' && String(text).length > CONNECTION_NOTE_LIMIT) {
    issues.push({ code: 'length', message: `It is ${String(text).length} characters; a connection note allows ${CONNECTION_NOTE_LIMIT}.` });
  }
  return issues;
}

/**
 * A message asking one person to refer the candidate. Checked like a cover letter, facts
 * included, and revised once when it needs it. Returns { message, warnings }: `warnings` is
 * whatever the revision did not fix, for the member to check before sending.
 *
 * @param {{ personName: string, personRole?: string, relationship?: string, format?: string, jobTitle?: string, company?: string, optimizedResumeText: string, model?: string }} input
 * @param {import('../../types.js').CallMeta} [meta]
 * @returns {Promise<{ message: string, warnings: string[] }>}
 */
export async function generateReferral({ personName, personRole = '', relationship = '', format, jobTitle = '', company = '', optimizedResumeText, model }, meta = {}) {
  const user = buildReferralPrompt({ personName, personRole, relationship, company, jobTitle, resumeText: optimizedResumeText, format });
  const check = (text) => referralIssues(text, { resumeText: optimizedResumeText, relationship, format });
  const text = await writeInVoice({
    write: async (revise) => {
      const { text: draft } = await complete(
        { ...writerSettings(model), system: REFERRAL_SYSTEM_PROMPT, user: revise ? `${user}\n\n${revise}` : user, temperature: 0.6 },
        { ...meta, kind: 'referral', promptVersion: `${PROMPT_VERSIONS.referral}${revise ? '+revise' : ''}` }
      );
      return draft.replace(/^["\s]+|["\s]+$/g, '');
    },
    check,
  });
  const message = format === 'connection_note' ? fitConnectionNote(text) : text;
  return { message, warnings: check(message).map((i) => i.message) };
}
