import { describe, expect, it } from 'vitest';

import { buildWhyChanged, computeVisibilityScoreV1, type VisibilityInputsV1 } from '@/lib/visibility/scoreV1';

function makeInputs(overrides: Partial<VisibilityInputsV1> = {}): VisibilityInputsV1 {
  return {
    pipelineRunId: 'run-1',
    pipelineIngestionSource: 'mock_ingestion',
    pipelineGscDiagnosticsSummary: null,
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
    pipelineBrandShareOfVoice: null,
    ...overrides
  };
}

describe('computeVisibilityScoreV1', () => {
  it('returns only the base component when pipeline and trend inputs are minimal', () => {
    const { score, breakdown } = computeVisibilityScoreV1(
      makeInputs({
        triggerCount: 0,
        clusterCount: 0,
        documentCount: 0,
        totalMentions: 0,
        topBrandMentions: 0,
        connectorSignalCount: 0,
        brandName: 'Other',
        topBrand: 'Acme'
      })
    );
    expect(score).toBe(10);
    expect(breakdown.base).toBe(10);
    expect(breakdown.triggers).toBe(0);
    expect(breakdown.brandAlignment).toBe(0);
  });

  it('caps the rounded score at 100 when inputs are large', () => {
    const { score } = computeVisibilityScoreV1(
      makeInputs({
        triggerCount: 100,
        clusterCount: 100,
        documentCount: 100,
        totalMentions: 100,
        topBrandMentions: 100,
        brandName: 'Acme',
        topBrand: 'Acme',
        connectorSignalCount: 10
      })
    );
    expect(score).toBe(100);
  });

  it('adds brand alignment weight when saved brand matches trend top brand', () => {
    const misaligned = computeVisibilityScoreV1(makeInputs({ brandName: 'Other', topBrand: 'Acme' }));
    const aligned = computeVisibilityScoreV1(makeInputs({ brandName: 'Acme', topBrand: 'Acme' }));
    expect(aligned.breakdown.brandAlignment).toBe(10);
    expect(misaligned.breakdown.brandAlignment).toBe(0);
    expect(aligned.score - misaligned.score).toBe(10);
  });

  it('adds pipelineMentions from pipeline brand share-of-voice when present', () => {
    const none = computeVisibilityScoreV1(makeInputs({ pipelineBrandShareOfVoice: null }));
    const partial = computeVisibilityScoreV1(makeInputs({ pipelineBrandShareOfVoice: 0.1 }));
    expect(none.breakdown.pipelineMentions).toBe(0);
    expect(partial.breakdown.pipelineMentions).toBe(6);
    expect(partial.score - none.score).toBe(6);
  });

  it('caps pipelineMentions at 20', () => {
    const { breakdown } = computeVisibilityScoreV1(makeInputs({ pipelineBrandShareOfVoice: 0.99 }));
    expect(breakdown.pipelineMentions).toBe(20);
  });
});

describe('buildWhyChanged', () => {
  it('returns only BASELINE when there is no previous score', () => {
    const reasons = buildWhyChanged(null, 55, makeInputs());
    expect(reasons).toHaveLength(1);
    expect(reasons[0].code).toBe('BASELINE');
    expect(reasons[0].message).toContain('55');
  });

  it('describes overall score change in SCORE_TOTAL', () => {
    const up = buildWhyChanged({ score: 50, inputs: makeInputs() }, 60, makeInputs());
    expect(up.find((r) => r.code === 'SCORE_TOTAL')?.message).toContain('increased');

    const down = buildWhyChanged({ score: 60, inputs: makeInputs() }, 50, makeInputs());
    expect(down.find((r) => r.code === 'SCORE_TOTAL')?.message).toContain('decreased');

    const same = buildWhyChanged({ score: 60, inputs: makeInputs() }, 60, makeInputs());
    expect(same.find((r) => r.code === 'SCORE_TOTAL')?.message).toContain('unchanged');
  });

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

  it('includes reason when GSC diagnostics summary changes', () => {
    const previous = {
      score: 60,
      inputs: makeInputs({ pipelineGscDiagnosticsSummary: 'attempt=filtered; cap=1' })
    };
    const nextInputs = makeInputs({ pipelineGscDiagnosticsSummary: 'attempt=filtered; cap=2' });

    const reasons = buildWhyChanged(previous, 60, nextInputs);
    expect(reasons.some((r) => r.code === 'PIPELINE_GSC_DIAGNOSTICS')).toBe(true);
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

  it('includes PIPELINE_BRAND_SHARE when mention share appears or moves', () => {
    const appear = buildWhyChanged(
      { score: 50, inputs: makeInputs({ pipelineBrandShareOfVoice: null }) },
      55,
      makeInputs({ pipelineBrandShareOfVoice: 0.4 })
    );
    expect(appear.some((r) => r.code === 'PIPELINE_BRAND_SHARE')).toBe(true);
    expect(appear.find((r) => r.code === 'PIPELINE_BRAND_SHARE')?.message).toContain('40.0%');

    const move = buildWhyChanged(
      { score: 55, inputs: makeInputs({ pipelineBrandShareOfVoice: 0.2 }) },
      58,
      makeInputs({ pipelineBrandShareOfVoice: 0.5 })
    );
    expect(move.some((r) => r.code === 'PIPELINE_BRAND_SHARE')).toBe(true);
    expect(move.find((r) => r.code === 'PIPELINE_BRAND_SHARE')?.message).toContain('20.0%');
    expect(move.find((r) => r.code === 'PIPELINE_BRAND_SHARE')?.message).toContain('50.0%');
  });
});
