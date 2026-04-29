import { resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';
import { parseWeeklyDigestSummaryJson, weeklyDigestSignalsLabel } from '@/lib/digest/weekly';
import { buildDownloadHeaders } from '@/lib/http/downloadHeaders';
import type { PipelineIngestionSource } from '@/lib/pipeline/types';
import { prisma } from '@/lib/prisma';
import { buildSchedulerJobsCsv } from '@/lib/reports/schedulerJobsCsv';
import { readSchedulerJobs } from '@/lib/scheduler/store';

export async function GET() {
  const active = await resolveActiveOrgSessionForServerComponent();
  if (!active) {
    return new Response('Unauthorized', { status: 401 });
  }

  const jobs = await readSchedulerJobs(active.organizationId);
  const digestIds = Array.from(
    new Set(jobs.map((job) => job.weeklyDigestId).filter((id): id is string => Boolean(id)))
  );
  const digestSignalLabels = digestIds.length
    ? Object.fromEntries(
        (
          await prisma.weeklyDigest.findMany({
            where: { organizationId: active.organizationId, id: { in: digestIds } },
            select: { id: true, summaryJson: true }
          })
        ).map((row) => [row.id, weeklyDigestSignalsLabel(parseWeeklyDigestSummaryJson(row.summaryJson))])
      )
    : {};

  const pipelineRunIds = Array.from(
    new Set(jobs.map((job) => job.pipelineRunId).filter((id): id is string => Boolean(id)))
  );
  const pipelineIngestionSources: Record<string, PipelineIngestionSource | undefined> = pipelineRunIds.length
    ? Object.fromEntries(
        (
          await prisma.pipelineRun.findMany({
            where: { organizationId: active.organizationId, id: { in: pipelineRunIds } },
            select: { id: true, ingestionSource: true }
          })
        ).map((row) => [
          row.id,
          row.ingestionSource === 'live_gsc_queries' || row.ingestionSource === 'mock_ingestion'
            ? row.ingestionSource
            : undefined
        ])
      )
    : {};

  const csv = buildSchedulerJobsCsv(jobs, digestSignalLabels, pipelineIngestionSources);

  return new Response(csv, {
    headers: buildDownloadHeaders('text/csv; charset=utf-8', 'scheduler-jobs.csv')
  });
}
