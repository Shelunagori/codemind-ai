import { experienceEntry, object, otherSection, projectEntry, skillGroup, str, strictFormat, strList } from '../llm/schema.js';

// The structured resume form, field for field (see resume/structuredResume.js).
export const PARSE_RESUME_RESPONSE_FORMAT = strictFormat(
  'structured_resume',
  object({
    name: str,
    title: str,
    email: str,
    phone: str,
    location: str,
    linkedin: str,
    github: str,
    portfolio: str,
    summary: str,
    skillsHeading: str,
    skills: strList,
    skillGroups: { type: 'array', items: skillGroup },
    experience: { type: 'array', items: experienceEntry },
    education: { type: 'array', items: object({ school: str, degree: str, location: str, year: str }) },
    projects: { type: 'array', items: projectEntry },
    certifications: { type: 'array', items: object({ name: str, issuer: str, year: str }) },
    languages: strList,
    achievements: strList,
    otherSections: { type: 'array', items: otherSection },
  })
);
