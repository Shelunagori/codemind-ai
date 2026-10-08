import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalSkill, parseSkills, skillAliases, skillDescription, skillLabel } from './skills.js';

test('canonicalSkill resolves word, phrase and acronym aliases, and a bare canonical', () => {
  assert.equal(canonicalSkill('golang'), 'go');
  assert.equal(canonicalSkill('k8s'), 'kubernetes');
  assert.equal(canonicalSkill('Node.js'), 'nodejs');
  assert.equal(canonicalSkill('Node JS'), 'nodejs');
  assert.equal(canonicalSkill('C++'), 'cpp');
  assert.equal(canonicalSkill('CI/CD'), 'ci-cd');
  assert.equal(canonicalSkill('React-Native'), 'react-native');
  assert.equal(canonicalSkill('Postgres'), 'postgresql');
  assert.equal(canonicalSkill('ML'), 'machine-learning');
  // A slug the alias tables never list on its own is still accepted when named outright.
  assert.equal(canonicalSkill('Go'), 'go');
  assert.equal(canonicalSkill(' kubernetes '), 'kubernetes');
});

test('canonicalSkill never guesses: unknown text, sentences and prototype names give null', () => {
  assert.equal(canonicalSkill('Basket weaving'), null);
  assert.equal(canonicalSkill('we use golang here'), null);
  assert.equal(canonicalSkill('constructor'), null);
  assert.equal(canonicalSkill(''), null);
  assert.equal(canonicalSkill(null), null);
});

test('skillLabel is the curated name, else the slug title-cased', () => {
  assert.equal(skillLabel('ci-cd'), 'CI/CD');
  assert.equal(skillLabel('cpp'), 'C++');
  assert.equal(skillLabel('postgresql'), 'PostgreSQL');
  assert.equal(skillLabel('nodejs'), 'Node.js');
  assert.equal(skillLabel('go'), 'Go');
  assert.equal(skillLabel('data-engineering'), 'Data Engineering');
  assert.equal(skillLabel('not-a-skill'), 'Not A Skill');
});

test('skillAliases lists every spelling that resolves to a slug, and skillDescription says what it is', () => {
  assert.deepEqual(skillAliases('kubernetes'), ['k8s', 'kubernetes']);
  const go = skillAliases('go');
  assert.ok(go.includes('golang'), go);
  assert.ok(!go.includes('go'), 'a bare "go" is an English verb, never an alias');
  assert.ok(skillAliases('cpp').includes('c++'));
  assert.deepEqual(skillAliases('nope'), []);
  assert.match(skillDescription('kubernetes'), /container/i);
  assert.equal(skillDescription('nope'), '');
});

test('parseSkills finds the technologies a job description names', () => {
  const found = parseSkills(
    'We build APIs in Go (golang) and TypeScript on Kubernetes, ship through CI/CD with GitHub Actions, and keep data in Postgres. Node.js and C++ experience welcome; ML background a plus.'
  );
  for (const slug of ['go', 'typescript', 'kubernetes', 'ci-cd', 'github-actions', 'postgresql', 'nodejs', 'cpp', 'machine-learning']) {
    assert.ok(found.includes(slug), `${slug} in ${found}`);
  }
  assert.deepEqual(found, [...found].sort());
});

test('parseSkills keeps an ambiguous English word only beside an unambiguous technology', () => {
  assert.deepEqual(parseSkills('You must react quickly to change and make swift decisions.'), []);
  assert.deepEqual(parseSkills('You must react quickly to change and make swift decisions.', { corroborate: false }), ['react', 'swift']);
  assert.deepEqual(parseSkills('React and TypeScript'), ['react', 'typescript']);
  // A discipline phrase tags itself but cannot vouch for the gated word beside it.
  assert.deepEqual(parseSkills('AI-powered content marketing'), ['content-marketing']);
});

test('parseSkills respects term boundaries in punctuated, accented and marked-up text', () => {
  assert.deepEqual(parseSkills('A dokumentáció elkészítése a feladatod.'), []);
  assert.deepEqual(parseSkills('Rendszertervek elkészítése Python nyelven.'), ['python']);
  assert.deepEqual(parseSkills('ELK stack üzemeltetése'), ['elk']);
  assert.ok(!parseSkills('see contoso.net for details').includes('dotnet'), '".net" is only the tail of a domain');
  assert.ok(parseSkills('we use asp.net here').includes('dotnet'), '"asp.net" is an alias in its own right');
  assert.ok(parseSkills('We use C#.').includes('csharp'));
  const objc = parseSkills('Objective-C and Swift');
  assert.ok(objc.includes('objective-c') && objc.includes('swift') && !objc.includes('c'), objc);
  assert.deepEqual(parseSkills('<p>Read https://example.com/about-us.html then write <b>golang</b></p>'), ['go']);
  assert.deepEqual(parseSkills(''), []);
});
