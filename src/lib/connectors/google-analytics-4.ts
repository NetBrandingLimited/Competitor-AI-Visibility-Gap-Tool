import { google } from 'googleapis';

import { rollingGscWindowDays } from './gsc-date-range';
import { createGoogleAuth } from './google-service-account-auth';
import { readOrgConnectorSettings, resolveGa4PropertyId } from './org-settings';
import type { ConnectorFetchContext, ConnectorHealth, VisibilityConnector, VisibilitySignal } from './types';

const GA4_SCOPE_READONLY = 'https://www.googleapis.com/auth/analytics.readonly';

function hasGoogleServiceCredentials(): boolean {
  return (
    Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) ||
    Boolean(process.env.GSC_SERVICE_ACCOUNT_JSON?.trim()) ||
    Boolean(process.env.GA4_SERVICE_ACCOUNT_JSON?.trim())
  );
}

function hasAnyCredentials(org: { gscServiceAccountJson: string | null; ga4ServiceAccountJson: string | null }): boolean {
  return Boolean(org.ga4ServiceAccountJson) || Boolean(org.gscServiceAccountJson) || hasGoogleServiceCredentials();
}

/**
 * Google Analytics 4 (Data API v1beta).
 *
 * Env:
 * - `GA4_PROPERTY_ID` — numeric property id (Admin → Property settings)
 * - `GOOGLE_APPLICATION_CREDENTIALS` or inline `GSC_SERVICE_ACCOUNT_JSON` / `GA4_SERVICE_ACCOUNT_JSON`
 *
 * Enable **Google Analytics Data API**; grant the service account a Viewer role on the GA4 property.
 */
export class GoogleAnalytics4Connector implements VisibilityConnector {
  readonly id = 'google_analytics_4' as const;
  readonly displayName = 'Google Analytics 4';

  async getHealth(ctx?: ConnectorFetchContext): Promise<ConnectorHealth> {
    const propertyId = ctx ? await resolveGa4PropertyId(ctx.organizationId) : process.env.GA4_PROPERTY_ID?.trim();
    if (!propertyId) {
      return {
        id: this.id,
        displayName: this.displayName,
        configured: false,
        detail: 'Set GA4_PROPERTY_ID to your GA4 property (numeric id).'
      };
    }
    const orgSettings = ctx ? await readOrgConnectorSettings(ctx.organizationId) : null;
    const hasCreds = orgSettings
      ? hasAnyCredentials(orgSettings)
      : hasGoogleServiceCredentials();
    if (!hasCreds) {
      return {
        id: this.id,
        displayName: this.displayName,
        configured: true,
        detail:
          'Property id is set; add GOOGLE_APPLICATION_CREDENTIALS or GSC_SERVICE_ACCOUNT_JSON / GA4_SERVICE_ACCOUNT_JSON for Data API access.'
      };
    }
    return {
      id: this.id,
      displayName: this.displayName,
      configured: true,
      detail:
        'Data API: rolling 28-day totals for sessions, active users, and screen page views when runReport succeeds.'
    };
  }

  async fetchSignals(ctx: ConnectorFetchContext): Promise<VisibilitySignal[]> {
    void ctx;
    const orgSettings = await readOrgConnectorSettings(ctx.organizationId);
    const health = await this.getHealth(ctx);
    const propertyId = await resolveGa4PropertyId(ctx.organizationId);
    if (!health.configured || !propertyId || !hasAnyCredentials(orgSettings)) {
      return [];
    }

    const auth = createGoogleAuth(
      [GA4_SCOPE_READONLY],
      [orgSettings.ga4ServiceAccountJson, orgSettings.gscServiceAccountJson],
      ['GA4_SERVICE_ACCOUNT_JSON', 'GSC_SERVICE_ACCOUNT_JSON']
    );
    const property = `properties/${propertyId}`;

    try {
      const analyticsdata = google.analyticsdata({ version: 'v1beta', auth });
      const { startDate, endDate, asOf } = rollingGscWindowDays(28);

      const { data } = await analyticsdata.properties.runReport({
        property,
        requestBody: {
          dateRanges: [{ startDate, endDate, name: 'primary' }],
          metrics: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'screenPageViews' }],
          limit: '1',
          keepEmptyRows: true
        }
      });

      const headers = data.metricHeaders?.map((h) => h.name ?? '').filter(Boolean) ?? [];
      const row = data.rows?.[0];
      const values = row?.metricValues ?? [];
      if (headers.length === 0 || values.length === 0) {
        return [];
      }

      const metricToKey: Record<string, string> = {
        sessions: 'ga4_sessions_28d',
        activeUsers: 'ga4_active_users_28d',
        screenPageViews: 'ga4_screen_page_views_28d'
      };

      const signals: VisibilitySignal[] = [];
      for (let i = 0; i < Math.min(headers.length, values.length); i++) {
        const name = headers[i];
        const raw = values[i]?.value;
        if (raw == null || !name) {
          continue;
        }
        const value = Number(raw);
        if (!Number.isFinite(value)) {
          continue;
        }
        const metricKey = metricToKey[name];
        if (!metricKey) {
          continue;
        }
        signals.push({
          source: this.id,
          metric: metricKey,
          value,
          unit: 'count',
          dimensions: { windowDays: '28' },
          asOf
        });
      }

      return signals;
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[GA4 connector] runReport failed:', err);
      }
      return [];
    }
  }
}
