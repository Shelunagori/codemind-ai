// ATS scoring, the pure half: what the model is shown (prompt.js) and what the code decides for
// itself afterwards — the verdict on each skill and requirement (verdicts.js), the categories
// and the number (breakdown.js), which of a posting's requirements are judged (requirements.js),
// and the stored match fields (interpret.js). service.js runs the calls.

export { buildScorePrompt, compact, jobForModel, requirementLines, resumeForModel, SCORE_SYSTEM_PROMPT } from './prompt.js';
export { checkedVerdicts, heldVerdicts, listLike, MEASURED_RE, quoteInResume, skillVerdicts, VERDICT_POINTS, yearsCap } from './verdicts.js';
export { breakdownFrom, combineBreakdown, SCORE_WEIGHTS } from './breakdown.js';
export { MAX_REQUIREMENT_ITEMS, pickRequirementItems } from './requirements.js';
export { filterMatchedKeywords, interpretScoreAnswer, verifiedSkills } from './interpret.js';
export { JOB_REQUIREMENTS_RESPONSE_FORMAT, SCORE_RESPONSE_FORMAT } from './schema.js';
