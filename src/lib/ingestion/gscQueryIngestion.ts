import { google } from 'googleapis';
import type { webmasters_v3 } from 'googleapis';

import { rollingGscWindowDays } from '@/lib/connectors/gsc-date-range';
import { createGoogleAuth } from '@/lib/connectors/google-service-account-auth';
import { readOrgConnectorSettings, resolveGscSiteUrl } from '@/lib/connectors/org-settings';

import type { SourceDocument } from './types';

const GSC_SCOPE_READONLY = 'https://www.googleapis.com/auth/webmasters.readonly';

const WINDOW_DAYS = 28;

type GscSearchAnalyticsBody = webmasters_v3.Schema$SearchAnalyticsQueryRequest;

function stableDocId(kind: 'q' | 'p' | 'qp', key: string): string {
  const payload = `${kind}:${key}`;
  let h = 0;
  for (let i = 0; i < payload.length; i++) {
    h = (Math.imul(31, h) + payload.charCodeAt(i)) | 0;
  }
  return `gsc-${kind}-${Math.abs(h).toString(36)}`;
}

function pageTitleFromUrl(pageUrl: string): string {
  try {
    const u = new URL(pageUrl);
    const path = u.pathname.replace(/\/$/, '') || '/';
    const last = path.split('/').filter(Boolean).pop();
    return last ? decodeURIComponent(last) : path;
  } catch {
    return pageUrl.slice(0, 120);
  }
}

function rowToSourceDocument(
  query: string,
  row: {
    clicks?: number | null;
    impressions?: number | null;
    ctr?: number | null;
    position?: number | null;
  },
  asOf: string
): SourceDocument {
  const clicks = typeof row.clicks === 'number' && Number.isFinite(row.clicks) ? row.clicks : 0;
  const impressions =
    typeof row.impressions === 'number' && Number.isFinite(row.impressions) ? row.impressions : 0;
  const ctr = typeof row.ctr === 'number' && Number.isFinite(row.ctr) ? row.ctr : null;
  const position = typeof row.position === 'number' && Number.isFinite(row.position) ? row.position : null;
  const ctrPct = ctr !== null ? `${(ctr * 100).toFixed(2)}%` : 'n/a';
  const posStr = position !== null ? position.toFixed(2) : 'n/a';
  return {
    id: stableDocId('q', query),
    source: 'google_search_console',
    url: `gsc://search-query/${encodeURIComponent(query)}`,
    title: query,
    content: `Search query: ${query}. In the last ${WINDOW_DAYS} days: ${clicks} clicks, ${impressions} impressions, CTR ${ctrPct}, average position ${posStr}.`,
    publishedAt: asOf
  };
}

function rowQueryPagePairToSourceDocument(
  query: string,
  pageUrl: string,
  row: {
    clicks?: number | null;
    impressions?: number | null;
    ctr?: number | null;
    position?: number | null;
  },
  asOf: string
): SourceDocument {
  const clicks = typeof row.clicks === 'number' && Number.isFinite(row.clicks) ? row.clicks : 0;
  const impressions =
    typeof row.impressions === 'number' && Number.isFinite(row.impressions) ? row.impressions : 0;
  const ctr = typeof row.ctr === 'number' && Number.isFinite(row.ctr) ? row.ctr : null;
  const position = typeof row.position === 'number' && Number.isFinite(row.position) ? row.position : null;
  const ctrPct = ctr !== null ? `${(ctr * 100).toFixed(2)}%` : 'n/a';
  const posStr = position !== null ? position.toFixed(2) : 'n/a';
  const pageLabel = pageTitleFromUrl(pageUrl);
  const pairKey = `${query}\t${pageUrl}`;
  return {
    id: stableDocId('qp', pairKey),
    source: 'google_search_console',
    url: `gsc://query-page/${encodeURIComponent(query)}|${encodeURIComponent(pageUrl)}`,
    title: `${query} → ${pageLabel}`,
    content: `Search query "${query}" with landing page ${pageUrl}. In the last ${WINDOW_DAYS} days: ${clicks} clicks, ${impressions} impressions, CTR ${ctrPct}, average position ${posStr}.`,
    publishedAt: asOf
  };
}

