import { describe, expect, it } from 'vitest';

import { extractQuestionTriggers } from './extractTriggers';

describe('extractQuestionTriggers', () => {
  it('returns empty for empty text', () => {
    expect(extractQuestionTriggers('')).toEqual([]);
  });

  it('returns empty when no heuristics match', () => {
    expect(extractQuestionTriggers('hello world xyz')).toEqual([]);
  });

  it('detects multiple heuristics and sorts by score descending', () => {
    const triggers = extractQuestionTriggers('Best tools vs Acme for pricing');
    expect(triggers.length).toBeGreaterThanOrEqual(3);
    expect(triggers.map((t) => t.phrase)).toEqual(expect.arrayContaining(['vs', 'best', 'pricing']));
    for (let i = 1; i < triggers.length; i++) {
      expect(triggers[i - 1].score).toBeGreaterThanOrEqual(triggers[i].score);
    }
  });

  it('puts highest-scoring phrase first for comparison-heavy text', () => {
    const triggers = extractQuestionTriggers('vs compare alternatives');
    expect(triggers[0].phrase).toBe('vs');
    expect(triggers[0].score).toBe(0.9);
  });
});
