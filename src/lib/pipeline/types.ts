import type { ThemeCluster } from '@/lib/analysis/types';
import type { SourceDocument } from '@/lib/ingestion/types';
import type { QuestionTrigger } from '@/lib/analysis/types';

export type UnifiedPipelineRun = {
  id: string;
  createdAt: string;
  query: string;
  limitPerConnector: number;
  documentCount: number;
  triggerCount: number;
  clusterCount: number;
  ingestionEvents: string[];
  documents: SourceDocument[];
  triggers: QuestionTrigger[];
  clusters: ThemeCluster[];
};
