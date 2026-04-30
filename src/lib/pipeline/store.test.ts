import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GscIngestionDiagnostics } from '@/lib/ingestion/gscDiagnostics';

import type { UnifiedPipelineRun } from './types';

const pipelineRunMock = vi.hoisted(() => ({
  create: vi.fn(),
  findMany: vi.fn(),
  deleteMany: vi.fn(),
  findFirst: vi.fn()
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    pipelineRun: pipelineRunMock
  }
}));

import { readPipelineRunById, savePipelineRun } from './store';

const sampleDiagnostics: GscIngestionDiagnostics = {
  queryAttempt: { usedFiltered: true, usedUnfiltered: false, filteredRows: 2, unfilteredRows: 0 },
  query: { fetched: 2, filteredZeroEngagement: 0, filteredLowSignal: 0, docsCreated: 2 },
  page: { fetched: 0, filteredZeroEngagement: 0, filteredLowSignal: 0, docsCreated: 0 },
  qp: { fetched: 0, filteredZeroEngagement: 0, filteredLowSignal: 0, docsCreated: 0 },
  mergedDocsBeforeDedupe: 2,
  dedupedDocs: 2,
  cappedDocs: 2
};

function emptyRun(overrides: Partial<UnifiedPipelineRun> = {}): UnifiedPipelineRun {
  return {
    id: 'run-test-1',
    createdAt: '2026-04-30T12:00:00.000Z',
    query: 'test query',
    limitPerConnector: 10,
    documentCount: 0,
    triggerCount: 0,
    clusterCount: 0,
    ingestionEvents: [],
    documents: [],
    triggers: [],
    clusters: [],
    ...overrides
  };
}

describe('pipeline store — GSC diagnostics persistence', () => {
  beforeEach(() => {
    pipelineRunMock.create.mockReset();
    pipelineRunMock.findMany.mockReset();
    pipelineRunMock.deleteMany.mockReset();
    pipelineRunMock.findFirst.mockReset();
  });

  it('readPipelineRunById parses gscIngestionDiagnostics from raw JSON', async () => {
    pipelineRunMock.findFirst.mockResolvedValue({
      id: 'run-test-1',
      organizationId: 'org-1',
      createdAt: new Date('2026-04-30T12:00:00.000Z'),
      query: 'test query',
      limitPerConnector: 10,
      documentCount: 0,
      triggerCount: 0,
      clusterCount: 0,
      ingestionSource: 'live_gsc_queries',
      gscIngestionDiagnosticsRaw: JSON.stringify(sampleDiagnostics),
      ingestionEventsRaw: '[]',
      documentsRaw: '[]',
      triggersRaw: '[]',
      clustersRaw: '[]'
    });

    const run = await readPipelineRunById('org-1', 'run-test-1');
    expect(run).not.toBeNull();
    expect(run!.gscIngestionDiagnostics).toEqual(sampleDiagnostics);
  });

  it('savePipelineRun writes gscIngestionDiagnostics as JSON on create', async () => {
    pipelineRunMock.create.mockResolvedValue(undefined);
    pipelineRunMock.findMany.mockResolvedValue([]);

    await savePipelineRun(
      'org-1',
      emptyRun({
        gscIngestionDiagnostics: sampleDiagnostics,
        ingestionSource: 'live_gsc_queries'
      })
    );

    expect(pipelineRunMock.create).toHaveBeenCalledTimes(1);
    const data = pipelineRunMock.create.mock.calls[0]![0].data;
    expect(data.gscIngestionDiagnosticsRaw).toBe(JSON.stringify(sampleDiagnostics));
  });
});
