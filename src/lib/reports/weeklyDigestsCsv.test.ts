import { describe, expect, it } from 'vitest';

import { buildWeeklyDigestsCsv } from './weeklyDigestsCsv';

describe('buildWeeklyDigestsCsv', () => {
  it('builds header and digest rows with provenance fields', () => {
    const csv = buildWeeklyDigestsCsv([
      {
        id: 'dg-1',
        generatedAt: '2026-04-29T00:00:00.000Z',
        periodStart: '2026-04-23',
        periodEnd: '2026-04-29',
        summary: {
          score: 58,
          signalSource: 'live',
          pipelineIngestionSource: 'live_gsc_queries',
          topOpportunities: ['Win alternatives', 'Improve pricing page']
        }
      }
    ]);

    expect(csv.startsWith('\uFEFFid,generatedAt,periodStart,periodEnd')).toBe(true);
    expect(csv).toContain('dg-1');
    expect(csv).toContain('Search Console');
    expect(csv).toContain('live_gsc_queries');
    expect(csv).toContain('Win alternatives | Improve pricing page');
  });
});
