import { canonicalSkill } from './dict/skills.js';

// How a keyword is spelt and when it says nothing: pure text rules, apart from the Job model and
// the backfill in keywords.js, so enrichment's checks (enrich/validate.js) can read them alone.

export const MAX_MODEL_KEYWORDS = 15;

// Spellings folded to one tag, so a search for either finds every job tagged with it. The skills
// dictionary (text/dict/skills.js) does the same for technologies.
const ALIASES = new Map([
  ['llms', 'llm'],
  ['large language model', 'llm'],
  ['large language models', 'llm'],
  ['genai', 'generative ai'],
  ['gen ai', 'generative ai'],
  ['ml', 'machine learning'],
  ['artificial intelligence', 'ai'],
  ['health care', 'healthcare'],
  ['healthtech', 'healthcare'],
  ['health tech', 'healthcare'],
  ['fin tech', 'fintech'],
  ['financial technology', 'fintech'],
  ['e commerce', 'ecommerce'],
  ['ad tech', 'adtech'],
  ['ed tech', 'edtech'],
  ['prop tech', 'proptech'],
  ['hr tech', 'hrtech'],
  ['insur tech', 'insurtech'],
  ['climate tech', 'climatetech'],
  ['clean tech', 'climatetech'],
  ['cleantech', 'climatetech'],
  ['cyber security', 'cybersecurity'],
  ['dev ops', 'devops'],
  ['micro services', 'microservices'],
  ['micro service', 'microservices'],
  ['microservice', 'microservices'],
  ['distributed system', 'distributed systems'],
  ['realtime', 'real time'],
  ['start up', 'startup'],
  ['start ups', 'startup'],
  ['startups', 'startup'],
  ['block chain', 'blockchain'],
  ['web 3', 'web3'],
  ['crypto currency', 'crypto'],
  ['cryptocurrency', 'crypto'],
  ['cryptocurrencies', 'crypto'],
  ['soc2', 'soc 2'],
  ['pci dss', 'pci'],
]);

// Words and phrases true of nearly every posting: such a tag ranks nothing. Single words only count
// on their own: "platform engineering" names a discipline although "platform" and "engineering" do not.
const GENERIC = new Set([
  'software engineering', 'software development', 'software developer', 'software engineer', 'engineering team',
  'product team', 'product development', 'tech company', 'technology company', 'web development',
  'application development', 'full stack', 'fast paced environment', 'growing team', 'high quality',
  // Seen in the v10 dry run: true of most postings, or a field of their own.
  'hiring', 'production', 'testing', 'debugging', 'documentation', 'troubleshooting', 'maintenance',
  'customer service', 'project management', 'infrastructure', 'scalability', 'on call', 'on call rotation',
  'relocation', 'freelance', 'hybrid work', 'remote work', 'english', 'spanish', 'french', 'german',
  'portuguese', 'web applications', 'quality assurance',
  'software', 'engineer', 'engineers', 'engineering', 'developer', 'developers', 'development', 'programming',
  'coding', 'code', 'team', 'teams', 'experience', 'technology', 'technologies', 'tech', 'company', 'companies',
  'role', 'roles', 'job', 'jobs', 'position', 'positions', 'work', 'working', 'career', 'careers', 'product',
  'products', 'platform', 'platforms', 'application', 'applications', 'app', 'apps', 'system', 'systems',
  'service', 'services', 'solution', 'solutions', 'project', 'projects', 'business', 'customer', 'customers',
  'client', 'clients', 'user', 'users', 'people', 'culture', 'growth', 'fast paced', 'collaboration',
  'collaborative', 'communication', 'best practices', 'agile', 'scrum', 'computer science', 'it', 'full time',
  'part time', 'remote', 'hybrid', 'onsite', 'on site', 'senior', 'junior', 'mid', 'mid level', 'lead', 'staff',
  'principal', 'intern', 'internship', 'contract', 'quality', 'innovation', 'innovative', 'new', 'modern', 'high',
  'scale', 'scalable', 'performance', 'design', 'build', 'building', 'develop', 'developing', 'support',
]);

/** Lowercase letters, digits and the symbols technologies are spelt with, single-spaced. */
export function normalizeKeyword(text) {
  return String(text ?? '')
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}+#]+/gu, ' ')
    .trim();
}

/**
 * The one spelling a keyword is stored under: a technology's skill slug, else itself — an alias
 * first read as its canonical, and that canonical then read through the dictionary, so "ML" and
 * "Machine Learning" come out as one tag (machine-learning) rather than two.
 */
export function canonicalKeyword(text) {
  const key = normalizeKeyword(text);
  if (!key) return '';
  const alias = ALIASES.get(key) ?? key;
  return canonicalSkill(alias) ?? alias;
}

/** True for a tag that says nothing about this job in particular. */
export function isGenericKeyword(tag) {
  const key = String(tag || '').trim();
  return key === '' || GENERIC.has(key);
}

