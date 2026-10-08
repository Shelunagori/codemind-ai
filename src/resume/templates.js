// The three layouts a tailored résumé can be rendered in. All three follow the rules that
// keep a document readable by applicant tracking systems: one column, real headings with
// standard names, plain bullets, body text in black, no tables, text boxes, columns, images,
// or contact details in the page header/footer (parsers skip those). They differ only in
// type, spacing and one accent colour — never in structure. Sizes are points, spacing is in
// twentieths of a point (docx units), margins in inches.

export const RESUME_TEMPLATES = {
  classic: {
    id: 'classic',
    name: 'Classic',
    description: 'Serif and understated. The safe choice for finance, law, government and other conservative fields.',
    fonts: { body: 'Georgia', heading: 'Georgia' },
    sizes: { name: 22, title: 12, heading: 12, body: 11, small: 9.5 },
    margins: 0.8,
    colors: { text: '1F2328', name: '111111', heading: '111111', muted: '555555', rule: '999999' },
    heading: { uppercase: true, letterSpacing: 15, rule: true },
    header: { separator: '  |  ' },
    spacing: { sectionBefore: 260, sectionAfter: 100, paragraph: 80, bullet: 40, entryBefore: 140 },
  },
  modern: {
    id: 'modern',
    name: 'Modern',
    description: 'Clean sans-serif with a single accent colour on the name and headings. Reads well on screen.',
    fonts: { body: 'Calibri', heading: 'Calibri' },
    sizes: { name: 24, title: 12, heading: 11.5, body: 11, small: 9.5 },
    margins: 0.75,
    colors: { text: '1F2328', name: '0C3FA3', heading: '0C3FA3', muted: '5A6272', rule: 'C9D3EA' },
    heading: { uppercase: true, letterSpacing: 20, rule: true },
    header: { separator: '  ·  ' },
    spacing: { sectionBefore: 240, sectionAfter: 80, paragraph: 80, bullet: 40, entryBefore: 120 },
  },
  compact: {
    id: 'compact',
    name: 'Compact',
    description: 'Tighter type and margins so a long résumé stays on one page without dropping content.',
    fonts: { body: 'Arial', heading: 'Arial' },
    sizes: { name: 18, title: 11, heading: 10.5, body: 10, small: 9 },
    margins: 0.6,
    colors: { text: '1F2328', name: '111111', heading: '0C3FA3', muted: '5A6272', rule: 'C9D3EA' },
    heading: { uppercase: false, letterSpacing: 0, rule: false },
    header: { separator: '  ·  ' },
    spacing: { sectionBefore: 160, sectionAfter: 40, paragraph: 40, bullet: 20, entryBefore: 80 },
  },
};

export const TEMPLATE_IDS = Object.keys(RESUME_TEMPLATES);
export const DEFAULT_TEMPLATE = 'classic';

/** The template for an id; an unknown or missing id gets the default. */
export function resumeTemplate(id) {
  return RESUME_TEMPLATES[id] || RESUME_TEMPLATES[DEFAULT_TEMPLATE];
}

/** What the client shows in the picker: ids, names and descriptions only. */
export function listResumeTemplates() {
  return TEMPLATE_IDS.map((id) => ({ id, name: RESUME_TEMPLATES[id].name, description: RESUME_TEMPLATES[id].description }));
}
