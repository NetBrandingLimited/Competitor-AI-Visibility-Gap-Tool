import { describe, expect, it } from 'vitest';

import {
  formatGscIngestionDiagnosticsSummary,
  GSC_SUMMARY_UI_TABLE_MAX,
  type GscIngestionDiagnostics
} from '@/lib/ingestion/gscDiagnostics';
import type { UnifiedPipelineRun } from '@/lib/pipeline/types';

import { buildPipelineRunsCsv } from './pipelineRunsCsv';

const sampleGsc: GscIngestionDiagnostics = {
  queryAttempt: { usedFiltered: true, usedUnfiltered: false, filteredRows: 1, unfilteredRows: 0 },
  query: { fetched: 1, filteredZeroEngagement: 0, filteredLowSignal: 0, docsCreated: 1 },
  page: { fetched: 0, filteredZeroEngagement: 0, filteredLowSignal: 0, docsCreated: 0 },
  qp: { fetched: 0, filteredZeroEngagement: 0, filteredLowSignal: 0, docsCreated: 0 },
  mergedDocsBeforeDedupe: 1,
  dedupedDocs: 1,
  cappedDocs: 1
};

function baseRun(overrides: Partial<UnifiedPipelineRun> = {}): UnifiedPipelineRun {
  return {
    id: 'run-1',
    createdAt: '2026-04-29T00:00:00.000Z',
    query: 'crm alternatives',
    ingestionSource: 'live_gsc_queries',
    limitPerConnector: 2,
    documentCount: 14,
    triggerCount: 8,
    clusterCount: 3,
    ingestionEvents: [],
    documents: [],
    triggers: [],
    clusters: [],
    ...overrides
  };
}

describe('buildPipelineRunsCsv', () => {
  it('builds rows with ingestion source column', () => {
    const csv = buildPipelineRunsCsv([baseRun()]);

    expect(csv.startsWith('\uFEFFid,createdAt,query,ingestionSource,gscDiagnosticsSummary')).toBe(true);
    expect(csv).toContain('run-1');
    expect(csv).toContain('crm alternatives');
    expect(csv).toContain('live_gsc_queries');
  });

  it('embeds the full formatted GSC summary (not UI-truncated)', () => {
    const full = formatGscIngestionDiagnosticsSummary(sampleGsc);
    expect(full.length).toBeGreaterThan(GSC_SUMMARY_UI_TABLE_MAX);

    const csv = buildPipelineRunsCsv([baseRun({ gscIngestionDiagnostics: sampleGsc })]);
    expect(csv).toContain(full);
    expect(full.endsWith('…')).toBe(false);
  });

  it('leaves ingestion and GSC columns empty when those fields are absent', () => {
    const csv = buildPipelineRunsCsv([
      baseRun({
        ingestionSource: undefined,
        gscIngestionDiagnostics: undefined
      })
    ]);
    expect(csv).not.toContain('attempt=');
    expect(csv).toContain('crm alternatives,,,');
  });

  it('includes mock ingestion source when present', () => {
    const csv = buildPipelineRunsCsv([baseRun({ ingestionSource: 'mock_ingestion' })]);
    expect(csv).toContain('mock_ingestion');
  });
});
