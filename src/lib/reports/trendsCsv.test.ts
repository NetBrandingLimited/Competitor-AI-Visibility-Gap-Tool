import { describe, expect, it } from 'vitest';

import { buildTrendsCsv } from './trendsCsv';

describe('buildTrendsCsv', () => {
  it('builds trends-only CSV rows', () => {
    const csv = buildTrendsCsv([
      {
        date: '2026-04-29',
        generatedAt: '2026-04-29T00:00:00.000Z',
        totalMentions: 101,
        topBrand: 'Acme',
        topBrandMentions: 41
      }
    ]);

    expect(csv.startsWith('\uFEFFdate,generatedAt,totalMentions,topBrand,topBrandMentions')).toBe(true);
    expect(csv).toContain('2026-04-29');
    expect(csv).toContain('Acme');
    expect(csv).toContain('101');
  });
});
