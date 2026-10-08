import { object, oneOf, str, strictFormat } from '../../llm/schema.js';

export const QUESTION_TYPES = ['behavioral', 'roleSpecific', 'technical'];
export const AUDIENCES = ['recruiter', 'hiringManager', 'team', 'leadership'];

export const PREP_RESPONSE_FORMAT = strictFormat(
  'interview_prep',
  object({
    likely: { type: 'array', maxItems: 10, items: object({ question: str, type: oneOf(QUESTION_TYPES) }) },
    toAsk: { type: 'array', maxItems: 8, items: object({ question: str, why: str, audience: oneOf(AUDIENCES) }) },
    redFlags: { type: 'array', maxItems: 5, items: object({ concern: str, quote: str, ask: str }) },
    talkingPoints: { type: 'array', maxItems: 6, items: object({ requirement: str, evidence: str, say: str }) },
    actionPlan: { type: 'array', maxItems: 6, items: str },
  })
);

export const FEEDBACK_RESPONSE_FORMAT = strictFormat(
  'interview_feedback',
  object({
    strengths: { type: 'array', maxItems: 3, items: str },
    gaps: { type: 'array', maxItems: 4, items: str },
    star: object({ situation: { type: 'boolean' }, task: { type: 'boolean' }, action: { type: 'boolean' }, result: { type: 'boolean' } }),
    rewrite: str,
  })
);
