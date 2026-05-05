import { describe, expect, it } from 'vitest';

import { normalizeTargetSurfaces, PROMPT_SURFACE_IDS } from './measurement';

describe('normalizeTargetSurfaces', () => {
  it('returns empty for non-arrays', () => {
    expect(normalizeTargetSurfaces(null)).toEqual([]);
    expect(normalizeTargetSurfaces({})).toEqual([]);
  });

  it('keeps known surfaces in order and dedupes', () => {
    expect(
      normalizeTargetSurfaces([
        'openai_chatgpt',
        'perplexity',
        'openai_chatgpt',
        'unknown_x',
        'google_gemini'
      ])
    ).toEqual(['openai_chatgpt', 'perplexity', 'google_gemini']);
  });

  it('lists all defined surface ids as valid', () => {
    expect(PROMPT_SURFACE_IDS.length).toBeGreaterThan(0);
    for (const id of PROMPT_SURFACE_IDS) {
      expect(normalizeTargetSurfaces([id])).toEqual([id]);
    }
  });
});
