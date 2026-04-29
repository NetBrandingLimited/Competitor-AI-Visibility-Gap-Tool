import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => {
  const queryMock = vi.fn();
  const webmastersFactory = vi.fn(() => ({
    searchanalytics: {
      query: queryMock
    }
  }));
  return {
    queryMock,
    webmastersFactory,
    readOrgConnectorSettings: vi.fn(),
    resolveGscSiteUrl: vi.fn()
  };
});

vi.mock('googleapis', () => ({
  google: {
    webmasters: hoisted.webmastersFactory
  }
}));

vi.mock('@/lib/connectors/google-service-account-auth', () => ({
  createGoogleAuth: vi.fn(() => ({}))
}));

vi.mock('@/lib/connectors/org-settings', () => ({
  readOrgConnectorSettings: hoisted.readOrgConnectorSettings,
  resolveGscSiteUrl: hoisted.resolveGscSiteUrl
}));

import { fetchGscQueryDocuments } from './gscQueryIngestion';

const orgId = 'org-test-1';
const saJson = '{"type":"service_account","project_id":"p","private_key_id":"k","private_key":"-----BEGIN PRIVATE KEY-----\\nMII\\n-----END PRIVATE KEY-----\\n","client_email":"x@p.iam.gserviceaccount.com","client_id":"1"}';

