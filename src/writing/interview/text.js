// Text helpers the interview answers are cleaned with.

export const text = (v) => (typeof v === 'string' ? v.trim() : '');

/** The words of a text, lower case, accents stripped. */
export const words = (v) =>
  String(v || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .match(/[a-z0-9]+/g) || [];

export const unquote = (v) => v.replace(/^["'“‘]+|["'”’]+$/g, '').trim();
