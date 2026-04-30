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
    pipelineIngestionSource: 'live_gsc_queries' as const,
    topOpportunities: ['One'],
    opportunities: undefined,
    topics: undefined,
    insightsGeneratedAt: undefined
  }
};

describe('formatWeeklyDigestMarkdown', () => {
  it('includes pipeline documents line from weeklyDigestPipelineLabel', () => {
    const md = formatWeeklyDigestMarkdown(baseParams);
    expect(md).toContain('- **Pipeline documents:** Search Console');
  });

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

  it('includes GSC ingestion line when pipelineGscDiagnosticsSummary is set', () => {
    const md = formatWeeklyDigestMarkdown({
      ...baseParams,
      summary: {
        ...baseParams.summary,
        pipelineGscDiagnosticsSummary: 'attempt=filtered; cap=3'
      }
    });
    expect(md).toContain('- **GSC ingestion (latest pipeline):** attempt=filtered; cap=3');
  });

  it('includes pipeline run path under opportunities when pipelineRunIdForGsc is set', () => {
    const md = formatWeeklyDigestMarkdown({
      ...baseParams,
      summary: {
        ...baseParams.summary,
        topOpportunities: [],
        opportunities: [
          {
            id: 'score-under-threshold',
            title: 'Visibility score below target',
            detail: 'Current score is 50. Pipeline GSC: cap=2',
            priority: 'high',
            pipelineRunIdForGsc: 'run-xyz'
          }
        ]
      }
    });
    expect(md).toContain('`run-xyz`');
    expect(md).toContain('/reports/runs/run-xyz#gsc-diagnostics');
    expect(md).toContain('Pipeline run (GSC diagnostics)');
  });
});
