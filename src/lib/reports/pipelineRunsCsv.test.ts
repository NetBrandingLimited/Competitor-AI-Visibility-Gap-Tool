import { describe, expect, it } from 'vitest';

import { buildPipelineRunsCsv } from './pipelineRunsCsv';

describe('buildPipelineRunsCsv', () => {
  it('builds rows with ingestion source column', () => {
    const csv = buildPipelineRunsCsv([
      {
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
        clusters: []
      }
    ]);

    expect(csv.startsWith('\uFEFFid,createdAt,query,ingestionSource,gscDiagnosticsSummary')).toBe(true);
    expect(csv).toContain('run-1');
    expect(csv).toContain('crm alternatives');
    expect(csv).toContain('live_gsc_queries');
  });
});
