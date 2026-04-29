import { google } from 'googleapis';
import type { webmasters_v3 } from 'googleapis';

import { rollingGscWindowDays } from '@/lib/connectors/gsc-date-range';
import { createGoogleAuth } from '@/lib/connectors/google-service-account-auth';
import { readOrgConnectorSettings, resolveGscSiteUrl } from '@/lib/connectors/org-settings';

import type { SourceDocument } from './types';

const GSC_SCOPE_READONLY = 'https://www.googleapis.com/auth/webmasters.readonly';

const WINDOW_DAYS = 28;
const MIN_IMPRESSIONS_FOR_LOW_SIGNAL_ROW = 10;
const MAX_POSITION_FOR_LOW_SIGNAL_ROW = 20;

/** After merging query, page, and query–page rows, cap total documents (priority order preserved). */
function capGscDocumentList(docs: SourceDocument[], cappedRowBudget: number): SourceDocument[] {
  const maxTotal = Math.min(220, Math.max(25, cappedRowBudget * 2));
  if (docs.length <= maxTotal) {
    return docs;
  }
  return docs.slice(0, maxTotal);
}

type GscSearchAnalyticsBody = webmasters_v3.Schema$SearchAnalyticsQueryRequest;

function stableDocId(kind: 'q' | 'p' | 'qp', key: string): string {
  const payload = `${kind}:${key}`;
  let h = 0;
  for (let i = 0; i < payload.length; i++) {
    h = (Math.imul(31, h) + payload.charCodeAt(i)) | 0;
  }
  return `gsc-${kind}-${Math.abs(h).toString(36)}`;
}

function rowHasAnyEngagement(row: {
  clicks?: number | null;
  impressions?: number | null;
}): boolean {
  const clicks = typeof row.clicks === 'number' && Number.isFinite(row.clicks) ? row.clicks : 0;
  const impressions =
    typeof row.impressions === 'number' && Number.isFinite(row.impressions) ? row.impressions : 0;
  return clicks > 0 || impressions > 0;
}

/**
 * Keep clearly meaningful rows:
 * - any clicked row
 * - rows with enough impressions to matter
 * - rows ranking reasonably well even if clicks are still sparse
 */
function rowPassesQualityThreshold(row: {
  clicks?: number | null;
  impressions?: number | null;
  position?: number | null;
}): boolean {
  const clicks = typeof row.clicks === 'number' && Number.isFinite(row.clicks) ? row.clicks : 0;
  const impressions =
    typeof row.impressions === 'number' && Number.isFinite(row.impressions) ? row.impressions : 0;
  const position =
    typeof row.position === 'number' && Number.isFinite(row.position)
      ? row.position
      : Number.POSITIVE_INFINITY;

  return (
    clicks > 0 ||
    impressions >= MIN_IMPRESSIONS_FOR_LOW_SIGNAL_ROW ||
    position <= MAX_POSITION_FOR_LOW_SIGNAL_ROW
  );
}

/**
 * Rank GSC rows so that when we later cap/slice we keep the most impactful items.
 * Priority: impressions (desc) -> clicks (desc) -> CTR (desc) -> position (asc).
 */
