import { describe, expect, it } from 'vitest';

import { formatWeeklyDigestMarkdown } from '@/lib/digest/formatMarkdown';

const baseParams = {
  orgName: 'Acme',
  periodStart: '2026-04-01',
  periodEnd: '2026-04-07',
  generatedAt: '2026-04-08 10:00',
  summary: {
    score: 50,
    signalSource: 'live' as const,
    topOpportunities: ['One'],
    opportunities: undefined,
    topics: undefined,
    insightsGeneratedAt: undefined
  }
};

describe('formatWeeklyDigestMarkdown', () => {
  it('includes connector signals line from weeklyDigestSignalsLabel (live)', () => {
    const md = formatWeeklyDigestMarkdown(baseParams);
    expect(md).toContain('- **Connector signals:** live');
  });

  it('includes stale fallback label when summary uses cache fallback', () => {
    const md = formatWeeklyDigestMarkdown({
      ...baseParams,
      summary: {
        ...baseParams.summary,
        signalSource: 'cache',
        connectorSignalCacheKind: 'stale_fallback'
      }
    });
    expect(md).toContain('- **Connector signals:** cache (fallback: live fetch had no metrics)');
  });

  it('includes insights snapshot line when present', () => {
    const md = formatWeeklyDigestMarkdown({
      ...baseParams,
      summary: {
        ...baseParams.summary,
        insightsGeneratedAt: '2026-04-08T09:00:00.000Z'
      }
    });
    expect(md).toContain('- **Insights snapshot:** 2026-04-08T09:00:00.000Z');
  });
});
