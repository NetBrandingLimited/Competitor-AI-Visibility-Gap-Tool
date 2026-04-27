/**
 * Adapter layer for external visibility / analytics sources (GSC, GA4, etc.).
 * Implementations may be stubs until OAuth / service accounts are wired.
 */

export type ConnectorId = 'google_search_console' | 'google_analytics_4';

export type ConnectorHealth = {
  id: ConnectorId;
  displayName: string;
  configured: boolean;
  /** Human-readable setup hint when not configured. */
  detail?: string;
};

/** Normalized signal for scoring / dashboards (extensible). */
export type VisibilitySignal = {
  source: ConnectorId;
  metric: string;
  value: number;
  /** e.g. "clicks", "sessions" */
  unit?: string;
  dimensions?: Record<string, string>;
  asOf: string;
};

export type ConnectorFetchContext = {
  organizationId: string;
};

/**
 * Every real connector implements this contract.
 * GSC / GA4 clients plug in here without touching pipeline or UI directly.
 */
export interface VisibilityConnector {
  readonly id: ConnectorId;
  readonly displayName: string;
  getHealth(ctx?: ConnectorFetchContext): Promise<ConnectorHealth>;
  /** Pull latest numeric signals for scoring (may be empty when not authenticated). */
  fetchSignals(ctx: ConnectorFetchContext): Promise<VisibilitySignal[]>;
}