describe('fetchGscQueryDocuments', () => {
  const envBackup: Record<string, string | undefined> = {};

  beforeEach(() => {
    hoisted.queryMock.mockReset();
    hoisted.webmastersFactory.mockClear();
    hoisted.readOrgConnectorSettings.mockReset();
    hoisted.resolveGscSiteUrl.mockReset();
    for (const key of [
      'GOOGLE_APPLICATION_CREDENTIALS',
      'GSC_SERVICE_ACCOUNT_JSON',
      'GA4_SERVICE_ACCOUNT_JSON'
    ] as const) {
      envBackup[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const [key, val] of Object.entries(envBackup)) {
      if (val === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = val;
      }
    }
  });

  it('returns no documents when org has no credentials and no env creds', async () => {
    hoisted.readOrgConnectorSettings.mockResolvedValue({
      gscSiteUrl: 'https://example.com/',
      ga4PropertyId: null,
      gscServiceAccountJson: null,
      ga4ServiceAccountJson: null
    });
    hoisted.resolveGscSiteUrl.mockResolvedValue('https://example.com/');

    const docs = await fetchGscQueryDocuments({
      organizationId: orgId,
      pipelineQuery: 'seo tool',
      rowLimit: 25
    });

    expect(docs).toEqual([]);
    expect(hoisted.queryMock).not.toHaveBeenCalled();
  });

  it('returns no documents when credentials exist but site URL cannot be resolved', async () => {
    hoisted.readOrgConnectorSettings.mockResolvedValue({
      gscSiteUrl: null,
      ga4PropertyId: null,
      gscServiceAccountJson: saJson,
      ga4ServiceAccountJson: null
    });
    hoisted.resolveGscSiteUrl.mockResolvedValue(null);

    const docs = await fetchGscQueryDocuments({
      organizationId: orgId,
      pipelineQuery: 'seo tool',
      rowLimit: 25
    });

    expect(docs).toEqual([]);
    expect(hoisted.queryMock).not.toHaveBeenCalled();
  });

  it('retries without query filter when filtered request returns no rows', async () => {
    hoisted.readOrgConnectorSettings.mockResolvedValue({
      gscSiteUrl: 'https://example.com/',
      ga4PropertyId: null,
      gscServiceAccountJson: saJson,
      ga4ServiceAccountJson: null
    });
    hoisted.resolveGscSiteUrl.mockResolvedValue('https://example.com/');

    hoisted.queryMock
      .mockResolvedValueOnce({ data: { rows: [] } })
      .mockResolvedValueOnce({
        data: {
          rows: [{ keys: ['best crm for startups'], clicks: 2, impressions: 40, ctr: 0.05, position: 6.1 }]
        }
      })
      .mockResolvedValueOnce({ data: { rows: [] } })
      .mockResolvedValueOnce({
        data: {
          rows: [
            {
              keys: ['https://example.com/pricing'],
              clicks: 9,
              impressions: 200,
              ctr: 0.045,
              position: 4.5
            }
          ]
        }
      })
      .mockResolvedValueOnce({ data: { rows: [] } })
      .mockResolvedValueOnce({
        data: {
          rows: [
            {
              keys: ['best crm for startups', 'https://example.com/pricing'],
              clicks: 1,
              impressions: 12,
              ctr: 0.08,
              position: 5
            }
          ]
        }
      });

    const docs = await fetchGscQueryDocuments({
      organizationId: orgId,
      pipelineQuery: 'crm',
      rowLimit: 10
    });

    expect(hoisted.queryMock).toHaveBeenCalledTimes(6);
    const firstBody = hoisted.queryMock.mock.calls[0][0].requestBody;
    expect(firstBody.dimensionFilterGroups).toBeDefined();
    const secondBody = hoisted.queryMock.mock.calls[1][0].requestBody;
    expect(secondBody.dimensionFilterGroups).toBeUndefined();

    const pageBody = hoisted.queryMock.mock.calls[2][0].requestBody;
    expect(pageBody.dimensions).toEqual(['page']);
    expect(pageBody.dimensionFilterGroups?.[0]?.filters?.[0]?.dimension).toBe('page');

    const qpBody = hoisted.queryMock.mock.calls[4][0].requestBody;
    expect(qpBody.dimensions).toEqual(['query', 'page']);

    expect(docs).toHaveLength(3);
    expect(docs[0].title).toBe('best crm for startups');
    expect(docs[0].content).toContain('Search query:');
    expect(docs[1].url).toContain('gsc://landing-page/');
    expect(docs[1].title).toBe('Page: pricing');
    expect(docs[1].content).toContain('https://example.com/pricing');
    expect(docs[1].content).toContain('9 clicks');
    expect(docs[2].url).toContain('gsc://query-page/');
    expect(docs[2].title).toContain('→');
    expect(docs[2].content).toContain('landing page');
    expect(hoisted.webmastersFactory).toHaveBeenCalledTimes(1);
  });

  it('caps merged documents while preserving query → page → pair order', async () => {
    hoisted.readOrgConnectorSettings.mockResolvedValue({
      gscSiteUrl: 'https://example.com/',
      ga4PropertyId: null,
      gscServiceAccountJson: saJson,
      ga4ServiceAccountJson: null
    });
    hoisted.resolveGscSiteUrl.mockResolvedValue('https://example.com/');

    const queryRows = Array.from({ length: 80 }, (_, i) => ({
      keys: [`query-${i}`],
      clicks: 1,
      impressions: 2,
      ctr: 0.5,
      position: 1
    }));
    const pageRows = Array.from({ length: 30 }, (_, i) => ({
      keys: [`https://example.com/p${i}`],
      clicks: 1,
      impressions: 1,
      ctr: 1,
      position: 1
    }));
    const qpRows = Array.from({ length: 20 }, (_, i) => ({
      keys: [`qp-${i}`, `https://example.com/qp${i}`],
      clicks: 1,
      impressions: 1,
      ctr: 1,
      position: 1
    }));

    hoisted.queryMock
      .mockResolvedValueOnce({ data: { rows: [] } })
      .mockResolvedValueOnce({ data: { rows: queryRows } })
      .mockResolvedValueOnce({ data: { rows: [] } })
      .mockResolvedValueOnce({ data: { rows: pageRows } })
      .mockResolvedValueOnce({ data: { rows: [] } })
      .mockResolvedValueOnce({ data: { rows: qpRows } });

    const docs = await fetchGscQueryDocuments({
      organizationId: orgId,
      pipelineQuery: 'crm',
      rowLimit: 60
    });

    expect(docs).toHaveLength(120);
    expect(docs[0].title).toBe('query-0');
    expect(docs[79].title).toBe('query-79');
    expect(docs[80].url).toContain('gsc://landing-page/');
    expect(docs[109].url).toContain('gsc://landing-page/');
    expect(docs[110].url).toContain('gsc://query-page/');
    expect(docs[119].url).toContain('gsc://query-page/');
    expect(hoisted.webmastersFactory).toHaveBeenCalledTimes(1);
  });

  it('uses a single API call when the filtered request returns rows', async () => {
    hoisted.readOrgConnectorSettings.mockResolvedValue({
      gscSiteUrl: 'https://example.com/',
      ga4PropertyId: null,
      gscServiceAccountJson: saJson,
      ga4ServiceAccountJson: null
    });
    hoisted.resolveGscSiteUrl.mockResolvedValue('https://example.com/');

    hoisted.queryMock
      .mockResolvedValueOnce({
        data: {
          rows: [{ keys: ['crm pricing'], clicks: 1, impressions: 5, ctr: 0.2, position: 2 }]
        }
      })
      .mockResolvedValueOnce({ data: { rows: [] } })
      .mockResolvedValueOnce({
        data: {
          rows: [{ keys: ['https://example.com/crm'], clicks: 3, impressions: 30, ctr: 0.1, position: 3 }]
        }
      })
      .mockResolvedValueOnce({ data: { rows: [] } })
      .mockResolvedValueOnce({
        data: {
          rows: [{ keys: ['crm pricing', 'https://example.com/crm'], clicks: 1, impressions: 8, ctr: 0.125, position: 2.5 }]
        }
      });

    const docs = await fetchGscQueryDocuments({
      organizationId: orgId,
      pipelineQuery: 'crm',
      rowLimit: 10
    });

    expect(hoisted.queryMock).toHaveBeenCalledTimes(5);
    expect(docs).toHaveLength(3);
    expect(docs[0].title).toBe('crm pricing');
    expect(docs[1].content).toContain('Landing page from Search Console');
    expect(docs[1].content).toContain('https://example.com/crm');
    expect(docs[2].url).toContain('gsc://query-page/');
    expect(hoisted.webmastersFactory).toHaveBeenCalledTimes(1);
  });

  it('skips zero-engagement rows and dedupes by URL', async () => {
    hoisted.readOrgConnectorSettings.mockResolvedValue({
      gscSiteUrl: 'https://example.com/',
      ga4PropertyId: null,
      gscServiceAccountJson: saJson,
      ga4ServiceAccountJson: null
    });
    hoisted.resolveGscSiteUrl.mockResolvedValue('https://example.com/');

    // query: includes duplicates + one zero-engagement query
    // page: includes one zero-engagement landing page (should be skipped)
    // qp: includes one zero-engagement query+page pair (should be skipped)
    hoisted.queryMock
      .mockResolvedValueOnce({
        data: {
          rows: [
            { keys: ['dup-q'], clicks: 2, impressions: 20, ctr: 0.05, position: 5 },
            { keys: ['dup-q'], clicks: 3, impressions: 10, ctr: 0.06, position: 4 },
            { keys: ['no-signal'], clicks: 0, impressions: 0, ctr: 0.01, position: 50 }
          ]
        }
      })
      .mockResolvedValueOnce({
        data: {
          rows: [{ keys: ['https://example.com/zero'], clicks: 0, impressions: 0, ctr: 0.0, position: 10 }]
        }
      })
      .mockResolvedValueOnce({
        data: {
          rows: [{ keys: ['dup-q', 'https://example.com/zero'], clicks: 0, impressions: 0, ctr: 0.0, position: 10 }]
        }
      });

    const docs = await fetchGscQueryDocuments({
      organizationId: orgId,
      pipelineQuery: 'dup',
      rowLimit: 10
    });

    // Only one unique query doc (duplicates deduped; zero-engagement rows skipped).
    expect(docs).toHaveLength(1);
    expect(docs[0].title).toBe('dup-q');
    expect(docs[0].url).toContain('gsc://search-query/');
    expect(hoisted.queryMock).toHaveBeenCalledTimes(3);
  });

  it('ranks query rows by impressions/clicks before document creation', async () => {
    hoisted.readOrgConnectorSettings.mockResolvedValue({
      gscSiteUrl: 'https://example.com/',
      ga4PropertyId: null,
      gscServiceAccountJson: saJson,
      ga4ServiceAccountJson: null
    });
    hoisted.resolveGscSiteUrl.mockResolvedValue('https://example.com/');

    // Query pack returns two valid rows; second row has higher impressions and should come first.
    hoisted.queryMock
      .mockResolvedValueOnce({
        data: {
          rows: [
            { keys: ['low'], clicks: 10, impressions: 5, ctr: 0.2, position: 2 },
            { keys: ['high'], clicks: 1, impressions: 50, ctr: 0.01, position: 1 }
          ]
        }
      })
      .mockResolvedValueOnce({ data: { rows: [] } }) // page filtered
      .mockResolvedValueOnce({ data: { rows: [] } }) // page unfiltered
      .mockResolvedValueOnce({ data: { rows: [] } }) // qp filtered
      .mockResolvedValueOnce({ data: { rows: [] } }); // qp unfiltered

    const docs = await fetchGscQueryDocuments({
      organizationId: orgId,
      pipelineQuery: 'dup',
      rowLimit: 10
    });

    expect(docs).toHaveLength(2);
    expect(docs[0].title).toBe('high');
    expect(docs[1].title).toBe('low');
  });

  it('filters low-signal rows but keeps clicked, high-impression, or strong-rank rows', async () => {
    hoisted.readOrgConnectorSettings.mockResolvedValue({
      gscSiteUrl: 'https://example.com/',
      ga4PropertyId: null,
      gscServiceAccountJson: saJson,
      ga4ServiceAccountJson: null
    });
    hoisted.resolveGscSiteUrl.mockResolvedValue('https://example.com/');

    hoisted.queryMock
      .mockResolvedValueOnce({
        data: {
          rows: [
            { keys: ['too-weak'], clicks: 0, impressions: 2, ctr: 0, position: 42 },
            { keys: ['has-click'], clicks: 1, impressions: 1, ctr: 1, position: 60 },
            { keys: ['has-impressions'], clicks: 0, impressions: 15, ctr: 0, position: 80 },
            { keys: ['has-rank'], clicks: 0, impressions: 3, ctr: 0, position: 8 }
          ]
        }
      })
      .mockResolvedValueOnce({
        data: {
          rows: [
            { keys: ['https://example.com/weak'], clicks: 0, impressions: 3, ctr: 0, position: 50 },
            { keys: ['https://example.com/good'], clicks: 0, impressions: 12, ctr: 0, position: 30 }
          ]
        }
      })
      .mockResolvedValueOnce({
        data: {
          rows: [
            { keys: ['weak-pair', 'https://example.com/weak-pair'], clicks: 0, impressions: 1, ctr: 0, position: 70 },
            { keys: ['good-pair', 'https://example.com/good-pair'], clicks: 0, impressions: 2, ctr: 0, position: 9 }
          ]
        }
      });

    const docs = await fetchGscQueryDocuments({
      organizationId: orgId,
      pipelineQuery: 'signal',
      rowLimit: 10
    });

    expect(docs.map((doc) => doc.title)).toEqual([
      'has-impressions',
      'has-rank',
      'has-click',
      'Page: good',
      'good-pair → good-pair'
    ]);
  });
});
