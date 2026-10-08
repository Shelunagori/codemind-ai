// The providers a model can be served by, each found by its model names' prefix. All three speak
// OpenAI's chat.completions protocol; what differs is the endpoint, the key, how long a call may
// take, and a few habits of the request (request.js) — written here as flags, so adding a provider
// is one entry rather than a branch in every file.
//
//   flexTier         OpenAI's half-price flex tier (service_tier: 'flex') exists here
//   thinkingSwitch   hybrid models that think unless told not to: enable_thinking follows the effort
//   schemaInPrompt   response_format is accepted but not held to: the JSON schema goes in the prompt
//   alwaysReasons    reasons at low, medium or high whatever the model; "none"/"minimal" become low
//   structuredNeedsThinkingOff   structured output only works with thinking off (tailoring's effort)

export const PROVIDERS = [
  {
    id: 'dashscope',
    // Alibaba Cloud Model Studio's OpenAI-compatible endpoint.
    prefixes: ['qwen'],
    // Qwen with thinking on took about 50 s for one posting in tests, and a Qwen3.8 call ran past 120 s.
    timeoutMs: 300_000,
    needsBaseUrl: true,
    notConfigured: 'Qwen models need DASHSCOPE_API_KEY and DASHSCOPE_BASE_URL',
    thinkingSwitch: true,
    structuredNeedsThinkingOff: true,
  },
  {
    id: 'ollama',
    // Ollama Cloud.
    prefixes: ['gpt-oss'],
    timeoutMs: 300_000,
    passesBaseUrl: true,
    notConfigured: 'gpt-oss models need OLLAMA_API_KEY',
    schemaInPrompt: true,
    alwaysReasons: true,
  },
  {
    id: 'openai',
    // Every model no other provider claims.
    prefixes: [],
    timeoutMs: 60_000,
    notConfigured: 'AI features are not configured on this server',
    flexTier: true,
  },
];

const FALLBACK = PROVIDERS.find((p) => p.prefixes.length === 0);

/** The provider entry that serves `model`: the first whose prefix it starts with (any case), else OpenAI. */
export function providerOf(model) {
  const name = String(model || '').toLowerCase();
  return PROVIDERS.find((p) => p.prefixes.some((prefix) => name.startsWith(prefix))) || FALLBACK;
}

/** The id of the provider that serves `model` ('openai', 'dashscope', 'ollama'). */
export const providerFor = (model) => providerOf(model).id;
