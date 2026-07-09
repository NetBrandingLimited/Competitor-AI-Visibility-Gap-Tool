import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchGeminiGenerateContent } from './gemini';

describe('fetchGeminiGenerateContent', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parses assistant text from generateContent JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        text: async () =>
          JSON.stringify({
            modelVersion: 'models/gemini-2.0-flash',
            candidates: [{ content: { parts: [{ text: ' Hello Gemini ' }] } }]
          })
      }))
    );

    const out = await fetchGeminiGenerateContent({
      apiKey: 'gemini-test',
      model: 'gemini-2.0-flash',
      userPrompt: 'Say hi'
    });
    expect(out.text).toBe('Hello Gemini');
    expect(out.model).toBe('models/gemini-2.0-flash');
  });

  it('throws on HTTP error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 400,
        text: async () => 'bad request'
      }))
    );

    await expect(
      fetchGeminiGenerateContent({ apiKey: 'bad', model: 'gemini-2.0-flash', userPrompt: 'x' })
    ).rejects.toThrow(/Gemini HTTP 400/);
  });
});
