// ── Certifications ─────────────────────────────────────────────────────────
//
// A certification the source resume never names is an invention. Rules ported from
// ai-job-hunter-app (Apache-2.0), apps/desktop/src-tauri/src/validate/content/credentials/certifications.rs.

export const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Acronym, the issuer it resolves to, and its expansion. A claim is compared on the issuer, so
// "CKA" in the output is backed by "Certified Kubernetes Administrator" in the source.
const CERT_ACRONYMS = [
  ['PMP', 'pmi', 'project management professional'],
  ['CAPM', 'pmi', 'certified associate in project management'],
  ['PRINCE2', 'prince2', ''],
  ['TOGAF', 'togaf', ''],
  ['ITIL', 'itil', ''],
  ['CISSP', 'isc2', 'certified information systems security professional'],
  ['CCSP', 'isc2', 'certified cloud security professional'],
  ['CISM', 'isaca', 'certified information security manager'],
  ['CISA', 'isaca', 'certified information systems auditor'],
  ['CEH', 'eccouncil', 'certified ethical hacker'],
  ['OSCP', 'offsec', 'offensive security certified professional'],
  ['CCNA', 'cisco', 'cisco certified network associate'],
  ['CCNP', 'cisco', 'cisco certified network professional'],
  ['CCIE', 'cisco', 'cisco certified internetwork expert'],
  ['CKA', 'kubernetes', 'certified kubernetes administrator'],
  ['CKAD', 'kubernetes', 'certified kubernetes application developer'],
  ['CKS', 'kubernetes', 'certified kubernetes security specialist'],
  ['RHCE', 'redhat', 'red hat certified engineer'],
  ['RHCSA', 'redhat', 'red hat certified system administrator'],
  ['CFA', 'cfa', 'chartered financial analyst'],
  ['FRM', 'frm', 'financial risk manager'],
  ['PSM', 'scrum', 'professional scrum master'],
  ['PSPO', 'scrum', 'professional scrum product owner'],
];
const CERT_ISSUERS = [
  ['amazon web services', 'aws'], ['amazon', 'aws'], ['aws', 'aws'], ['microsoft', 'microsoft'], ['azure', 'microsoft'],
  ['google cloud', 'google'], ['google', 'google'], ['gcp', 'google'], ['cisco', 'cisco'], ['oracle', 'oracle'], ['comptia', 'comptia'],
  ['red hat', 'redhat'], ['redhat', 'redhat'], ['kubernetes', 'kubernetes'], ['cncf', 'kubernetes'], ['linux foundation', 'linux-foundation'],
  ['salesforce', 'salesforce'], ['scrum alliance', 'scrum'], ['scrum', 'scrum'], ['pmi', 'pmi'], ['isaca', 'isaca'], ['isc2', 'isc2'],
  ['ec-council', 'eccouncil'], ['offensive security', 'offsec'], ['hashicorp', 'hashicorp'], ['terraform', 'hashicorp'], ['docker', 'docker'],
  ['mongodb', 'mongodb'], ['databricks', 'databricks'], ['snowflake', 'snowflake'], ['tableau', 'tableau'], ['vmware', 'vmware'],
  ['juniper', 'juniper'], ['sap', 'sap'], ['six sigma', 'six-sigma'],
];
const ISSUER = CERT_ISSUERS.map(([name]) => escapeRegex(name)).join('|');
const issuerKey = (name) => CERT_ISSUERS.find(([n]) => n === name.toLowerCase().replace(/\s+/g, ' '))?.[1];
const CERT_WORD = String.raw`(certifi\w*)`;
// An issuer and "certified" side by side, with nothing but punctuation between them: "AWS
// Certified", "Certified Kubernetes …", "Microsoft Certified: Azure …". A word between them is
// what tells a credential from "certified the release on AWS".
const ADJACENT = String.raw`[\s\-–—:,().·|/']*`;
const ISSUER_THEN_CERT = new RegExp(String.raw`\b(${ISSUER})${ADJACENT}${CERT_WORD}`, 'gi');
const CERT_THEN_ISSUER = new RegExp(String.raw`\b${CERT_WORD}${ADJACENT}(${ISSUER})\b`, 'gi');
// "Certified" beside an issuer names a credential only when a credential noun follows within a
// few words ("AWS Certified Solutions Architect"); otherwise it describes a product ("Docker
// Certified images", "Kubernetes certified clusters", "a Certified Scrum team"). "Certification"
// and "certificate" are the credential themselves.
const CREDENTIAL_TAIL = /^(?:[\s\-–—:,().·|/']*[\p{L}\p{N}+#.-]+){0,3}?[\s\-–—:,().·|/']*(?:architect|engineer|administrator|admin|developer|professional|associate|specialist|expert|practitioner|consultant|analyst|master|owner|fundamentals|specialty|belt|partner)s?\b/iu;
const namesCredential = (certWord, after) => /^certifi(?:cation|cate)s?$/i.test(certWord) || CREDENTIAL_TAIL.test(after);

/** The certifications `text` claims, as issuer keys: an acronym written in capitals, or an issuer beside "certified" naming a credential. */
export function certificationClaims(text) {
  const line = String(text || '');
  const keys = new Set();
  for (const [acronym, key] of CERT_ACRONYMS) if (new RegExp(`\\b${acronym}\\b`).test(line)) keys.add(key);
  for (const m of line.matchAll(ISSUER_THEN_CERT)) if (namesCredential(m[2], line.slice(m.index + m[0].length))) keys.add(issuerKey(m[1]));
  for (const m of line.matchAll(CERT_THEN_ISSUER)) if (namesCredential(m[1], line.slice(m.index + m[0].length))) keys.add(issuerKey(m[2]));
  keys.delete(undefined);
  return keys;
}

/**
 * The certifications the source supports, read generously: every claim it makes, an acronym in
 * any case, an expansion, and every issuer named on a line that mentions a certification.
 */
export function sourcedCertifications(text) {
  const source = String(text || '');
  const keys = certificationClaims(source);
  const lower = source.toLowerCase();
  for (const [acronym, key, expansion] of CERT_ACRONYMS) {
    if (new RegExp(`\\b${acronym.toLowerCase()}\\b`).test(lower) || (expansion && lower.includes(expansion))) keys.add(key);
  }
  for (const line of lower.split('\n')) {
    if (!/certifi|zertifi|licen[cs]e/.test(line)) continue;
    for (const [name, key] of CERT_ISSUERS) if (new RegExp(`\\b${escapeRegex(name)}\\b`).test(line)) keys.add(key);
  }
  return keys;
}
