// Checks on what a model wrote for the candidate, done in code rather than asked of the model.
// Two kinds:
//
//   facts     A line that states a figure (figures.js), a tenure (tenure.js) or a certification
//             (certifications.js) the candidate's own resume does not support is an invention
//             (facts.js). Each check is lenient about how the source wrote the fact, because a
//             wrong accusation is worse than a missed one.
//   hygiene   Things a recruiter or a keyword scanner reads badly (warnings.js): bullets too long
//             to scan, a role buried under bullets, the same bullet twice, a keyword repeated until
//             it reads as stuffing, a skill listed that no line shows. Warnings only.
//
// Rules and thresholds ported from ai-job-hunter-app (github.com/saeedkolivand/ai-job-hunter-app,
// Apache-2.0), apps/desktop/src-tauri/src/validate/content/.

export { figureClaims, normalizeNumber, sourcedFigures, unsourcedFigures } from './figures.js';
export { inflatedTenure, supportedYears, tenureClaims } from './tenure.js';
export { certificationClaims, sourcedCertifications } from './certifications.js';
export { factSources, unsupportedFacts } from './facts.js';
export { DUPLICATE_OVERLAP, MAX_BULLET_CHARS, MAX_BULLETS_PER_ROLE, MAX_KEYWORD_OCCURRENCES, MAX_KEYWORD_SHARE, MIN_WORDS_FOR_SHARE, resumeWarnings } from './warnings.js';
