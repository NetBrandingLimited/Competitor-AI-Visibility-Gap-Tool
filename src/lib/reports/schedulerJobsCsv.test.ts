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
      { 'run-1': 'live_gsc_queries' }
    );

    expect(csv.startsWith('\uFEFFid,startedAt,completedAt,status')).toBe(true);
    expect(csv).toContain('job-1');
    expect(csv).toContain('run-1');
    expect(csv).toContain('Search Console');
    expect(csv).toContain('live_gsc_queries');
    expect(csv).toContain('dg-1');
    expect(csv).toContain('live');
  });
});
