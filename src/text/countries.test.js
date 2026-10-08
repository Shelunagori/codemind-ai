import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  COUNTRY_NAMES,
  REGION_FILTERS,
  countryFilterValues,
  countryForToken,
  countryFromCode,
  countryNameFromCode,
  extractCountries,
  placeMentioned,
} from './countries.js';

// freehire's dictionary, which the table in countries.js is checked against so the two never
// drift apart the way freehire's own once did (25 countries with a region and no name).
const DICT = JSON.parse(readFileSync(new URL('./dict/data/countries.json', import.meta.url), 'utf8'));

test('countryForToken names a whole token and nothing longer', () => {
  assert.equal(countryForToken('UK'), 'United Kingdom');
  assert.equal(countryForToken('u.s.'), 'United States');
  assert.equal(countryForToken('The Netherlands'), 'Netherlands');
  assert.equal(countryForToken('EMEA'), 'EMEA');
  assert.equal(countryForToken('New Mexico'), '');
  assert.equal(countryForToken('Berlin'), '');
  assert.equal(countryForToken(''), '');
});

test('countryForToken reads the native, Spanish, Portuguese and German names, accents or not', () => {
  assert.equal(countryForToken('Deutschland'), 'Germany');
  assert.equal(countryForToken('España'), 'Spain');
  assert.equal(countryForToken('Espana'), 'Spain');
  assert.equal(countryForToken('Vereinigtes Königreich'), 'United Kingdom');
  assert.equal(countryForToken('Brasil'), 'Brazil');
  assert.equal(countryForToken('Україна'), 'Ukraine');
  assert.equal(countryForToken('Россия'), 'Russia');
});

test('the names that are also US places are withheld', () => {
  assert.equal(countryForToken('Georgia'), '');
  assert.equal(countryForToken('Republic of Georgia'), 'Georgia');
  assert.equal(countryForToken('Palestine'), '');
  assert.equal(countryForToken('Palestinian Territories'), 'Palestine');
  // Neither the country nor (as the state names leave it out) the United States.
  assert.deepEqual(extractCountries('Atlanta, Georgia'), []);
});

test('extractCountries finds every country and region a text names, regions first', () => {
  assert.deepEqual(extractCountries('Remote - US'), ['United States']);
  assert.deepEqual(extractCountries('USA, Canada'), ['United States', 'Canada']);
  assert.deepEqual(extractCountries('North America'), ['North America']);
  assert.deepEqual(extractCountries('New South Wales, Australia'), ['Australia']);
  assert.deepEqual(extractCountries('Northern Ireland'), ['United Kingdom']);
  assert.deepEqual(extractCountries('Panama City, FL'), ['United States']);
  assert.deepEqual(extractCountries('Panama City, Panama'), ['Panama']);
  assert.deepEqual(extractCountries('Nairobi, Kenya or Lagos, Nigeria'), ['Nigeria', 'Kenya']);
  assert.deepEqual(extractCountries('Prishtina, Kosovo'), ['Kosovo']);
  assert.deepEqual(extractCountries(''), []);
});

test('countryNameFromCode and countryFromCode give the table name for a code', () => {
  assert.equal(countryNameFromCode('DE'), 'Germany');
  assert.equal(countryNameFromCode('gb'), 'United Kingdom');
  assert.equal(countryNameFromCode('HK'), 'Hong Kong');
  assert.equal(countryNameFromCode('XK'), 'Kosovo');
  assert.equal(countryNameFromCode('GE'), 'Georgia');
  assert.equal(countryNameFromCode('ZZ'), '');
  assert.equal(countryNameFromCode(''), '');
  for (const code of ['US', 'ca', 'XK', 'AF', 'nope']) assert.equal(countryFromCode(code), countryNameFromCode(code));
});

test('every country freehire knows has a row, and every alias shared with it agrees on the code', () => {
  const codes = new Set(Object.values(DICT.nameToCountry));
  const missing = [...codes].filter((code) => !countryNameFromCode(code));
  assert.deepEqual(missing, []);
  for (const [alias, code] of Object.entries(DICT.nameToCountry)) {
    const name = countryForToken(alias);
    if (name) assert.equal(name, countryNameFromCode(code), `"${alias}"`);
  }
});

test('the region filters carry the members freehire groups under each region', () => {
  const names = (codes) => codes.map((code) => countryNameFromCode(code));
  const expect = (region, codes) => {
    for (const name of names(codes)) assert.ok(REGION_FILTERS[region].includes(name), `${name} in ${region}`);
  };
  expect('Europe', [...DICT.regionCountries.eu, ...DICT.regionCountries.uk]);
  expect('Latin America', DICT.regionCountries.latam);
  expect('APAC', DICT.regionCountries.apac);
  expect('Middle East', DICT.regionCountries.mena);
  expect('Africa', DICT.regionCountries.africa);
  for (const members of Object.values(REGION_FILTERS)) {
    for (const name of members) assert.ok(COUNTRY_NAMES.includes(name), name);
  }
});

test('countryFilterValues gives a region its group and a country itself', () => {
  assert.equal(countryFilterValues('Europe'), REGION_FILTERS.Europe);
  assert.ok(countryFilterValues('Europe').includes('Kosovo'));
  assert.ok(countryFilterValues('Middle East').includes('Morocco'));
  assert.deepEqual(countryFilterValues('Zimbabwe'), ['Zimbabwe']);
  assert.deepEqual(countryFilterValues('Atlantis'), []);
});

test('placeMentioned reads any alias of the place', () => {
  assert.ok(placeMentioned('United States', 'Candidates must be based in the U.S.'));
  assert.ok(placeMentioned('Germany', 'Standort: Deutschland'));
  assert.ok(placeMentioned('Spain', 'Ubicación: Espana'));
  assert.ok(!placeMentioned('Mexico', 'Albuquerque, New Mexico'));
});
