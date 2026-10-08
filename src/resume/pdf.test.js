import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formResumeModel } from './docx.js';
import { pdfSafe, renderResumePdf } from './pdf.js';
import { TEMPLATE_IDS } from './templates.js';
import { extractText } from './textExtract.js';

const FORM = {
  name: 'José Doe',
  title: 'Senior Data Engineer',
  email: 'jose@example.com',
  phone: '(555) 010-2030',
  location: 'Austin, Texas',
  summary: 'Data engineer with 10 years building pipelines → warehouses.',
  skills: ['Python', 'SQL'],
  skillGroups: [{ category: 'Languages', items: ['Python', 'SQL'] }],
  experience: [
    { title: 'Senior Data Engineer', company: 'Northwind', period: 'Oct 2019 — Present', achievements: ['Built data services on AWS.', 'Cut batch time by 40%.'] },
  ],
  education: [{ degree: 'BS Computer Science', school: 'University of Texas', year: '2017' }],
};

test('every template renders a PDF the app reads back as the resume', async () => {
  for (const template of TEMPLATE_IDS) {
    const buffer = await renderResumePdf({ model: formResumeModel(FORM), template });
    assert.equal(buffer.subarray(0, 5).toString(), '%PDF-', template);
    const text = await extractText(buffer, { mimeType: 'application/pdf' });
    for (const expected of ['José Doe', 'Senior Data Engineer', 'Northwind', 'Oct 2019', 'Built data services on AWS.', 'Python', 'University of Texas']) {
      assert.ok(text.includes(expected), `${template}: ${expected}`);
    }
  }
});

test('a long resume runs onto more pages instead of off the page', async () => {
  const achievements = Array.from({ length: 80 }, (_, i) => `Achievement number ${i + 1} with enough words to fill most of a line on the page.`);
  const buffer = await renderResumePdf({ model: formResumeModel({ ...FORM, experience: [{ ...FORM.experience[0], achievements }] }), template: 'classic' });
  const text = await extractText(buffer, { mimeType: 'application/pdf' });
  assert.ok(text.includes('Achievement number 80'));
  assert.ok((buffer.toString('latin1').match(/\/Type \/Page\b/g) || []).length >= 2);
});

test('characters the standard fonts lack are swapped or left out, accents they have are kept', () => {
  assert.equal(pdfSafe('Café — “quoted” → done ✓'), 'Café — “quoted” -> done ');
  assert.equal(pdfSafe('Łódź'), 'Lódz');
  assert.equal(pdfSafe('Zoë 名前'), 'Zoë ');
});

