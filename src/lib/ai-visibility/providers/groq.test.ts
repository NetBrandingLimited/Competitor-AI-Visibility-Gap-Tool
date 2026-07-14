import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchGroqChatCompletion } from './groq';

describe('fetchGroqChatCompletion', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts to Groq OpenAI-compatible endpoint and parses text', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
      return {
        ok: true,
        text: async () =>
          JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            choices: [{ message: { content: ' Groq hi ' } }]
          })
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    const out = await fetchGroqChatCompletion({
      apiKey: 'gsk-test',
      model: 'llama-3.3-70b-versatile',
      userPrompt: 'Say hi'
    });
    expect(out.text).toBe('Groq hi');
    expect(out.model).toBe('llama-3.3-70b-versatile');
  });

  it('throws on HTTP error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 401,
        text: async () => 'invalid'
      }))
    );

    await expect(
      fetchGroqChatCompletion({
        apiKey: 'bad',
        model: 'llama-3.3-70b-versatile',
        userPrompt: 'x'
      })
    ).rejects.toThrow(/Groq HTTP 401/);
  });
});
