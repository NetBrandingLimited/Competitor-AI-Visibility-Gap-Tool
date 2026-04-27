import { google } from 'googleapis';

import { rollingGscWindowDays } from './gsc-date-range';
import { createGoogleAuth } from './google-service-account-auth';
import { readOrgConnectorSettings, resolveGscSiteUrl } from './org-settings';
import type { ConnectorFetchContext, ConnectorHealth, VisibilityConnector, VisibilitySignal } from './types';

const GSC_SCOPE_READONLY = 'https://www.googleapis.com/auth/webmasters.readonly';

/**
 * Google Search Console adapter.
 *
 * Env:
 * - `GSC_SITE_URL` — verified property, e.g. `sc-domain:example.com` or `https://www.example.com/`
 * - `GOOGLE_APPLICATION_CREDENTIALS` — path to service account JSON with Search Console access to the property
 * - or `GSC_SERVICE_ACCOUNT_JSON` / `GA4_SERVICE_ACCOUNT_JSON` — inline service account JSON (same shape as key file)
 *
 * Enable **Google Search Console API** for the GCP project that owns the service account.
 */
export class GoogleSearchConsoleConnector implements VisibilityConnector {
  readonly id = 'google_search_console' as const;
  readonly displayName = 'Google Search Console';

  async getHealth(ctx?: ConnectorFetchContext): Promise<ConnectorHealth> {
    const site = ctx ? await resolveGscSiteUrl(ctx.organizationId) : process.env.GSC_SITE_URL?.trim();
    if (!site) {
      return {
        id: this.id,
        displayName: this.displayName,
        configured: false,
        detail: 'Set GSC_SITE_URL to your verified Search Console property.'
      };
    }
    const orgSettings = ctx ? await readOrgConnectorSettings(ctx.organizationId) : null;
    const hasCreds =
      Boolean(orgSettings?.gscServiceAccountJson) ||
      Boolean(orgSettings?.ga4ServiceAccountJson) ||
      Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) ||
      Boolean(process.env.GSC_SERVICE_ACCOUNT_JSON?.trim()) ||
      Boolean(process.env.GA4_SERVICE_ACCOUNT_JSON?.trim());
    if (!hasCreds) {
      return {
        id: this.id,
        displayName: this.displayName,
        configured: true,
        detail:
          'Property URL is set; add GOOGLE_APPLICATION_CREDENTIALS, GSC_SERVICE_ACCOUNT_JSON, or GA4_SERVICE_ACCOUNT_JSON to enable API pulls.'
      };
    }
    return {
      id: this.id,
      displayName: this.displayName,
      configured: true,
      detail:
        'Search Analytics: rolling 28-day totals for clicks and impressions are pulled into visibility signals when the API succeeds.'
    };
  }

  async fetchSignals(ctx: ConnectorFetchContext): Promise<VisibilitySignal[]> {
    void ctx;
    const health = await this.getHealth(ctx);
    if (!health.configured) {
      return [];
    }
    const orgSettings = await readOrgConnectorSettings(ctx.organizationId);
    const hasCreds =
      Boolean(orgSettings.gscServiceAccountJson) ||
      Boolean(orgSettings.ga4ServiceAccountJson) ||
      Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) ||
      Boolean(process.env.GSC_SERVICE_ACCOUNT_JSON?.trim()) ||
      Boolean(process.env.GA4_SERVICE_ACCOUNT_JSON?.trim());
    if (!hasCreds) {
      return [];
    }

    const siteUrl = await resolveGscSiteUrl(ctx.organizationId);
    if (!siteUrl) {
      return [];
    }
    const auth = createGoogleAuth(
      [GSC_SCOPE_READONLY],
      [orgSettings.gscServiceAccountJson, orgSettings.ga4ServiceAccountJson],
      ['GSC_SERVICE_ACCOUNT_JSON', 'GA4_SERVICE_ACCOUNT_JSON']
    );

    try {
      const webmasters = google.webmasters({ version: 'v3', auth });
      const { startDate, endDate, asOf } = rollingGscWindowDays(28);

      const { data } = await webmasters.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate,
          endDate,
          dimensions: [],
          rowLimit: 1
        }
      });

      const row = data.rows?.[0];
      if (!row || typeof row.clicks !== 'number' || typeof row.impressions !== 'number') {
        return [];
      }

      const signals: VisibilitySignal[] = [
        {
          source: this.id,
          metric: 'search_clicks_28d',
          value: row.clicks,
          unit: 'count',
          dimensions: { windowDays: '28' },
          asOf
        },
        {
          source: this.id,
          metric: 'search_impressions_28d',
          value: row.impressions,
          unit: 'count',
          dimensions: { windowDays: '28' },
          asOf
        }
      ];

      if (typeof row.ctr === 'number' && Number.isFinite(row.ctr)) {
        signals.push({
          source: this.id,
          metric: 'search_ctr_28d',
          value: row.ctr,
          unit: 'ratio',
          dimensions: { windowDays: '28' },
          asOf
        });
      }

      if (typeof row.position === 'number' && Number.isFinite(row.position)) {
        signals.push({
          source: this.id,
          metric: 'search_avg_position_28d',
          value: row.position,
          unit: 'position',
          dimensions: { windowDays: '28' },
          asOf
        });
      }

      return signals;
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[GSC connector] searchanalytics.query failed:', err);
      }
      return [];
    }
  }
}