function rankGscRows(rows: GscQueryRow[]): GscQueryRow[] {
  const indexed = rows.map((row, index) => ({ row, index }));
  indexed.sort((a, b) => {
    const aImp = typeof a.row.impressions === 'number' && Number.isFinite(a.row.impressions) ? a.row.impressions : 0;
    const bImp = typeof b.row.impressions === 'number' && Number.isFinite(b.row.impressions) ? b.row.impressions : 0;
    if (aImp !== bImp) return bImp - aImp;

    const aClk = typeof a.row.clicks === 'number' && Number.isFinite(a.row.clicks) ? a.row.clicks : 0;
    const bClk = typeof b.row.clicks === 'number' && Number.isFinite(b.row.clicks) ? b.row.clicks : 0;
    if (aClk !== bClk) return bClk - aClk;

    const aCtr = typeof a.row.ctr === 'number' && Number.isFinite(a.row.ctr) ? a.row.ctr : -1;
    const bCtr = typeof b.row.ctr === 'number' && Number.isFinite(b.row.ctr) ? b.row.ctr : -1;
    if (aCtr !== bCtr) return bCtr - aCtr;

    const aPos = typeof a.row.position === 'number' && Number.isFinite(a.row.position) ? a.row.position : Number.POSITIVE_INFINITY;
    const bPos = typeof b.row.position === 'number' && Number.isFinite(b.row.position) ? b.row.position : Number.POSITIVE_INFINITY;
    if (aPos !== bPos) return aPos - bPos;

    // Preserve original order for exact ties.
    return a.index - b.index;
  });
  return indexed.map((x) => x.row);
}

/** Deduplicate merged GSC docs before capping, so cap budget goes to unique URLs. */
function dedupeGscDocs(docs: SourceDocument[]): SourceDocument[] {
  const seen = new Set<string>();
  const deduped: SourceDocument[] = [];
  for (const doc of docs) {
    const key = doc.url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(doc);
  }
  return deduped;
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
  const rankedQueryRows = rankGscRows(pack.rows);
  for (const row of rankedQueryRows) {
    const query = row.keys?.[0];
    if (!query || typeof query !== 'string') {
      continue;
    }
    if (!rowHasAnyEngagement(row)) continue;
    if (!rowPassesQualityThreshold(row)) continue;
    docs.push(rowToSourceDocument(query, row, pack.asOf));
  }

  const pageRowBudget = Math.min(100, Math.max(5, Math.floor(capped / 2)));
  const pagePack = await fetchPageRowsWithClient(client, pageRowBudget, pipelineQuery);
  if (pagePack && pagePack.rows.length > 0) {
    const rankedPageRows = rankGscRows(pagePack.rows);
    for (const row of rankedPageRows) {
      const pageUrl = row.keys?.[0];
      if (!pageUrl || typeof pageUrl !== 'string') {
        continue;
      }
      if (!rowHasAnyEngagement(row)) continue;
      if (!rowPassesQualityThreshold(row)) continue;
      docs.push(rowPageToSourceDocument(pageUrl, row, pagePack.asOf));
    }
  }

  const qpBudget = Math.min(80, Math.max(8, Math.floor(capped / 3)));
  const qpPack = await fetchQueryPagePairsWithClient(client, qpBudget, pipelineQuery);
  if (qpPack && qpPack.rows.length > 0) {
    const rankedQpRows = rankGscRows(qpPack.rows);
    for (const row of rankedQpRows) {
      const query = row.keys?.[0];
      const pageUrl = row.keys?.[1];
      if (!query || typeof query !== 'string' || !pageUrl || typeof pageUrl !== 'string') {
        continue;
      }
      if (!rowHasAnyEngagement(row)) continue;
      if (!rowPassesQualityThreshold(row)) continue;
      docs.push(rowQueryPagePairToSourceDocument(query, pageUrl, row, qpPack.asOf));
    }
  }

  const mergedCount = docs.length;
  const uniqueDocs = dedupeGscDocs(docs);
  const cappedDocs = capGscDocumentList(uniqueDocs, capped);
  if (process.env.NODE_ENV === 'development' && mergedCount > 0) {
    const pageRows = pagePack?.rows.length ?? 0;
    const qpRows = qpPack?.rows.length ?? 0;
    console.info(
      `[GSC ingestion] org=${organizationId.slice(0, 8)}… API rows: query=${pack.rows.length} page=${pageRows} pair=${qpRows} → merged docs=${mergedCount}` +
        (uniqueDocs.length < mergedCount ? ` (deduped to ${uniqueDocs.length})` : '') +
        (cappedDocs.length < uniqueDocs.length ? ` (capped to ${cappedDocs.length})` : '')
    );
  }

  return cappedDocs;
}
