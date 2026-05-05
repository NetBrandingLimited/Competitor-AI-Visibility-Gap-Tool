import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchOpenAiChatCompletion } from './openai';

describe('fetchOpenAiChatCompletion', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parses assistant text from chat completions JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        text: async () =>
          JSON.stringify({
            model: 'gpt-4o-mini',
            choices: [{ message: { content: ' Hello world ' } }]
          })
      }))
    );

    const out = await fetchOpenAiChatCompletion({
      apiKey: 'sk-test',
      model: 'gpt-4o-mini',
      userPrompt: 'Say hi'
    });
    expect(out.text).toBe('Hello world');
    expect(out.model).toBe('gpt-4o-mini');
  });

  it('throws on HTTP error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 401,
        text: async () => 'invalid key'
      }))
    );

    await expect(
      fetchOpenAiChatCompletion({ apiKey: 'bad', model: 'gpt-4o-mini', userPrompt: 'x' })
    ).rejects.toThrow(/OpenAI HTTP 401/);
  });
});
