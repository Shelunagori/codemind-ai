// What a posting's text says about the company's funding, as patterns with no other dependency:
// the startup badge (startups.js) and enrichment's checks (enrich/validate.js) both read them.

/** A billion-dollar valuation ("valued at over $1 billion", "unicorn"): past what the badge means. */
export const BILLION_VALUATION = /\bunicorn\b|\bvalu(?:ed|ation) (?:at |of )?(?:over |more than |nearly |almost |about )?[$€£]?\s?\d+(?:\.\d+)?\s?(?:billion|bn|b)\b/i;

/** A recruiter describing the company it hires for: the funding is the client's, not the poster's. */
export const FOR_A_CLIENT = /\bour client\b|\bon behalf of (?:our|a|an) client\b|\bclient of ours\b/i;
