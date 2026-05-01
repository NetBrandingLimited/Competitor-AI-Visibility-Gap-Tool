import type { NextRequest } from 'next/server';

import { resolveActiveOrgSessionForRequest } from '@/lib/active-org';
import { parseWeeklyDigestSummaryJson, weeklyDigestSignalsLabel } from '@/lib/digest/weekly';
import { formatGscIngestionDiagnosticsSummary, parseGscIngestionDiagnosticsRaw } from '@/lib/ingestion/gscDiagnostics';
import { buildDownloadHeaders } from '@/lib/http/downloadHeaders';
import type { PipelineIngestionSource } from '@/lib/pipeline/types';
import { prisma } from '@/lib/prisma';
import { buildSchedulerJobsCsv } from '@/lib/reports/schedulerJobsCsv';
import { readSchedulerJobs } from '@/lib/scheduler/store';

export async function GET(request: NextRequest) {
  const active = await resolveActiveOrgSessionForRequest(request);
  if (!active) {
    return new Response('Unauthorized', { status: 401 });
  }

  const jobs = await readSchedulerJobs(active.organizationId);
  const digestIds = Array.from(
    new Set(jobs.map((job) => job.weeklyDigestId).filter((id): id is string => Boolean(id)))
  );
  const digestRows = digestIds.length
    ? await prisma.weeklyDigest.findMany({
        where: { organizationId: active.organizationId, id: { in: digestIds } },
        select: { id: true, summaryJson: true }
      })
    : [];

  const digestSignalLabels: Record<string, string> = {};
  const weeklyDigestGscDiagnosticsSummaries: Record<string, string> = {};
  for (const row of digestRows) {
    const summary = parseWeeklyDigestSummaryJson(row.summaryJson);
    digestSignalLabels[row.id] = weeklyDigestSignalsLabel(summary);
    const gscDigest = summary.pipelineGscDiagnosticsSummary?.trim();
    if (gscDigest) {
      weeklyDigestGscDiagnosticsSummaries[row.id] = gscDigest;
    }
  }

  const pipelineRunIds = Array.from(
    new Set(jobs.map((job) => job.pipelineRunId).filter((id): id is string => Boolean(id)))
  );
  const pipelineRows = pipelineRunIds.length
    ? await prisma.pipelineRun.findMany({
        where: { organizationId: active.organizationId, id: { in: pipelineRunIds } },
        select: { id: true, ingestionSource: true, gscIngestionDiagnosticsRaw: true }
      })
    : [];

  const pipelineIngestionSources: Record<string, PipelineIngestionSource | undefined> = Object.fromEntries(
    pipelineRows.map((row) => [
      row.id,
      row.ingestionSource === 'live_gsc_queries' || row.ingestionSource === 'mock_ingestion'
        ? row.ingestionSource
        : undefined
    ])
  );

  const pipelineRunGscDiagnosticsSummaries: Record<string, string> = {};
  for (const row of pipelineRows) {
    const parsed = parseGscIngestionDiagnosticsRaw(row.gscIngestionDiagnosticsRaw);
    if (parsed) {
      pipelineRunGscDiagnosticsSummaries[row.id] = formatGscIngestionDiagnosticsSummary(parsed);
    }
  }

  const csv = buildSchedulerJobsCsv(
    jobs,
    digestSignalLabels,
    pipelineIngestionSources,
    pipelineRunGscDiagnosticsSummaries,
    weeklyDigestGscDiagnosticsSummaries
  );

  return new Response(csv, {
    headers: buildDownloadHeaders('text/csv; charset=utf-8', 'scheduler-jobs.csv')
  });
}
