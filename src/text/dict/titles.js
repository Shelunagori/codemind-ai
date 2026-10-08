import { DICTIONARY } from './data.js';

// Curated job-title terms, ported from freehire's classify package. Each list holds
// only terms that never occur in the other kind of title: "software engineer" and
// "pharmacy technician", never a bare "engineer" or "technician", so neither test ever
// guesses. Whole-word matching on Unicode letters, so a Cyrillic term is bounded like a
// Latin one and "nurse" does not match inside "nursery".

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const termPattern = (terms) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${terms.map(escapeRegex).join('|')})(?![\\p{L}\\p{N}])`, 'u');

const TECH = termPattern(DICTIONARY.techTitleTerms);
const NON_TECH = termPattern(DICTIONARY.nonTechTitleTerms);

// Brazilian-Portuguese titles write both genders, "operador(a) de caixa"; the parenthetical
// is cut so the phrase reads in its listed form.
const PT_GENDER_SUFFIX = /\((?:a|o|as|os|a\/o)\)/g;

/** True when the title names a software or IT role outright ("Software Engineer II", "DevOps Engineer"). */
export function isTechTitle(title) {
  return TECH.test(String(title ?? '').toLowerCase());
}

/** True when the title names a role that is clearly not technical ("Pharmacy Technician", "Nurse Practitioner"). */
export function isNonTechTitle(title) {
  return NON_TECH.test(String(title ?? '').toLowerCase().replace(PT_GENDER_SUFFIX, ''));
}
