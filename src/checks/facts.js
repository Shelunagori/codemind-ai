import { certificationClaims, sourcedCertifications } from './certifications.js';
import { sourcedFigures, unsourcedFigures } from './figures.js';
import { inflatedTenure, supportedYears } from './tenure.js';

// ── One line against the source ────────────────────────────────────────────
//
// A line that states a figure, a tenure or a certification the candidate's own resume does not
// support is an invention. Tailoring never keeps one: the source line stands instead
// (tailor/bullets.js).

/**
 * What a written line may state, taken from the source resume `form` and whatever else the
 * candidate told us (`extraText`: confirmed keywords and their notes). Contact details are left
 * out, so a phone number cannot vouch for an invented figure.
 */
export function factSources(form, sourceText, extraText = '') {
  const withoutContact = [form?.phone, form?.email, form?.location].filter(Boolean).reduce((text, value) => text.split(value).join(' '), String(sourceText || ''));
  const all = `${withoutContact}\n${extraText}`;
  return { figures: sourcedFigures(all), certifications: sourcedCertifications(all), years: supportedYears(form) };
}

/**
 * Why `text` cannot stand as written: a figure, a tenure or a certification the sources do not
 * support. [] when it can.
 */
export function unsupportedFacts(text, sources) {
  const found = [];
  for (const figure of unsourcedFigures(text, sources.figures)) found.push({ code: 'figure', value: figure });
  for (const claim of inflatedTenure(text, sources.years)) found.push({ code: 'tenure', value: claim.text });
  for (const key of certificationClaims(text)) if (!sources.certifications.has(key)) found.push({ code: 'certification', value: key });
  return found;
}
