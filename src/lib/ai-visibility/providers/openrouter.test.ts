import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchOpenRouterChatCompletion } from './openrouter';

describe('fetchOpenRouterChatCompletion', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.OPENROUTER_HTTP_REFERER;
    delete process.env.OPENROUTER_APP_TITLE;
  });

  it('posts to OpenRouter and parses text', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
      const headers = init?.headers as Record<string, string>;
      expect(headers['HTTP-Referer']).toBeTruthy();
      expect(headers['X-Title']).toBeTruthy();
      return {
        ok: true,
        text: async () =>
          JSON.stringify({
            model: 'openrouter/auto',
            choices: [{ message: { content: ' Router hi ' } }]
          })
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    const out = await fetchOpenRouterChatCompletion({
      apiKey: 'or-test',
      model: 'openrouter/auto',
      userPrompt: 'Say hi'
    });
    expect(out.text).toBe('Router hi');
    expect(out.model).toBe('openrouter/auto');
  });

  it('throws on HTTP error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 402,
        text: async () => 'payment required'
      }))
    );

    await expect(
      fetchOpenRouterChatCompletion({
        apiKey: 'bad',
        model: 'openrouter/auto',
        userPrompt: 'x'
      })
    ).rejects.toThrow(/OpenRouter HTTP 402/);
  });
});
