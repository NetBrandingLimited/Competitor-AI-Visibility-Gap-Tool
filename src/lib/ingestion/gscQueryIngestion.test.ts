import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  queryMock: vi.fn(),
  readOrgConnectorSettings: vi.fn(),
  resolveGscSiteUrl: vi.fn()
}));

vi.mock('googleapis', () => ({
  google: {
    webmasters: vi.fn(() => ({
      searchanalytics: {
        query: hoisted.queryMock
      }
    }))
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
      });

    const docs = await fetchGscQueryDocuments({
      organizationId: orgId,
      pipelineQuery: 'crm',
      rowLimit: 10
    });

    expect(hoisted.queryMock).toHaveBeenCalledTimes(4);
    const firstBody = hoisted.queryMock.mock.calls[0][0].requestBody;
    expect(firstBody.dimensionFilterGroups).toBeDefined();
    const secondBody = hoisted.queryMock.mock.calls[1][0].requestBody;
    expect(secondBody.dimensionFilterGroups).toBeUndefined();

    const pageBody = hoisted.queryMock.mock.calls[2][0].requestBody;
    expect(pageBody.dimensions).toEqual(['page']);
    expect(pageBody.dimensionFilterGroups?.[0]?.filters?.[0]?.dimension).toBe('page');

    expect(docs).toHaveLength(2);
    expect(docs[0].title).toBe('best crm for startups');
    expect(docs[0].content).toContain('Search query:');
    expect(docs[1].url).toContain('gsc://landing-page/');
    expect(docs[1].title).toBe('Page: pricing');
    expect(docs[1].content).toContain('https://example.com/pricing');
    expect(docs[1].content).toContain('9 clicks');
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
      });

    const docs = await fetchGscQueryDocuments({
      organizationId: orgId,
      pipelineQuery: 'crm',
      rowLimit: 10
    });

    expect(hoisted.queryMock).toHaveBeenCalledTimes(3);
    expect(docs).toHaveLength(2);
    expect(docs[0].title).toBe('crm pricing');
    expect(docs[1].content).toContain('Landing page from Search Console');
    expect(docs[1].content).toContain('https://example.com/crm');
  });
});
