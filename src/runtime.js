// What the AI code needs from the program around it, handed in once by createCodemind() (index.js):
// the providers' keys, the models each feature uses, where a call's usage is recorded, and a
// logger. Nothing here reads the environment or a database; until createCodemind() runs, a model
// call fails rather than going out unmetered.

const SILENT = { debug() {}, info() {}, warn() {}, error() {} };

const state = { configured: false, providers: {}, models: () => ({}), onUsage: null, logger: SILENT };
const listeners = new Set();

/**
 * Set what the AI code works with. `providers`: { openai: { apiKey }, dashscope: { apiKey, baseUrl },
 * ollama: { apiKey, baseUrl } }, each optionally with a ready `client` (tests). `models`: a function
 * returning the settings in force — { defaultModel, ats, enrich, parse } — read on every call, so an
 * admin's change applies at once. `onUsage(event)`: records one call's usage. `logger`: pino-like.
 */
export function configure({ providers = {}, models, onUsage, logger } = {}) {
  state.providers = providers;
  state.models = typeof models === 'function' ? models : () => models || {};
  state.onUsage = onUsage || null;
  state.logger = logger || SILENT;
  state.configured = true;
  for (const listener of listeners) listener();
}

/** Called whenever configure() runs (the provider clients are built again from the new keys). */
export function onConfigure(listener) {
  listeners.add(listener);
}

export const isConfigured = () => state.configured;
export const providerSettings = (provider) => (typeof state.providers === 'function' ? state.providers() : state.providers)?.[provider] || {};
export const models = () => state.models() || {};
export const onUsage = () => state.onUsage;
export const log = () => state.logger;
