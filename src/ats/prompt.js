import { structuredResumeToText } from '../resume/structuredResume.js';
import { jobPostingBlock } from '../text/fence.js';

// The scoring prompt: what the model is shown. The score is never the model's number; it gives
// each requirement a verdict and a quote, and verdicts.js and breakdown.js decide the rest.

// The résumé goes to the model without contact details (not needed to score) and structurally
// bounded — capped bullets and strings, never JSON sliced mid-string.
const CONTACT_FIELDS = ['name', 'email', 'phone', 'location', 'linkedin', 'github', 'portfolio'];
// A role's bullets are all judged up to 20 — a tailored role with the job's duties written in runs
// to 16, and a bullet the scorer never sees cannot meet anything; the budget below is what bounds
// a resume that is long everywhere.
const LIMITS = { bullets: 20, bulletChars: 300, summaryChars: 1200, listItems: 100, budgetChars: 12000 };
const TIGHT = { ...LIMITS, bullets: 6, bulletChars: 200, budgetChars: Infinity };
const TEXT_CHARS = 8000;
const JOB_DESCRIPTION_CHARS = 8000;

/** Drop empty strings, lists and objects (and nulls) so the prompt carries only real content. */
export function compact(value) {
  if (Array.isArray(value)) {
    const items = value.map(compact).filter((v) => v !== undefined);
    return items.length ? items : undefined;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .map(([k, v]) => [k, compact(v)])
      .filter(([, v]) => v !== undefined);
    return entries.length ? Object.fromEntries(entries) : undefined;
  }
  if (typeof value === 'string') return value.trim() ? value.trim() : undefined;
  return value === null ? undefined : value;
}

const cut = (s, n) => (typeof s === 'string' && s.length > n ? `${s.slice(0, n - 1)}…` : s);

/**
 * The résumé as the model sees it: the form as bounded JSON without contact fields, or a
 * tailored résumé's plain text. Returns { block, text } — `text` is what keywords are checked
 * against.
 */
export function resumeForModel(resume, limits = LIMITS) {
  if (typeof resume === 'string') return { block: resume.slice(0, TEXT_CHARS), text: resume };
  const form = resume && typeof resume.toObject === 'function' ? resume.toObject() : resume || {};
  const bullets = (arr) => (arr || []).slice(0, limits.bullets).map((b) => cut(b, limits.bulletChars));
  const out = {
    title: form.title,
    summary: cut(form.summary, limits.summaryChars),
    skills: (form.skills || []).slice(0, limits.listItems),
    experience: (form.experience || []).map((e) => ({ company: e.company, title: e.title, period: e.period, achievements: bullets(e.achievements) })),
    projects: (form.projects || []).map((p) => ({ name: p.name, role: p.role, period: p.period, highlights: bullets(p.highlights) })),
    education: form.education,
    certifications: form.certifications,
    languages: form.languages,
    achievements: bullets(form.achievements),
    otherSections: (form.otherSections || []).map((o) => ({ title: o.title, content: cut(o.content, limits.bulletChars) })),
  };
  for (const f of CONTACT_FIELDS) delete out[f];
  let block = JSON.stringify(compact(out) || {});
  if (block.length > limits.budgetChars && limits !== TIGHT) block = resumeForModel(form, TIGHT).block;
  return { block, text: structuredResumeToText(form) };
}

export const SCORE_SYSTEM_PROMPT =
  "You judge how well a candidate's resume meets each requirement of one job. Be evidence-based; never credit experience the resume does not show. Respond with JSON only.";

const SCORE_INSTRUCTIONS = `Judge the resume against each of the job's requirements.

Inputs: RESUME (the candidate's resume, contact details removed); REQUIREMENTS (numbered, read from the posting once and fixed for this job); JOB (the posting, for context only).

For each requirement give one verdict and a quote:
- met: a line of RESUME shows the candidate has done or has this. quote copies that line's words exactly, up to 25 words.
- weak: RESUME mentions it but does not show it: a skills-list entry, a related but different technology or domain, or less than the scope or seniority asked for. quote copies the mention exactly.
- missing: nothing in RESUME supports it. quote is "".

Rules:
- A quote must be words RESUME contains, copied exactly: prefer the whole line, and never quote the job or the requirement itself. A quote that is not in RESUME is thrown away and the verdict lowered, and a met whose only evidence is the skills list counts as weak.
- When several lines of RESUME speak to a requirement, read them all and quote the strongest: a line that states a figure over one that does not, a line about work done over a mention of the term. The verdict is for the strongest line, not the first one found.
- A related technology or domain is not the same one (AWS is not SageMaker; Docker is not Kubernetes; iOS is not Android; payments is not lending): at most weak.
- A line that only names tools ("AWS, Kubernetes, Terraform, Datadog") shows no work with them: at most weak. A requirement about something measured (metrics, performance, cost, latency) is met only by a line that states a figure.
- Years of experience are judged from the dates and the summary of RESUME; a program checks them too. Years in a named field ("8+ years in DevOps") are counted from the roles whose titles and bullets are in that field: a candidate whose roles are in another field is at most weak, whatever the summary says.
- Judge each requirement on its own, and the same way every time: the same resume and requirement always get the same verdict. When you hesitate between two verdicts, give the lower one.

Also:
- matchedKeywords / topMissingKeywords: short terms (1-3 words) from the job that RESUME contains verbatim / lacks. No soft skills.
- tailoringOpportunities: experience already in RESUME that could truthfully be emphasized for this job. No conditional suggestions.

Answer with a verdict for every requirement, under its number as "id".`;

/** The structured job fields worth showing the tailoring model; nothing about sources, dedup or enrichment state. */
export function jobForModel(job) {
  return (
    compact({
      title: job?.title,
      company: job?.company,
      category: job?.category,
      subcategory: job?.subcategory,
      seniority: job?.seniority,
      yearsExperienceMin: job?.yearsExperienceMin,
      employmentType: job?.employmentType,
      workplace: job?.workplace,
      skills: job?.skills,
      preferredSkills: job?.preferredSkills,
      degree: job?.ai?.conditions?.degree,
      languages: job?.ai?.conditions?.languages,
    }) || {}
  );
}

/** The requirements as the prompt numbers them: "0. [required experience] 5+ years building APIs". */
export const requirementLines = (requirements) => requirements.map((r, id) => `${id}. [${r.priority} ${r.kind}] ${r.text}`).join('\n');

/**
 * The scoring prompt. The instructions and the resume come first, so the prefix is identical
 * across the jobs one user scores and the provider's prompt cache serves it. `job.requirements`
 * are the job's cached requirements (workspace/service.js anchoredJob).
 */
export function buildScorePrompt({ resume, job }) {
  const { block, text } = resumeForModel(resume);
  const requirements = Array.isArray(job?.requirements) ? job.requirements : [];
  const user = `${SCORE_INSTRUCTIONS}

RESUME:
${block}

REQUIREMENTS:
${requirementLines(requirements) || '(none)'}

JOB:
${job?.title || 'Not specified'}${job?.company ? ` at ${job.company}` : ''}
${jobPostingBlock(job?.description || '', JOB_DESCRIPTION_CHARS)}`;
  return { system: SCORE_SYSTEM_PROMPT, user, resumeText: text, requirements };
}
