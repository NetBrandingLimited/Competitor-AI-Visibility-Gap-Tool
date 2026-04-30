import { describe, expect, it } from 'vitest';

import { buildGapInsightsFromLatestData } from './gap';

describe('buildGapInsightsFromLatestData', () => {
  it('includes Search Console provenance in baseline maintain-momentum copy', () => {
    const insights = buildGapInsightsFromLatestData(
      {
        brandName: 'Acme',
        competitorA: null,
        competitorB: null,
        competitorC: null
      },
      {
        id: 'run-1',
        createdAt: '2026-04-29T00:00:00.000Z',
        query: 'crm alternatives',
        limitPerConnector: 2,
        documentCount: 5,
        triggerCount: 0,
        clusterCount: 0,
        ingestionSource: 'live_gsc_queries',
        ingestionEvents: [],
        documents: [],
        triggers: [],
        clusters: []
      },
      null,
      null
    );

    expect(insights.opportunities).toHaveLength(1);
    expect(insights.opportunities[0].id).toBe('baseline-maintain');
    expect(insights.opportunities[0].detail).toContain('Search Console');
  });

  it('includes mock provenance in baseline maintain-momentum copy', () => {
    const insights = buildGapInsightsFromLatestData(
      {
        brandName: 'Acme',
        competitorA: null,
        competitorB: null,
        competitorC: null
      },
      {
        id: 'run-2',
        createdAt: '2026-04-29T00:00:00.000Z',
        query: 'crm alternatives',
        limitPerConnector: 2,
        documentCount: 5,
        triggerCount: 0,
        clusterCount: 0,
        ingestionSource: 'mock_ingestion',
        ingestionEvents: [],
        documents: [],
        triggers: [],
        clusters: []
      },
      null,
      null
    );

    expect(insights.opportunities[0].detail).toContain('mock templates');
  });

  it('appends pipeline GSC summary to low visibility score opportunity when present', () => {
    const insights = buildGapInsightsFromLatestData(
      {
        brandName: 'Acme',
        competitorA: null,
        competitorB: null,
        competitorC: null
      },
      null,
      null,
      {
        score: 50,
        createdAt: '2026-04-29T00:00:00.000Z',
        reasons: [],
        inputs: {
          pipelineRunId: 'run-gsc',
          pipelineIngestionSource: 'live_gsc_queries',
          pipelineGscDiagnosticsSummary: 'attempt=filtered; cap=3',
          documentCount: 0,
          triggerCount: 0,
          clusterCount: 0,
          trendDate: null,
          totalMentions: 0,
          topBrand: null,
          topBrandMentions: 0,
          brandName: 'Acme',
          connectorSignalCount: 0,
          connectorSignalSource: 'live',
          connectorSignalCacheKind: null,
          connectorSignalsAsOf: null
        }
      }
    );

    const low = insights.opportunities.find((o) => o.id === 'score-under-threshold');
    expect(low).toBeDefined();
    expect(low!.detail).toContain('Pipeline GSC:');
    expect(low!.detail).toContain('attempt=filtered');
  });
});
