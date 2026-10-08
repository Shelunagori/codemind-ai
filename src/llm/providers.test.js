import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROVIDERS, providerFor, providerOf } from './providers.js';

test('a model goes to the provider whose prefix it starts with, in any case, and otherwise to OpenAI', () => {
  assert.equal(providerFor('qwen3.8-flash'), 'dashscope');
  assert.equal(providerFor('Qwen3.7-Flash'), 'dashscope');
  assert.equal(providerFor('gpt-oss:120b'), 'ollama');
  assert.equal(providerFor('GPT-OSS:20b-cloud'), 'ollama');
  for (const model of ['gpt-5-mini', 'gpt-4.1', 'o3-mini', '', undefined]) assert.equal(providerFor(model), 'openai', String(model));
});

test('each provider says what it is missing, how long a call may take, and its request habits', () => {
  assert.deepEqual(PROVIDERS.map((p) => p.id).sort(), ['dashscope', 'ollama', 'openai']);
  for (const provider of PROVIDERS) {
    assert.ok(provider.notConfigured, provider.id);
    assert.ok(provider.timeoutMs >= 60_000, provider.id);
  }
  assert.equal(providerOf('gpt-5-mini').flexTier, true, 'only OpenAI has the flex tier');
  assert.ok(!providerOf('qwen3.8-flash').flexTier && !providerOf('gpt-oss:120b').flexTier);
  assert.equal(providerOf('gpt-oss:120b').schemaInPrompt, true);
  assert.equal(providerOf('qwen3.8-flash').thinkingSwitch, true);
});
