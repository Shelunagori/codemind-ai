import OpenAI from 'openai';
import { AiError } from '../errors.js';
import { onConfigure, providerSettings } from '../runtime.js';
import { providerOf } from './providers.js';

// OpenAI's flex tier answers at Batch API prices but may take minutes when it is busy; OpenAI
// suggests a timeout of up to 15 minutes.
export const FLEX_TIMEOUT_MS = 600_000;

const clients = new Map();
// New keys, new clients.
onConfigure(() => clients.clear());

/** The API client for a model's provider (providers.js; also used for OpenAI's Batch API). */
export function clientFor(model) {
  const provider = providerOf(model);
  if (clients.has(provider.id)) return clients.get(provider.id);

  const settings = providerSettings(provider.id);
  let client = settings.client; // handed in ready (tests)
  if (!client) {
    if (!settings.apiKey || (provider.needsBaseUrl && !settings.baseUrl)) throw new AiError(503, 'ai_not_configured', provider.notConfigured);
    client = new OpenAI({
      apiKey: settings.apiKey,
      ...(provider.needsBaseUrl || provider.passesBaseUrl ? { baseURL: settings.baseUrl } : {}),
      timeout: provider.timeoutMs,
      maxRetries: 0,
    });
  }
  clients.set(provider.id, client);
  return client;
}
