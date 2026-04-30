import type { ThemeCluster } from '@/lib/analysis/types';
import type { GscIngestionDiagnostics } from '@/lib/ingestion/gscDiagnostics';
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
  /** Present for live Search Console ingestion runs when diagnostics were captured. */
  gscIngestionDiagnostics?: GscIngestionDiagnostics;
  ingestionEvents: string[];
  documents: SourceDocument[];
  triggers: QuestionTrigger[];
  clusters: ThemeCluster[];
};
