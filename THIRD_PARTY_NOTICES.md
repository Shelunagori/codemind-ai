# Third-party notices

Parts of this repository are derived from the following projects, each under its own license. The
full license texts are in [`licenses/`](licenses/).

## ai-job-hunter-app

<https://github.com/saeedkolivand/ai-job-hunter-app>, Apache License 2.0
([`licenses/Apache-2.0.txt`](licenses/Apache-2.0.txt)).

Ported and modified. Rules and data were rewritten in JavaScript and changed to fit this code.
Each of these files names it in its header comment:

- `src/checks/`: `index.js`, `certifications.js`, `figures.js`, `tenure.js`, `warnings.js`. The
  resume hygiene rules and thresholds, and the fact checks.
- `src/ats/verdicts.js`, `src/tailor/repair.js`
- `src/text/fence.js`: fencing untrusted text in prompts.
- `src/text/voice.js`: the voice rules for prose.
- `src/writing/interview/prep.js`, `src/writing/interview/feedback.js`
- `src/writing/letters/referral.js`, `src/writing/letters/conventions.js`, and
  `src/writing/letters/letterConventions.js`: the letter conventions per market, as data.

## freehire

<https://github.com/strelov1/freehire>, MIT License, Copyright (c) 2026 freehire contributors
([`licenses/freehire-MIT.txt`](licenses/freehire-MIT.txt)).

Ported as data: `src/text/dict/data/skills.json`, `src/text/dict/data/countries.json` and the
title terms, and `src/text/dict/data/cities1000.tsv` as freehire ships it.
`src/text/dict/data/README.md` says which file each came from.

## GeoNames

<https://www.geonames.org/>, Creative Commons Attribution 4.0
(<https://creativecommons.org/licenses/by/4.0/>).

`src/text/dict/data/cities1000.tsv` is generated from GeoNames' `cities1000` (via freehire). Its
header comment carries the attribution.
