import { describe, expect, it } from 'vitest';

import { buildVisibilityReportCsv } from './fullReportCsv';

describe('buildVisibilityReportCsv', () => {
  it('includes trend, gap and weekly digest rows with provenance columns', () => {
    const csv = buildVisibilityReportCsv(
      [
        {
          date: '2026-04-29',
          generatedAt: '2026-04-29T00:00:00.000Z',
          totalMentions: 100,
          topBrand: 'Acme',
          topBrandMentions: 45
        }
      ],
      {
        generatedAt: '2026-04-29T00:05:00.000Z',
        upstreamAsOf: '2026-04-29T00:00:00.000Z',
        opportunities: [
          {
            id: 'gap-1',
            title: 'Win comparisons',
            detail: 'Build pages',
            priority: 'high',
            pipelineRunIdForGsc: 'run-gap-csv'
          }
        ],
        topics: [
          {
            topic: 'pricing',
            triggerCount: 2,
            clusterWeight: 3,
            gapScore: 7,
            recommendation: 'Improve pricing explainer'
          }
        ]
      },
      {
        id: 'dg-1',
        periodStart: '2026-04-23',
        periodEnd: '2026-04-29',
        generatedAt: '2026-04-29T00:10:00.000Z',
        summary: {
          score: 59,
          signalSource: 'live',
          pipelineIngestionSource: 'live_gsc_queries',
          pipelineGscDiagnosticsSummary: 'attempt=unfiltered; cap=5',
          topOpportunities: ['Win comparisons']
        }
      }
    );

    expect(csv).toContain('section,date,generatedAt');
    expect(csv).toContain('digestPipelineIngestionSource');
    expect(csv).toContain('digestPipelineGscDiagnosticsSummary');
    expect(csv).toContain('attempt=unfiltered; cap=5');
    expect(csv).toContain('trend,2026-04-29');
    expect(csv).toContain('gap_opportunity');
    expect(csv).toContain('gap_topic');
    expect(csv).toContain('weekly_digest');
    expect(csv).toContain('Search Console');
    expect(csv).toContain('live_gsc_queries');
    expect(csv).toContain('visibilityScore');
    expect(csv).toContain('run-gap-csv');
  });

  it('adds visibility_score row when latest visibility snapshot exists', () => {
    const csv = buildVisibilityReportCsv(
      [],
      {
        generatedAt: '2026-04-29T00:05:00.000Z',
        upstreamAsOf: '2026-04-29T00:00:00.000Z',
        opportunities: [],
        topics: []
      },
      null,
      {
        score: 61,
        createdAt: '2026-04-29T00:20:00.000Z',
        reasons: [],
        inputs: {
          pipelineRunId: 'run-vis',
          pipelineIngestionSource: 'live_gsc_queries',
          pipelineGscDiagnosticsSummary: 'attempt=filtered; cap=9',
          documentCount: 10,
          triggerCount: 5,
          clusterCount: 3,
          trendDate: '2026-04-29',
          totalMentions: 40,
          topBrand: 'Acme',
          topBrandMentions: 20,
          brandName: 'Acme',
          connectorSignalCount: 2,
          connectorSignalSource: 'live',
          connectorSignalCacheKind: null,
          connectorSignalsAsOf: '2026-04-29'
        }
      }
    );

    expect(csv).toContain('visibility_score');
    expect(csv).toContain('run-vis');
    expect(csv).toContain('attempt=filtered; cap=9');
    expect(csv).toContain('61');
  });
});
