import { VERDICT_POINTS } from './verdicts.js';

// The score from the verdicts: five categories, each a share of its items' verdicts, combined
// with the weights below. The same verdicts always give the same score.

export const SCORE_WEIGHTS = { requiredSkills: 35, experience: 30, responsibilities: 20, preferredSkills: 10, education: 5 };
const PRIORITY_WEIGHT = { required: 2, preferred: 1 };

const clamp = (n) => Math.min(100, Math.max(0, Math.round(n)));

/** The weighted score over the categories that were scored; null when none was. */
export function combineBreakdown(breakdown) {
  let sum = 0;
  let weight = 0;
  for (const [key, w] of Object.entries(SCORE_WEIGHTS)) {
    const value = breakdown?.[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      sum += clamp(value) * w;
      weight += w;
    }
  }
  return weight ? clamp(sum / weight) : null;
}

/** One category's score from its items' verdicts, required ones weighing double; null with no items. */
function categoryScore(items) {
  if (!items.length) return null;
  let got = 0;
  let possible = 0;
  for (const item of items) {
    const w = PRIORITY_WEIGHT[item.priority] || PRIORITY_WEIGHT.required;
    got += VERDICT_POINTS[item.verdict] * w;
    possible += w;
  }
  return clamp((got / possible) * 100);
}

/**
 * The five categories from the verdicts: the skill categories from the skill verdicts, the rest
 * from the requirements of their kind. A category with nothing to judge is null and does not
 * count, so the weights of the others carry the score.
 */
export function breakdownFrom({ required, preferred, verdicts }) {
  const kind = (k) => verdicts.filter((v) => v.kind === k);
  return {
    requiredSkills: categoryScore(required.map((s) => ({ ...s, priority: 'required' }))),
    experience: categoryScore(kind('experience')),
    responsibilities: categoryScore(kind('responsibility')),
    preferredSkills: categoryScore(preferred.map((s) => ({ ...s, priority: 'required' }))),
    education: categoryScore(kind('education')),
  };
}
