import { pipelineIngestionProvenanceLabel } from '@/lib/ingestion/sourceDisplayLabel';
import type { PipelineIngestionSource } from '@/lib/pipeline/types';
import type { SchedulerJobRecord } from '@/lib/scheduler/store';

import { buildCsvDocument } from './csv';

export function buildSchedulerJobsCsv(
  jobs: SchedulerJobRecord[],
  digestSignalLabels: Record<string, string>,
  pipelineIngestionSources: Record<string, PipelineIngestionSource | undefined>,
  /** Pre-formatted GSC ingestion summary per pipeline run id (same string as pipeline runs CSV). */
  pipelineRunGscDiagnosticsSummaries: Record<string, string> = {},
  /** Frozen `pipelineGscDiagnosticsSummary` from weekly digest JSON when the job linked a digest. */
  weeklyDigestGscDiagnosticsSummaries: Record<string, string> = {}
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
    'pipelineRunGscDiagnosticsSummary',
    'weeklyDigestId',
    'digestSignals',
    'weeklyDigestGscDiagnosticsSummary',
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
    job.pipelineRunId ? pipelineRunGscDiagnosticsSummaries[job.pipelineRunId] ?? '' : '',
    job.weeklyDigestId ?? '',
    job.weeklyDigestId ? digestSignalLabels[job.weeklyDigestId] ?? '' : '',
    job.weeklyDigestId ? weeklyDigestGscDiagnosticsSummaries[job.weeklyDigestId] ?? '' : '',
    job.errorMessage ?? ''
  ]);

  return buildCsvDocument(header, rows);
}
