import { LETTER_CONVENTIONS } from './letterConventions.js';

// How a cover letter is written in the job's market: length, register, the salutation and
// sign-off people there expect, and local notes ("Yours faithfully" to Sir or Madam in the UK,
// DIN 5008 formality in Germany). Data ported from ai-job-hunter-app (Apache-2.0); see
// letterConventions.js. A job whose country is not one of its markets gets the
// international defaults.

const { markets: MARKETS } = LETTER_CONVENTIONS;

// Country names as jobs store them (jobs/countries.js), and the other spellings they come in.
const ALIASES = {
  'united states': 'us', usa: 'us', us: 'us', 'united states of america': 'us',
  'united kingdom': 'uk', uk: 'uk', 'great britain': 'uk', england: 'uk', scotland: 'uk', wales: 'uk', 'northern ireland': 'uk',
  germany: 'de', deutschland: 'de', austria: 'at', switzerland: 'ch', france: 'fr', spain: 'es', italy: 'it', portugal: 'pt',
  brazil: 'br', turkey: 'tr', 'türkiye': 'tr', turkiye: 'tr', russia: 'ru', 'russian federation': 'ru', china: 'cn', japan: 'jp',
  'south korea': 'kr', korea: 'kr', 'republic of korea': 'kr',
};

// The words English prose is made of. A posting where they are this common is in English.
const ENGLISH_WORDS = new Set(['the', 'and', 'to', 'of', 'a', 'in', 'for', 'with', 'you', 'we', 'our', 'will', 'is', 'are', 'your', 'on', 'as', 'be', 'this', 'that']);
const ENGLISH_SHARE = 0.12;

/** True when `text` reads as English: its function words make up a large enough share of it. */
export function readsAsEnglish(text) {
  const words = String(text || '').toLowerCase().match(/\p{L}+/gu) || [];
  if (words.length < 20) return false;
  return words.filter((w) => ENGLISH_WORDS.has(w)).length / words.length >= ENGLISH_SHARE;
}

/** The market key for a job's country ("Germany" → "de"); "intl" when it has none of its own. */
export function marketFor(country) {
  const key = ALIASES[String(country || '').trim().toLowerCase()];
  return key && MARKETS[key] ? key : 'intl';
}

/** The conventions of a market, by key. */
export const conventionsOf = (market) => MARKETS[market] || MARKETS.intl;

/**
 * The conventions as a prompt section, for a job in `country`. Layout rules (date, address,
 * subject line) are left out: the letter is pasted into a form, not printed.
 */
export function letterConventionsBlock(country, { postingText = '' } = {}) {
  const market = marketFor(country);
  const c = conventionsOf(market);
  const native = c.nativeLanguage && c.nativeLanguage !== 'en';
  // An English posting in a German market still gets an English letter. Shown the German forms,
  // a model writes the whole letter in German, so it is shown English ones in the market's register.
  const forms =
    native && readsAsEnglish(postingText)
      ? `- The posting is in English, so the letter is in English: with no name to address, open with "${c.formality === 'formal' ? 'Dear Sir or Madam,' : 'Dear Hiring Manager,'}" and sign off with "${c.formality === 'formal' ? 'Yours faithfully,' : 'Kind regards,'}".`
      : `- With no name to address, open with "${c.salutations.generic}" and sign off with "${c.signoffs[0]}".${native ? ' In a letter not written in that language, use the equivalent formal forms of the language it is written in.' : ''}`;
  return [
    `Market: ${c.country}${market === 'intl' ? ' (no country of its own is known for this job)' : ''}.`,
    `- Length: ${c.lengthWords.min}-${c.lengthWords.max} words. Register: ${c.formality}.`,
    forms,
    `- ${c.notes}`,
    '- Write the letter in the language of the posting, unless CANDIDATE_INSTRUCTIONS ask for another: the market sets only the length, register, salutation and sign-off.',
    '- No subject line ("Betreff", "Re:", "Objet"), date or address, whatever the notes above say: the letter is pasted into a form.',
  ].join('\n');
}
