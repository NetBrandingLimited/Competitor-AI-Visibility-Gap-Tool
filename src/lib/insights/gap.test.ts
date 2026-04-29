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
});
