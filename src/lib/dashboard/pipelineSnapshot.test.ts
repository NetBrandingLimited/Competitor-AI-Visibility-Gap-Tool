import { describe, expect, it } from 'vitest';

import type { UnifiedPipelineRun } from '@/lib/pipeline/types';

import { buildPipelineDashboardSnapshot, countLabelMentions } from './pipelineSnapshot';

describe('countLabelMentions', () => {
  it('returns 0 for labels shorter than 2 characters', () => {
    expect(countLabelMentions('hello', 'h')).toBe(0);
    expect(countLabelMentions('hello', '  ')).toBe(0);
  });

  it('counts whole-word matches case-insensitively', () => {
    expect(countLabelMentions('Acme rules acme world', 'Acme')).toBe(2);
    expect(countLabelMentions('theacmehere', 'acme')).toBe(0);
  });

  it('counts repeated multi-word phrases', () => {
    expect(countLabelMentions('foo best tools bar best tools baz', 'best tools')).toBe(2);
  });

  it('counts multi-word phrases that contain regex metacharacters', () => {
    expect(countLabelMentions('see Price (USD) and Price (USD) tiers', 'Price (USD)')).toBe(2);
  });

  it('counts single-token labels with characters that are special in RegExp', () => {
    expect(countLabelMentions('Use Co-Pilot or co-pilot daily', 'Co-Pilot')).toBe(2);
  });
});

describe('buildPipelineDashboardSnapshot', () => {
  const baseRun: UnifiedPipelineRun = {
    id: 'run-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    query: 'visibility',
    limitPerConnector: 2,
    documentCount: 1,
    triggerCount: 0,
    clusterCount: 0,
    ingestionEvents: [],
    documents: [
      {
        id: 'd1',
        source: 'reddit-mock',
        url: 'https://example.com/1',
        title: 'Acme vs Beta',
        content: 'We love Acme and Acme wins over Beta.',
        publishedAt: '2026-01-02T00:00:00.000Z'
      }
    ],
    triggers: [],
    clusters: []
  };

  it('returns null when org has no tracked brand names', () => {
    expect(buildPipelineDashboardSnapshot({}, baseRun, null)).toBeNull();
  });

  it('returns null when run has no documents', () => {
    const empty = { ...baseRun, documents: [] };
    expect(buildPipelineDashboardSnapshot({ brandName: 'Acme' }, empty, null)).toBeNull();
  });

  it('returns snapshot with leaderboard and recent rows', () => {
    const snap = buildPipelineDashboardSnapshot(
      { brandName: 'Acme', competitorA: 'Beta' },
      baseRun,
      null
    );
    expect(snap).not.toBeNull();
    expect(snap!.generatedAt).toBe(baseRun.createdAt);
    expect(snap!.leaderboard.length).toBe(2);
    expect(snap!.recent.length).toBe(1);
    const sum = snap!.leaderboard.reduce((s, r) => s + r.shareOfVoice, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it('sets delta7d from previous run share-of-voice when previousRun has documents', () => {
    const previousRun: UnifiedPipelineRun = {
      ...baseRun,
      id: 'run-0',
      createdAt: '2025-12-01T00:00:00.000Z',
      documents: [
        {
          id: 'd0',
          source: 'reddit-mock',
          url: 'https://example.com/0',
          title: 'Beta focus',
          content: 'Beta leads the market. Beta wins.',
          publishedAt: '2026-01-01T00:00:00.000Z'
        }
      ]
    };

    const snap = buildPipelineDashboardSnapshot(
      { brandName: 'Acme', competitorA: 'Beta' },
      baseRun,
      previousRun
    );
    expect(snap).not.toBeNull();
    const acme = snap!.leaderboard.find((r) => r.brand === 'Acme');
    const beta = snap!.leaderboard.find((r) => r.brand === 'Beta');
    expect(acme?.delta7d).toBeGreaterThan(0);
    expect(beta?.delta7d).toBeLessThan(0);
  });
});
