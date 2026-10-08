import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Text snapshots kept beside this file (snapshots/<name>.txt). A missing snapshot is written on
// the first run, except in CI, where it fails; UPDATE_SNAPSHOTS=1 rewrites them all after a
// deliberate prompt change, and the diff of the .txt files is then the review.

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'snapshots');

export function matchSnapshot(name, text) {
  const file = path.join(DIR, `${name}.txt`);
  const body = `${text.replace(/\r\n/g, '\n')}\n`;
  if (process.env.UPDATE_SNAPSHOTS === '1' || (!fs.existsSync(file) && !process.env.CI)) {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(file, body);
    return;
  }
  assert.ok(fs.existsSync(file), `snapshot ${name} is missing; run the tests locally to write it`);
  assert.equal(body, fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'), `snapshot ${name} changed; rerun with UPDATE_SNAPSHOTS=1 if that was meant`);
}
