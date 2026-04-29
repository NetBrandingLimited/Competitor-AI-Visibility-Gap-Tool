import { describe, expect, it } from 'vitest';

import { serializeVisibilityResult, serializeVisibilityScore } from './serialize';
import type { VisibilityReasonV1 } from './scoreV1';

const reasons: VisibilityReasonV1[] = [{ code: 'BASELINE', message: 'ok' }];

describe('visibility serializers', () => {
  it('adds top-level pipeline ingestion fields for latest snapshot payload', () => {
    const payload = serializeVisibilityScore({
      score: 61,
      createdAt: '2026-04-29T06:00:00.000Z',
      reasons,
      inputs: {
        pipelineRunId: 'run-1',
        pipelineIngestionSource: 'live_gsc_queries',
        documentCount: 22,
        triggerCount: 8,
        clusterCount: 4,
        trendDate: '2026-04-29',
        totalMentions: 100,
        topBrand: 'Acme',
        topBrandMentions: 35,
        brandName: 'Acme',
        connectorSignalCount: 3,
        connectorSignalSource: 'live',
        connectorSignalCacheKind: null,
        connectorSignalsAsOf: '2026-04-29'
      }
    });

    expect(payload.pipelineIngestionSource).toBe('live_gsc_queries');
    expect(payload.pipelineIngestionSourceLabel).toBe('Search Console');
    expect(payload.signalSource).toBe('live');
    expect(payload.signalCount).toBe(3);
  });

  it('labels missing pipeline provenance as not recorded for recalc payload', () => {
    const payload = serializeVisibilityResult({
      score: 49,
      reasons,
      inputs: {
        pipelineRunId: 'run-2',
        pipelineIngestionSource: null,
        documentCount: 10,
        triggerCount: 2,
        clusterCount: 1,
        trendDate: null,
        totalMentions: 0,
        topBrand: null,
        topBrandMentions: 0,
        brandName: 'Acme',
        connectorSignalCount: 0,
        connectorSignalSource: 'cache',
        connectorSignalCacheKind: 'ttl',
        connectorSignalsAsOf: null
      }
    });

    expect(payload.pipelineIngestionSource).toBeNull();
    expect(payload.pipelineIngestionSourceLabel).toBe('Not recorded');
    expect(payload.signalSource).toBe('cache');
    expect(payload.signalCount).toBe(0);
  });
});
