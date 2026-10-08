import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIELD_NOTE_CATEGORIES, fieldNotesFor } from './fieldNotes.js';

test('each note has its four parts', () => {
  for (const key of FIELD_NOTE_CATEGORIES) {
    const note = fieldNotesFor({ category: key });
    assert.match(note, /^FIELD_NOTES \(/);
    for (const part of ['Measures that count here', 'Duties a resume in this field', "Say it in the field's terms", 'Not without evidence in RESUME']) assert.ok(note.includes(part), `${key}: ${part}`);
  }
});

test("a subcategory adds its line; an unknown one, a missing category or a pasted job get the general note", () => {
  const sre = fieldNotesFor({ category: 'devops', subcategory: 'sre' });
  assert.match(sre, /^FIELD_NOTES \(DevOps \/ SRE\):/);
  assert.match(sre, /deployment frequency, lead time for changes, change failure rate/);
  assert.match(sre, /\n- In site reliability roles in particular: SLOs and error budgets/);
  assert.doesNotMatch(fieldNotesFor({ category: 'devops', subcategory: 'nope' }), /- In /);
  assert.doesNotMatch(fieldNotesFor({ category: 'devops' }), /- In /);
  for (const job of [{ category: 'software' }, { category: 'other' }, {}, null, { category: 'devops ' }]) {
    const note = fieldNotesFor(job);
    if (job?.category === 'devops ') assert.match(note, /DevOps/, 'spacing does not matter');
    else assert.match(note, /^FIELD_NOTES \(Software engineering\):/);
  }
});
