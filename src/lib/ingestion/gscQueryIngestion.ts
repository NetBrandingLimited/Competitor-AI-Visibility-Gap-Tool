import { google } from 'googleapis';

import { rollingGscWindowDays } from '@/lib/connectors/gsc-date-range';
import { createGoogleAuth } from '@/lib/connectors/google-service-account-auth';
import { readOrgConnectorSettings, resolveGscSiteUrl } from '@/lib/connectors/org-settings';

import type { SourceDocument } from './types';

const GSC_SCOPE_READONLY = 'https://www.googleapis.com/auth/webmasters.readonly';

const WINDOW_DAYS = 28;

function stableDocId(query: string): string {
  let h = 0;
  for (let i = 0; i < query.length; i++) {
    h = (Math.imul(31, h) + query.charCodeAt(i)) | 0;
  }
  return `gsc-q-${Math.abs(h).toString(36)}`;
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
    id: stableDocId(query),
    source: 'google_search_console',
    url: `gsc://search-query/${encodeURIComponent(query)}`,
    title: query,
    content: `Search query: ${query}. In the last ${WINDOW_DAYS} days: ${clicks} clicks, ${impressions} impressions, CTR ${ctrPct}, average position ${posStr}.`,
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

async function fetchQueryRows(
  organizationId: string,
  rowLimit: number,
  pipelineQuery: string,
  useQueryContainsFilter: boolean
): Promise<{ rows: GscQueryRow[]; asOf: string } | null> {
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

  try {
    const { data } = await webmasters.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit,
        dimensionFilterGroups
      }
    });
    const rows = (data.rows ?? []) as GscQueryRow[];
    return { rows, asOf };
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[GSC ingestion] searchanalytics.query failed:', err);
    }
    return null;
  }
}

/**
 * Top Search Console queries as {@link SourceDocument} rows for the unified pipeline.
 * Tries a query "contains" filter aligned with the pipeline query, then falls back to unfiltered top queries.
 */
export async function fetchGscQueryDocuments(opts: {
  organizationId: string;
  pipelineQuery: string;
  rowLimit: number;
}): Promise<SourceDocument[]> {
  const { organizationId, pipelineQuery, rowLimit } = opts;
  const capped = Math.min(250, Math.max(1, rowLimit));

  let pack = await fetchQueryRows(organizationId, capped, pipelineQuery, true);
  if (!pack || pack.rows.length === 0) {
    pack = await fetchQueryRows(organizationId, capped, pipelineQuery, false);
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
  return docs;
}
