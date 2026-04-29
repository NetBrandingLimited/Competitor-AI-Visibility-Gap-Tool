import { pipelineIngestionProvenanceLabel } from '@/lib/ingestion/sourceDisplayLabel';
import type { PipelineIngestionSource } from '@/lib/pipeline/types';
import type { SchedulerJobRecord } from '@/lib/scheduler/store';

import { buildCsvDocument } from './csv';

export function buildSchedulerJobsCsv(
  jobs: SchedulerJobRecord[],
  digestSignalLabels: Record<string, string>,
  pipelineIngestionSources: Record<string, PipelineIngestionSource | undefined>
): string {
  const header = [
    'id',
    'startedAt',
    'completedAt',
    'status',
    'query',
    'pipelineRunId',
    'pipelineDocs',
    'pipelineIngestionSource',
    'weeklyDigestId',
    'digestSignals',
    'errorMessage'
  ];

  const rows = jobs.map((job) => [
    job.id,
    job.startedAt,
    job.completedAt,
    job.status,
    job.query,
    job.pipelineRunId ?? '',
    job.pipelineRunId ? pipelineIngestionProvenanceLabel(pipelineIngestionSources[job.pipelineRunId]) : '',
    job.pipelineRunId ? pipelineIngestionSources[job.pipelineRunId] ?? '' : '',
    job.weeklyDigestId ?? '',
    job.weeklyDigestId ? digestSignalLabels[job.weeklyDigestId] ?? '' : '',
    job.errorMessage ?? ''
  ]);

  return buildCsvDocument(header, rows);
}
