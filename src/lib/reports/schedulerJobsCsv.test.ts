import { describe, expect, it } from 'vitest';

import { buildSchedulerJobsCsv } from './schedulerJobsCsv';

describe('buildSchedulerJobsCsv', () => {
  it('includes pipeline provenance and digest signal columns', () => {
    const csv = buildSchedulerJobsCsv(
      [
        {
          id: 'job-1',
          startedAt: '2026-04-29T00:00:00.000Z',
          completedAt: '2026-04-29T00:02:00.000Z',
          status: 'success',
          query: 'crm alternatives',
          pipelineRunId: 'run-1',
          weeklyDigestId: 'dg-1'
        }
      ],
      { 'dg-1': 'live' },
      { 'run-1': 'live_gsc_queries' },
      { 'run-1': 'stub-gsc-summary' }
    );

    expect(csv.startsWith('\uFEFFid,startedAt,completedAt,status')).toBe(true);
    expect(csv).toContain('pipelineRunGscDiagnosticsSummary');
    expect(csv).toContain('job-1');
    expect(csv).toContain('run-1');
    expect(csv).toContain('Search Console');
    expect(csv).toContain('live_gsc_queries');
    expect(csv).toContain('dg-1');
    expect(csv).toContain('live');
    expect(csv).toContain('stub-gsc-summary');
  });

  it('leaves GSC summary column empty when map is omitted', () => {
    const csv = buildSchedulerJobsCsv(
      [
        {
          id: 'job-1',
          startedAt: '2026-04-29T00:00:00.000Z',
          completedAt: '2026-04-29T00:02:00.000Z',
          status: 'success',
          query: 'q',
          pipelineRunId: 'run-1'
        }
      ],
      {},
      { 'run-1': 'live_gsc_queries' }
    );
    const lines = csv.split(/\r?\n/).filter(Boolean);
    const header = lines[0]!.replace(/^\uFEFF/, '');
    const cells = lines[1]!.split(',');
    const gscIdx = header.split(',').indexOf('pipelineRunGscDiagnosticsSummary');
    expect(gscIdx).toBeGreaterThan(-1);
    expect(cells[gscIdx]).toBe('');
  });
});
