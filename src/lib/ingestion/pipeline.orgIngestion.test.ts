import { describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  fetchGscQueryDocumentsWithDiagnostics: vi.fn()
}));

vi.mock('./gscQueryIngestion', () => ({
  fetchGscQueryDocumentsWithDiagnostics: hoisted.fetchGscQueryDocumentsWithDiagnostics
}));

import { runOrgIngestion, runOrgIngestionDebug } from './pipeline';

describe('runOrgIngestion', () => {
  it('uses mock ingestion when GSC returns no documents', async () => {
    hoisted.fetchGscQueryDocumentsWithDiagnostics.mockResolvedValue({
      docs: [],
      diagnostics: {
        queryAttempt: { usedFiltered: false, usedUnfiltered: false, filteredRows: 0, unfilteredRows: 0 },
        query: { fetched: 0, filteredZeroEngagement: 0, filteredLowSignal: 0, docsCreated: 0 },
        page: { fetched: 0, filteredZeroEngagement: 0, filteredLowSignal: 0, docsCreated: 0 },
        qp: { fetched: 0, filteredZeroEngagement: 0, filteredLowSignal: 0, docsCreated: 0 },
        mergedDocsBeforeDedupe: 0,
        dedupedDocs: 0,
        cappedDocs: 0
      }
    });

    const { result, ingestionSource, gscDiagnostics } = await runOrgIngestion({
      organizationId: 'org-1',
      query: 'test query',
      limitPerConnector: 2,
      contentVariant: 0
    });

    expect(ingestionSource).toBe('mock_ingestion');
    expect(gscDiagnostics).toBeNull();
    expect(result.documents.length).toBeGreaterThan(0);
    expect(result.documents.some((d) => d.source === 'reddit-mock')).toBe(true);
    expect(result.events.some((e) => e.type === 'connector_completed' && e.connector === 'reddit-mock')).toBe(true);
  });

  it('uses live GSC documents when the fetch returns rows', async () => {
    hoisted.fetchGscQueryDocumentsWithDiagnostics.mockResolvedValue({
      docs: [
        {
          id: 'gsc-q-test',
          source: 'google_search_console',
          url: 'gsc://search-query/foo',
          title: 'foo bar',
          content: 'Search query: foo bar. Brand Acme.',
          publishedAt: '2026-04-01'
        }
      ],
      diagnostics: {
        queryAttempt: { usedFiltered: false, usedUnfiltered: true, filteredRows: 0, unfilteredRows: 1 },
        query: { fetched: 1, filteredZeroEngagement: 0, filteredLowSignal: 0, docsCreated: 1 },
        page: { fetched: 0, filteredZeroEngagement: 0, filteredLowSignal: 0, docsCreated: 0 },
        qp: { fetched: 0, filteredZeroEngagement: 0, filteredLowSignal: 0, docsCreated: 0 },
        mergedDocsBeforeDedupe: 1,
        dedupedDocs: 1,
        cappedDocs: 1
      }
    });

    const { result, ingestionSource, gscDiagnostics } = await runOrgIngestion({
      organizationId: 'org-1',
      query: 'foo',
      limitPerConnector: 2,
      brandContext: { brandName: 'Acme' },
      contentVariant: 0
    });

    expect(ingestionSource).toBe('live_gsc_queries');
    expect(gscDiagnostics).not.toBeNull();
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].source).toBe('google_search_console');
    expect(result.documents[0].content).toContain('Acme');
    expect(result.events.filter((e) => e.type === 'connector_completed')).toEqual([
      expect.objectContaining({ connector: 'google_search_console', count: 1 })
    ]);
  });
});

describe('runOrgIngestionDebug', () => {
  it('returns gsc diagnostics when live GSC is used', async () => {
    hoisted.fetchGscQueryDocumentsWithDiagnostics.mockResolvedValue({
      docs: [
        {
          id: 'gsc-q-test',
          source: 'google_search_console',
          url: 'gsc://search-query/foo',
          title: 'foo bar',
          content: 'Search query: foo bar. Brand Acme.',
          publishedAt: '2026-04-01'
        }
      ],
      diagnostics: {
        queryAttempt: { usedFiltered: false, usedUnfiltered: true, filteredRows: 0, unfilteredRows: 1 },
        query: { fetched: 1, filteredZeroEngagement: 0, filteredLowSignal: 0, docsCreated: 1 },
        page: { fetched: 0, filteredZeroEngagement: 0, filteredLowSignal: 0, docsCreated: 0 },
        qp: { fetched: 0, filteredZeroEngagement: 0, filteredLowSignal: 0, docsCreated: 0 },
        mergedDocsBeforeDedupe: 1,
        dedupedDocs: 1,
        cappedDocs: 1
      }
    });

    const { result, ingestionSource, gscDiagnostics } = await runOrgIngestionDebug({
      organizationId: 'org-1',
      query: 'foo',
      limitPerConnector: 2,
      brandContext: { brandName: 'Acme' },
      contentVariant: 0
    });

    expect(ingestionSource).toBe('live_gsc_queries');
    expect(gscDiagnostics).not.toBeNull();
    expect(gscDiagnostics?.cappedDocs).toBe(1);
    expect(result.documents).toHaveLength(1);
  });

  it('returns null diagnostics when it falls back to mock', async () => {
    hoisted.fetchGscQueryDocumentsWithDiagnostics.mockResolvedValue({
      docs: [],
      diagnostics: {
        queryAttempt: { usedFiltered: false, usedUnfiltered: false, filteredRows: 0, unfilteredRows: 0 },
        query: { fetched: 0, filteredZeroEngagement: 0, filteredLowSignal: 0, docsCreated: 0 },
        page: { fetched: 0, filteredZeroEngagement: 0, filteredLowSignal: 0, docsCreated: 0 },
        qp: { fetched: 0, filteredZeroEngagement: 0, filteredLowSignal: 0, docsCreated: 0 },
        mergedDocsBeforeDedupe: 0,
        dedupedDocs: 0,
        cappedDocs: 0
      }
    });

    const { ingestionSource, gscDiagnostics } = await runOrgIngestionDebug({
      organizationId: 'org-1',
      query: 'test query',
      limitPerConnector: 2,
      contentVariant: 0
    });

    expect(ingestionSource).toBe('mock_ingestion');
    expect(gscDiagnostics).toBeNull();
  });
});
