import { GoogleAnalytics4Connector } from './google-analytics-4';
import { GoogleSearchConsoleConnector } from './google-search-console';
import type { ConnectorFetchContext, ConnectorHealth, VisibilityConnector, VisibilitySignal } from './types';

const connectors: VisibilityConnector[] = [
  new GoogleSearchConsoleConnector(),
  new GoogleAnalytics4Connector()
];

export function listVisibilityConnectors(): VisibilityConnector[] {
  return connectors;
}

export async function getAllConnectorHealth(ctx?: ConnectorFetchContext): Promise<ConnectorHealth[]> {
  return Promise.all(connectors.map((c) => c.getHealth(ctx)));
}

export async function collectAllConnectorSignals(ctx: ConnectorFetchContext): Promise<VisibilitySignal[]> {
  const batches = await Promise.all(connectors.map((c) => c.fetchSignals(ctx)));
  return batches.flat();
}