function rowPageToSourceDocument(
  pageUrl: string,
  row: {
    clicks?: number | null;
    impressions?: number | null;
    ctr?: number | null;
    position?: number | null;
  },
  asOf: string
): SourceDocument {
  const clicks = typeof row.clicks === 'number' && Number.isFinite(row.clicks) ? row.clicks : 0;
  const impressions =
    typeof row.impressions === 'number' && Number.isFinite(row.impressions) ? row.impressions : 0;
  const ctr = typeof row.ctr === 'number' && Number.isFinite(row.ctr) ? row.ctr : null;
  const position = typeof row.position === 'number' && Number.isFinite(row.position) ? row.position : null;
  const ctrPct = ctr !== null ? `${(ctr * 100).toFixed(2)}%` : 'n/a';
  const posStr = position !== null ? position.toFixed(2) : 'n/a';
  const title = pageTitleFromUrl(pageUrl);
  return {
    id: stableDocId('p', pageUrl),
    source: 'google_search_console',
    url: `gsc://landing-page/${encodeURIComponent(pageUrl)}`,
    title: `Page: ${title}`,
    content: `Landing page from Search Console: ${pageUrl}. In the last ${WINDOW_DAYS} days: ${clicks} clicks, ${impressions} impressions, CTR ${ctrPct}, average position ${posStr}.`,
    publishedAt: asOf
  };
}

async function gscAuthAndSite(organizationId: string): Promise<{
  siteUrl: string;
  orgSettings: Awaited<ReturnType<typeof readOrgConnectorSettings>>;
} | null> {
  const orgSettings = await readOrgConnectorSettings(organizationId);
  const hasCreds =
    Boolean(orgSettings.gscServiceAccountJson) ||
    Boolean(orgSettings.ga4ServiceAccountJson) ||
    Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) ||
    Boolean(process.env.GSC_SERVICE_ACCOUNT_JSON?.trim()) ||
    Boolean(process.env.GA4_SERVICE_ACCOUNT_JSON?.trim());
  if (!hasCreds) {
    return null;
  }
  const siteUrl = await resolveGscSiteUrl(organizationId);
  if (!siteUrl) {
    return null;
  }
  return { siteUrl, orgSettings };
}

type GscQueryRow = {
  keys?: string[];
  clicks?: number | null;
  impressions?: number | null;
  ctr?: number | null;
  position?: number | null;
};

type GscSearchAnalyticsClient = {
  webmasters: ReturnType<typeof google.webmasters>;
  siteUrl: string;
  startDate: string;
  endDate: string;
  asOf: string;
};

async function gscSearchAnalyticsClient(organizationId: string): Promise<GscSearchAnalyticsClient | null> {
  const ctx = await gscAuthAndSite(organizationId);
  if (!ctx) {
    return null;
  }
  const { siteUrl, orgSettings } = ctx;
  const auth = createGoogleAuth(
    [GSC_SCOPE_READONLY],
    [orgSettings.gscServiceAccountJson, orgSettings.ga4ServiceAccountJson],
    ['GSC_SERVICE_ACCOUNT_JSON', 'GA4_SERVICE_ACCOUNT_JSON']
  );
  const webmasters = google.webmasters({ version: 'v3', auth });
  const { startDate, endDate, asOf } = rollingGscWindowDays(WINDOW_DAYS);
  return { webmasters, siteUrl, startDate, endDate, asOf };
}

async function runSearchAnalytics(
  client: GscSearchAnalyticsClient,
  requestBody: GscSearchAnalyticsBody
): Promise<GscQueryRow[] | null> {
  try {
    const { data } = await client.webmasters.searchanalytics.query({
      siteUrl: client.siteUrl,
      requestBody: {
        startDate: client.startDate,
        endDate: client.endDate,
        ...requestBody
      }
    });
    return (data.rows ?? []) as GscQueryRow[];
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[GSC ingestion] searchanalytics.query failed:', err);
    }
    return null;
  }
}

async function fetchQueryRowsWithClient(
  client: GscSearchAnalyticsClient,
  rowLimit: number,
  pipelineQuery: string,
  useQueryContainsFilter: boolean
): Promise<{ rows: GscQueryRow[]; asOf: string } | null> {
  const q = pipelineQuery.trim();
  const dimensionFilterGroups =
    useQueryContainsFilter && q.length >= 2
      ? [
          {
            filters: [
              {
                dimension: 'query' as const,
                operator: 'contains' as const,
                expression: q
              }
            ]
          }
        ]
      : undefined;

  const rows = await runSearchAnalytics(client, {
    dimensions: ['query'],
    rowLimit,
    dimensionFilterGroups
  });
  if (rows === null) {
    return null;
  }
  return { rows, asOf: client.asOf };
}

