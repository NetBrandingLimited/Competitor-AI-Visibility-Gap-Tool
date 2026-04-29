import { describe, expect, it } from 'vitest';

import { buildWhyChanged, type VisibilityInputsV1 } from '@/lib/visibility/scoreV1';

function makeInputs(overrides: Partial<VisibilityInputsV1> = {}): VisibilityInputsV1 {
  return {
    pipelineRunId: 'run-1',
    pipelineIngestionSource: 'mock_ingestion',
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
    connectorSignalsAsOf: '2026-04-29',
    ...overrides
  };
}

describe('buildWhyChanged', () => {
  it('includes pipeline ingestion source reason when provenance changes', () => {
    const previous = {
      score: 60,
      inputs: makeInputs({ pipelineIngestionSource: 'mock_ingestion' })
    };
    const nextInputs = makeInputs({ pipelineIngestionSource: 'live_gsc_queries' });

    const reasons = buildWhyChanged(previous, 60, nextInputs);
    expect(reasons.some((r) => r.code === 'PIPELINE_INGESTION_SOURCE')).toBe(true);
    expect(reasons.some((r) => r.message.includes('mock pipeline templates'))).toBe(true);
    expect(reasons.some((r) => r.message.includes('Search Console pipeline documents'))).toBe(true);
  });

  it('does not add ingestion reason when provenance is unchanged', () => {
    const previous = {
      score: 60,
      inputs: makeInputs({ pipelineIngestionSource: 'live_gsc_queries' })
    };
    const nextInputs = makeInputs({ pipelineIngestionSource: 'live_gsc_queries' });

    const reasons = buildWhyChanged(previous, 60, nextInputs);
    expect(reasons.some((r) => r.code === 'PIPELINE_INGESTION_SOURCE')).toBe(false);
  });

  it('labels legacy/null provenance transition explicitly', () => {
    const previous = {
      score: 60,
      inputs: makeInputs({ pipelineIngestionSource: null })
    };
    const nextInputs = makeInputs({ pipelineIngestionSource: 'live_gsc_queries' });

    const reasons = buildWhyChanged(previous, 60, nextInputs);
    const reason = reasons.find((r) => r.code === 'PIPELINE_INGESTION_SOURCE');
    expect(reason).toBeTruthy();
    expect(reason?.message).toContain('not recorded / legacy');
    expect(reason?.message).toContain('Search Console pipeline documents');
  });
});
