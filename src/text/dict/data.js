import fs from 'node:fs';

// The ported freehire dictionaries (see data/README.md), parsed once at import so every
// module reads the same copy. Synchronous on purpose: the tables are needed the moment a
// posting is classified, and a lazy load would only move the same read to the first call.
export const DICTIONARY = JSON.parse(fs.readFileSync(new URL('./data/skills.json', import.meta.url), 'utf8'));
