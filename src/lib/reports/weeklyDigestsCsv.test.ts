import { describe, expect, it } from 'vitest';

import { buildWeeklyDigestsCsv } from './weeklyDigestsCsv';

describe('buildWeeklyDigestsCsv', () => {
  it('builds header and digest rows with provenance fields', () => {
    const csv = buildWeeklyDigestsCsv([
      {
        id: 'dg-1',
        generatedAt: '2026-04-29T00:00:00.000Z',
        periodStart: '2026-04-23',
        periodEnd: '2026-04-29',
        summary: {
          score: 58,
          signalSource: 'live',
          pipelineIngestionSource: 'live_gsc_queries',
          pipelineGscDiagnosticsSummary: 'attempt=filtered; cap=2',
          topOpportunities: ['Win alternatives', 'Improve pricing page']
        }
      }
    ]);

    expect(csv.startsWith('\uFEFFid,generatedAt,periodStart,periodEnd')).toBe(true);
    expect(csv).toContain('dg-1');
    expect(csv).toContain('Search Console');
    expect(csv).toContain('live_gsc_queries');
    expect(csv).toContain('Win alternatives | Improve pricing page');
    expect(csv).toContain('pipelineGscDiagnosticsSummary');
    expect(csv).toContain('attempt=filtered; cap=2');
  });

  it('renders empty score cell when summary score is null', () => {
    const csv = buildWeeklyDigestsCsv([
      {
        id: 'dg-null-score',
        generatedAt: '2026-04-29T00:00:00.000Z',
        periodStart: '2026-04-23',
        periodEnd: '2026-04-29',
        summary: {
          score: null,
          signalSource: 'live',
          pipelineIngestionSource: 'mock_ingestion',
          pipelineGscDiagnosticsSummary: null,
          topOpportunities: []
        }
      }
    ]);
    expect(csv).toContain('dg-null-score');
    expect(csv).toMatch(/2026-04-29,,live/);
  });

  it('joins no top opportunities as an empty last field', () => {
    const csv = buildWeeklyDigestsCsv([
      {
        id: 'dg-empty-ops',
        generatedAt: '2026-04-29T00:00:00.000Z',
        periodStart: '2026-04-23',
        periodEnd: '2026-04-29',
        summary: {
          score: 1,
          signalSource: 'cache',
          connectorSignalCacheKind: 'ttl',
          pipelineIngestionSource: null,
          pipelineGscDiagnosticsSummary: null,
          topOpportunities: []
        }
      }
    ]);
    expect(csv).toContain('dg-empty-ops');
    const line = csv.split(/\r?\n/).find((l) => l.startsWith('dg-empty-ops'))!;
    expect(line.endsWith(',')).toBe(true);
  });

  it('preserves full pipelineGscDiagnosticsSummary for long strings', () => {
    const longGsc = `attempt=unfiltered; ${'y'.repeat(200)}`;
    const csv = buildWeeklyDigestsCsv([
      {
        id: 'dg-long',
        generatedAt: '2026-04-29T00:00:00.000Z',
        periodStart: '2026-04-23',
        periodEnd: '2026-04-29',
        summary: {
          score: 1,
          signalSource: 'live',
          pipelineIngestionSource: 'live_gsc_queries',
          pipelineGscDiagnosticsSummary: longGsc,
          topOpportunities: []
        }
      }
    ]);
    expect(csv).toContain(longGsc);
    expect(longGsc.endsWith('…')).toBe(false);
  });
});
