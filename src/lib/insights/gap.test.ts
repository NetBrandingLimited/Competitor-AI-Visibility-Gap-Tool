import { describe, expect, it } from 'vitest';

import type { GscIngestionDiagnostics } from '@/lib/ingestion/gscDiagnostics';

import { buildGapInsightsFromLatestData } from './gap';

const sampleGscDiagnostics: GscIngestionDiagnostics = {
  queryAttempt: { usedFiltered: true, usedUnfiltered: false, filteredRows: 1, unfilteredRows: 0 },
  query: { fetched: 1, filteredZeroEngagement: 0, filteredLowSignal: 0, docsCreated: 1 },
  page: { fetched: 0, filteredZeroEngagement: 0, filteredLowSignal: 0, docsCreated: 0 },
  qp: { fetched: 0, filteredZeroEngagement: 0, filteredLowSignal: 0, docsCreated: 0 },
  mergedDocsBeforeDedupe: 1,
  dedupedDocs: 1,
  cappedDocs: 1
};

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

  it('appends pipeline GSC from run diagnostics to trigger coverage opportunity', () => {
    const insights = buildGapInsightsFromLatestData(
      {
        brandName: 'Acme',
        competitorA: 'Other',
        competitorB: null,
        competitorC: null
      },
      {
        id: 'run-trig',
        createdAt: '2026-04-29T00:00:00.000Z',
        query: 'test',
        limitPerConnector: 2,
        documentCount: 1,
        triggerCount: 1,
        clusterCount: 0,
        ingestionSource: 'live_gsc_queries',
        gscIngestionDiagnostics: sampleGscDiagnostics,
        ingestionEvents: [],
        documents: [],
        triggers: [{ phrase: 'vs acme', category: 'comparison', score: 1, evidence: 'e' }],
        clusters: []
      },
      null,
      null
    );

    const trig = insights.opportunities.find((o) => o.id === 'trigger-coverage-gap');
    expect(trig).toBeDefined();
    expect(trig!.detail).toContain('Pipeline GSC:');
    expect(trig!.detail).toContain('attempt=filtered');
  });

  it('appends pipeline GSC from visibility snapshot to trend leadership opportunity when run has no diagnostics', () => {
    const insights = buildGapInsightsFromLatestData(
      {
        brandName: 'Acme',
        competitorA: null,
        competitorB: null,
        competitorC: null
      },
      null,
      {
        date: '2026-04-29',
        generatedAt: '2026-04-29T00:00:00.000Z',
        totalMentions: 10,
        topBrand: 'BetaCo',
        topBrandMentions: 6
      },
      {
        score: 72,
        createdAt: '2026-04-29T00:10:00.000Z',
        reasons: [],
        inputs: {
          pipelineRunId: 'run-trend',
          pipelineIngestionSource: 'live_gsc_queries',
          pipelineGscDiagnosticsSummary: 'attempt=unfiltered; cap=4',
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

    const trend = insights.opportunities.find((o) => o.id === 'trend-leader-gap');
    expect(trend).toBeDefined();
    expect(trend!.detail).toContain('BetaCo');
    expect(trend!.detail).toContain('Pipeline GSC:');
    expect(trend!.detail).toContain('attempt=unfiltered');
  });
});
