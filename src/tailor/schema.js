import { boundedList, object, otherSection, projectEntry, skillGroup, str, strictFormat, strList } from '../llm/schema.js';

// A rewritten bullet names the resume bullet it comes from, by index within the same role; null
// when it has none (a confirmed keyword's bullet). That is what lets the code show an exact
// before and after, and refuse a bullet that comes from nowhere (bullets.js).
// `estimate` is the clause carrying a figure the model estimated ('' for none; estimates.js).
const tracedBullet = object({ text: str, from: { type: ['integer', 'null'] }, estimate: str });
const tailoredExperienceEntry = object({ company: str, title: str, period: str, achievements: { type: 'array', items: tracedBullet } });

// A tailored resume: the parts of the form tailoring may rewrite. Contact details, education,
// certifications and languages are facts the code copies from the source resume (form.js),
// so the model is never asked to repeat them. The job's keywords come first so the model has
// named what it is writing towards before it writes; whether the resume has each one is
// checked in code, not asked.
export const TAILOR_RESPONSE_FORMAT = strictFormat(
  'tailored_resume',
  object({
    jobKeywords: boundedList(20),
    // The line under the name, written apart from the job's title (headline.js).
    headline: object({ role: str, specialties: boundedList(3) }),
    resume: object({
      summary: str,
      skills: strList,
      // Only for a resume that lists its skills by category; [] otherwise (form.js).
      skillGroups: { type: 'array', items: skillGroup },
      experience: { type: 'array', items: tailoredExperienceEntry },
      projects: { type: 'array', items: projectEntry },
      achievements: strList,
      otherSections: { type: 'array', items: otherSection },
    }),
    suggestions: boundedList(5),
  })
);

// The gap pass's answer (gap.js): one line per requirement the tailored resume still falls
// short of, by the requirement's id — the whole text of the bullet it extends ("from", its index
// in "role") or a new bullet (from null), with its estimated figure's clause.
export const GAP_RESPONSE_FORMAT = strictFormat(
  'tailor_gaps',
  object({
    lines: { type: 'array', maxItems: 20, items: object({ id: { type: 'integer' }, role: { type: 'integer' }, from: { type: ['integer', 'null'] }, text: str, estimate: str }) },
  })
);

// The repair round's answer (repair.js): each flagged line, rewritten, under the id it was sent with.
export const REPAIR_RESPONSE_FORMAT = strictFormat('tailor_repair', object({ lines: { type: 'array', maxItems: 12, items: object({ id: { type: 'integer' }, text: str }) } }));
