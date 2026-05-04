import { describe, expect, it } from 'vitest';

import { extractQuestionTriggers } from './extractTriggers';
import { clusterThemes } from './clusterThemes';

describe('clusterThemes', () => {
  it('returns empty for no triggers', () => {
    expect(clusterThemes([])).toEqual([]);
  });

  it('groups phrases by category with stable ids and labels', () => {
    const triggers = extractQuestionTriggers('best vs alternatives for pricing');
    const clusters = clusterThemes(triggers);
    expect(clusters.length).toBeGreaterThan(0);
    for (const c of clusters) {
      expect(c.id).toMatch(/^cluster-/);
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.keywords.length).toBeGreaterThan(0);
      expect(c.itemCount).toBeGreaterThanOrEqual(c.keywords.length);
    }
  });

  it('deduplicates repeated phrases in the same category', () => {
    const triggers = [
      { phrase: 'best', category: 'recommendation' as const, score: 0.85, evidence: 'best' },
      { phrase: 'top', category: 'recommendation' as const, score: 0.8, evidence: 'top' }
    ];
    const clusters = clusterThemes(triggers);
    const rec = clusters.find((c) => c.id === 'cluster-recommendation');
    expect(rec?.keywords).toEqual(['best', 'top']);
    expect(rec?.itemCount).toBe(2);
  });
});
