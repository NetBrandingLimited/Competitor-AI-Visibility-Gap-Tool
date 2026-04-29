import type { ThemeCluster } from '@/lib/analysis/types';
import type { SourceDocument } from '@/lib/ingestion/types';
import type { QuestionTrigger } from '@/lib/analysis/types';

/** Persisted on {@link UnifiedPipelineRun} / `PipelineRun.ingestionSource`. */
export type PipelineIngestionSource = 'live_gsc_queries' | 'mock_ingestion';

export type UnifiedPipelineRun = {
  id: string;
  createdAt: string;
  query: string;
  limitPerConnector: number;
  documentCount: number;
  triggerCount: number;
  clusterCount: number;
  /** How documents were sourced; omitted on legacy runs (treat as unknown / mock-era). */
  ingestionSource?: PipelineIngestionSource;
  ingestionEvents: string[];
  documents: SourceDocument[];
  triggers: QuestionTrigger[];
  clusters: ThemeCluster[];
};
