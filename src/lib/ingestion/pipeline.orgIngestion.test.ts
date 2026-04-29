import { describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  fetchGscQueryDocuments: vi.fn()
}));

vi.mock('./gscQueryIngestion', () => ({
  fetchGscQueryDocuments: hoisted.fetchGscQueryDocuments
}));

import { runOrgIngestion } from './pipeline';

describe('runOrgIngestion', () => {
  it('uses mock ingestion when GSC returns no documents', async () => {
    hoisted.fetchGscQueryDocuments.mockResolvedValue([]);

    const { result, ingestionSource } = await runOrgIngestion({
      organizationId: 'org-1',
      query: 'test query',
      limitPerConnector: 2,
      contentVariant: 0
    });

    expect(ingestionSource).toBe('mock_ingestion');
    expect(result.documents.length).toBeGreaterThan(0);
    expect(result.documents.some((d) => d.source === 'reddit-mock')).toBe(true);
    expect(result.events.some((e) => e.type === 'connector_completed' && e.connector === 'reddit-mock')).toBe(true);
  });

  it('uses live GSC documents when the fetch returns rows', async () => {
    hoisted.fetchGscQueryDocuments.mockResolvedValue([
      {
        id: 'gsc-q-test',
        source: 'google_search_console',
        url: 'gsc://search-query/foo',
        title: 'foo bar',
        content: 'Search query: foo bar. Brand Acme.',
        publishedAt: '2026-04-01'
      }
    ]);

    const { result, ingestionSource } = await runOrgIngestion({
      organizationId: 'org-1',
      query: 'foo',
      limitPerConnector: 2,
      brandContext: { brandName: 'Acme' },
      contentVariant: 0
    });

    expect(ingestionSource).toBe('live_gsc_queries');
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].source).toBe('google_search_console');
    expect(result.documents[0].content).toContain('Acme');
    expect(result.events.filter((e) => e.type === 'connector_completed')).toEqual([
      expect.objectContaining({ connector: 'google_search_console', count: 1 })
    ]);
  });
});
