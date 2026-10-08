// Reads a posting's level from its title alone, so a job has one before AI enrichment reaches it
// (enrich/worker.js reads a job once, within a daily budget, and may be off entirely). An enriched
// job keeps the model's answer: this only fills what nothing has answered yet (enrich/apply.js).
//
// The values are the ones enrichment uses, so both write the same field (enrich/schema.js).
// Titles that name no level at all return null rather than a guess: "Software Engineer" is not
// evidence of anything, and a job saying "mid" on no grounds is worse than one saying nothing.

// Read in order, most specific first: "Senior Staff Engineer" is staff, "Lead Data Engineer" lead,
// "Senior Engineering Manager" and "Head of Platform" manager: the people-management rungs above a
// lead (director, vice president, the C-level) are the one level enrichment calls manager.
// "Member of Technical Staff" is a job title, not a staff level. The one table for the title's
// level: enrichment's fallback reads it too (enrich/validate.js), so a job is not given one level
// by ingest and another by a model that answered nothing.
const RULES = [
  ['intern', /\b(intern|interns|internship|co-?op|working student|placement student|summer analyst)\b/i],
  ['junior', /\b(junior|jnr|jr\.?|entry[\s-]?level|new[\s-]?grad|graduate|grad programme|trainee|apprentice)\b/i],
  [
    'manager',
    /\b((?:engineering|development|software|technical|technology|it|qa|data|devops|platform|infrastructure|security) manager|director|head of|vice president|vp|svp|evp|chief \w+ officer|cto|cio|ciso)\b/i,
  ],
  ['principal', /\b(principal|distinguished|fellow)\b/i],
  ['staff', /(?<!technical\s)\b(staff|senior staff)\b/i],
  ['lead', /\b(lead|team lead|tech lead|technical lead)\b/i],
  ['senior', /\b(senior|snr|sr\.?)\b/i],
  // "Middle Python Developer" and "Intermediate Developer" are how many boards write mid-level.
  ['mid', /\b(mid[\s-]?level|intermediate|middle)\b/i],
];

// A level written as a numeral instead of a word: "Engineer III", "Software Engineer 2", "SWE L5".
// I/1 is the first rung, II/2 the second, III and up senior. Roman numerals only where they stand
// alone, or every title with "I" in it would match.
const NUMERAL = [
  ['senior', /\b(?:l|level\s*)?([3-9])\b|\b(iii|iv|v|vi|vii)\b/i],
  ['mid', /\b(?:l|level\s*)?2\b|\bii\b/i],
  ['junior', /\b(?:l|level\s*)?1\b|\bi\b(?!\w)/i],
];

/**
 * The level a title states, or null when it states none.
 * Returns one of: intern | junior | mid | senior | staff | principal | lead | manager.
 */
export function seniorityFromTitle(title) {
  // Bracketed asides are where locations and req numbers live ("Engineer (2024-1138)"), and their
  // digits would read as a level.
  const text = String(title || '').replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').trim();
  if (!text) return null;

  // "Senior" beside "Staff" or "Principal" is the higher of the two, which the order above gives.
  for (const [level, pattern] of RULES) {
    if (pattern.test(text)) return level;
  }
  for (const [level, pattern] of NUMERAL) {
    if (pattern.test(text)) return level;
  }
  return null;
}

// A line of the description that states the level outright, as many boards print their facts:
// "Level: Senior", "Seniority: Mid-level", "Experience level: Entry level".
const LEVEL_LINE = /^\s*(?:seniority(?: level)?|career level|experience level|job level|level)\s*[:–-]\s*(.{2,40})$/im;

/**
 * The level a title states, else the level a "Level: …" line of the description states; null
 * when neither says. A title outranks the line: it is the posting's own name for the role.
 */
export function seniorityOf(title, description = '') {
  const fromTitle = seniorityFromTitle(title);
  if (fromTitle) return fromTitle;
  const line = String(description || '').slice(0, 4000).match(LEVEL_LINE)?.[1];
  return line ? seniorityFromTitle(line) : null;
}
