import { describe, expect, it } from 'vitest';

import { parseWeeklyDigestSummaryJson, weeklyDigestPipelineLabel, weeklyDigestSignalsLabel } from '@/lib/digest/weekly';

describe('weeklyDigestSignalsLabel', () => {
  it('returns em dash when signal source is missing', () => {
    expect(weeklyDigestSignalsLabel({ signalSource: null })).toBe('—');
  });

  it('returns live for live source', () => {
    expect(weeklyDigestSignalsLabel({ signalSource: 'live' })).toBe('live');
  });

  it('describes TTL cache', () => {
    expect(
      weeklyDigestSignalsLabel({ signalSource: 'cache', connectorSignalCacheKind: 'ttl' })
    ).toBe('cache (within TTL)');
  });

  it('describes stale fallback cache', () => {
    expect(
      weeklyDigestSignalsLabel({ signalSource: 'cache', connectorSignalCacheKind: 'stale_fallback' })
    ).toBe('cache (fallback: live fetch had no metrics)');
  });

  it('returns generic cache when kind is unknown', () => {
    expect(weeklyDigestSignalsLabel({ signalSource: 'cache' })).toBe('cache');
  });
});

describe('weeklyDigestPipelineLabel', () => {
  it('maps live and mock pipeline sources', () => {
    expect(weeklyDigestPipelineLabel({ pipelineIngestionSource: 'live_gsc_queries' })).toBe('Search Console');
    expect(weeklyDigestPipelineLabel({ pipelineIngestionSource: 'mock_ingestion' })).toBe('Mock templates');
  });

  it('returns not recorded when pipeline source missing', () => {
    expect(weeklyDigestPipelineLabel({ pipelineIngestionSource: null })).toBe('Not recorded');
  });
});

describe('parseWeeklyDigestSummaryJson', () => {
  it('parses connector cache kind and signal source', () => {
    const raw = JSON.stringify({
      score: 42,
      signalSource: 'cache',
      pipelineIngestionSource: 'live_gsc_queries',
      connectorSignalCacheKind: 'stale_fallback',
      topOpportunities: ['A', 'B']
    });
    const s = parseWeeklyDigestSummaryJson(raw);
    expect(s.score).toBe(42);
    expect(s.signalSource).toBe('cache');
    expect(s.pipelineIngestionSource).toBe('live_gsc_queries');
    expect(s.connectorSignalCacheKind).toBe('stale_fallback');
    expect(s.topOpportunities).toEqual(['A', 'B']);
    expect(weeklyDigestSignalsLabel(s)).toBe('cache (fallback: live fetch had no metrics)');
  });

  it('rejects invalid connectorSignalCacheKind', () => {
    const raw = JSON.stringify({
      score: 1,
      signalSource: 'cache',
      connectorSignalCacheKind: 'nope',
      topOpportunities: []
    });
    const s = parseWeeklyDigestSummaryJson(raw);
    expect(s.connectorSignalCacheKind).toBeNull();
  });

  it('rejects invalid pipelineIngestionSource', () => {
    const raw = JSON.stringify({
      score: 1,
      signalSource: 'live',
      pipelineIngestionSource: 'unsupported',
      topOpportunities: []
    });
    const s = parseWeeklyDigestSummaryJson(raw);
    expect(s.pipelineIngestionSource).toBeNull();
  });

  it('parses pipelineGscDiagnosticsSummary when present', () => {
    const raw = JSON.stringify({
      score: 1,
      signalSource: 'live',
      pipelineIngestionSource: 'live_gsc_queries',
      pipelineGscDiagnosticsSummary: 'attempt=filtered; q:fetched=2',
      topOpportunities: []
    });
    const s = parseWeeklyDigestSummaryJson(raw);
    expect(s.pipelineGscDiagnosticsSummary).toBe('attempt=filtered; q:fetched=2');
  });

  it('returns empty summary on invalid JSON', () => {
    const s = parseWeeklyDigestSummaryJson('not json');
    expect(s.score).toBeNull();
    expect(s.signalSource).toBeNull();
    expect(s.topOpportunities).toEqual([]);
  });

  it('parses pipelineRunIdForGsc on opportunities when present', () => {
    const raw = JSON.stringify({
      score: 1,
      signalSource: 'live',
      topOpportunities: [],
      opportunities: [
        {
          id: 'score-under-threshold',
          title: 'Low score',
          detail: '… Pipeline GSC: cap=1',
          priority: 'high',
          pipelineRunIdForGsc: 'run-abc'
        }
      ]
    });
    const s = parseWeeklyDigestSummaryJson(raw);
    expect(s.opportunities).toHaveLength(1);
    expect(s.opportunities![0].pipelineRunIdForGsc).toBe('run-abc');
  });
});