/** Top landing pages (page dimension); tries URL contains pipeline query then unfiltered. */
async function fetchPageRowsWithClient(
  client: GscSearchAnalyticsClient,
  rowLimit: number,
  pipelineQuery: string
): Promise<{ rows: GscQueryRow[]; asOf: string } | null> {
  const q = pipelineQuery.trim();
  const capped = Math.min(100, Math.max(1, rowLimit));

  const tryFiltered = q.length >= 2;
  if (tryFiltered) {
    const filtered = await runSearchAnalytics(client, {
      dimensions: ['page'],
      rowLimit: capped,
      dimensionFilterGroups: [
        {
          filters: [
            {
              dimension: 'page' as const,
              operator: 'contains' as const,
              expression: q
            }
          ]
        }
      ]
    });
    if (filtered === null) {
      return null;
    }
    if (filtered.length > 0) {
      return { rows: filtered, asOf: client.asOf };
    }
  }

  const unfiltered = await runSearchAnalytics(client, {
    dimensions: ['page'],
    rowLimit: capped
  });
  if (unfiltered === null) {
    return null;
  }
  return { rows: unfiltered, asOf: client.asOf };
}

/** Query + page pairs (two dimensions); query "contains" filter then unfiltered. */
async function fetchQueryPagePairsWithClient(
  client: GscSearchAnalyticsClient,
  rowLimit: number,
  pipelineQuery: string
): Promise<{ rows: GscQueryRow[]; asOf: string } | null> {
  const q = pipelineQuery.trim();
  const capped = Math.min(100, Math.max(1, rowLimit));
  const tryFiltered = q.length >= 2;
  if (tryFiltered) {
    const filtered = await runSearchAnalytics(client, {
      dimensions: ['query', 'page'],
      rowLimit: capped,
      dimensionFilterGroups: [
        {
          filters: [
            {
              dimension: 'query' as const,
              operator: 'contains' as const,
              expression: q
            }
          ]
        }
      ]
    });
    if (filtered === null) {
      return null;
    }
    if (filtered.length > 0) {
      return { rows: filtered, asOf: client.asOf };
    }
  }
  const unfiltered = await runSearchAnalytics(client, {
    dimensions: ['query', 'page'],
    rowLimit: capped
  });
  if (unfiltered === null) {
    return null;
  }
  return { rows: unfiltered, asOf: client.asOf };
}

/**
 * Top Search Console queries, landing pages, and query–page pairs as {@link SourceDocument} rows.
 * Queries: query "contains" filter then unfiltered top queries.
 * When query rows exist, also merges top pages (page dimension) and top query+page pairs (two dimensions).
 */
export async function fetchGscQueryDocuments(opts: {
  organizationId: string;
  pipelineQuery: string;
  rowLimit: number;
}): Promise<SourceDocument[]> {
  const { organizationId, pipelineQuery, rowLimit } = opts;
  const capped = Math.min(250, Math.max(1, rowLimit));

  const client = await gscSearchAnalyticsClient(organizationId);
  if (!client) {
    return [];
  }

  let pack = await fetchQueryRowsWithClient(client, capped, pipelineQuery, true);
  if (!pack || pack.rows.length === 0) {
    pack = await fetchQueryRowsWithClient(client, capped, pipelineQuery, false);
  }
  if (!pack || pack.rows.length === 0) {
    return [];
  }

  const docs: SourceDocument[] = [];
  for (const row of pack.rows) {
    const query = row.keys?.[0];
    if (!query || typeof query !== 'string') {
      continue;
    }
    docs.push(rowToSourceDocument(query, row, pack.asOf));
  }

  const pageRowBudget = Math.min(100, Math.max(5, Math.floor(capped / 2)));
  const pagePack = await fetchPageRowsWithClient(client, pageRowBudget, pipelineQuery);
  if (pagePack && pagePack.rows.length > 0) {
    for (const row of pagePack.rows) {
      const pageUrl = row.keys?.[0];
      if (!pageUrl || typeof pageUrl !== 'string') {
        continue;
      }
      docs.push(rowPageToSourceDocument(pageUrl, row, pagePack.asOf));
    }
  }

  const qpBudget = Math.min(80, Math.max(8, Math.floor(capped / 3)));
  const qpPack = await fetchQueryPagePairsWithClient(client, qpBudget, pipelineQuery);
  if (qpPack && qpPack.rows.length > 0) {
    for (const row of qpPack.rows) {
      const query = row.keys?.[0];
      const pageUrl = row.keys?.[1];
      if (!query || typeof query !== 'string' || !pageUrl || typeof pageUrl !== 'string') {
        continue;
      }
      docs.push(rowQueryPagePairToSourceDocument(query, pageUrl, row, qpPack.asOf));
    }
  }

  return docs;
}
