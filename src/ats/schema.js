import { boundedList, object, oneOf, str, strictFormat } from '../llm/schema.js';

// The scorer answers one verdict per requirement of the job, with the resume's words that back
// it; the score is worked out from the verdicts in code (breakdown.js), so the weights live in
// one place and the model never states a number. Keyword lists and opportunities steer tailoring.
export const SCORE_RESPONSE_FORMAT = strictFormat(
  'ats_score',
  object({
    verdicts: { type: 'array', maxItems: 20, items: object({ id: { type: 'integer' }, verdict: oneOf(['met', 'weak', 'missing']), quote: str }) },
    matchedKeywords: boundedList(15),
    topMissingKeywords: boundedList(15),
    tailoringOpportunities: boundedList(5),
  })
);

// A posting read once and cached for every resume scored against it. Its named skills anchor a
// job that has no structured skills of its own (a pasted job, or a pool job enrichment has not
// reached); its other requirements (experience, responsibilities, education) are what the
// scorer gives verdicts on, so the list judged against never changes between runs.
export const JOB_REQUIREMENTS_RESPONSE_FORMAT = strictFormat(
  'job_requirements',
  object({
    required: boundedList(15),
    preferred: boundedList(10),
    // More than the scorer judges (requirements.js MAX_REQUIREMENT_ITEMS), so that the code, not
    // the schema, decides which are kept and each kind gets its share.
    items: { type: 'array', maxItems: 30, items: object({ text: str, kind: oneOf(['experience', 'responsibility', 'education']), priority: oneOf(['required', 'preferred']) }) },
  })
);
