import type { PipelineIngestionSource } from '@/lib/pipeline/types';

import type { ConnectorName } from './types';

const LABELS: Record<ConnectorName, string> = {
  'google_search_console': 'Search Console',
  'reddit-mock': 'Reddit (mock)',
  'hn-mock': 'Hacker News (mock)'
};

/** UI label for pipeline / snapshot `source` strings (falls back to raw value). */
export function ingestionSourceDisplayLabel(source: string): string {
  if (source in LABELS) {
    return LABELS[source as ConnectorName];
  }
  return source;
}

/** Short label for unified pipeline run `ingestionSource` (visibility card, summaries). */
export function pipelineIngestionProvenanceLabel(
  source: PipelineIngestionSource | null | undefined
): string {
  if (source === 'live_gsc_queries') {
    return 'Search Console';
  }
  if (source === 'mock_ingestion') {
    return 'Mock templates';
  }
  return 'Not recorded';
}
