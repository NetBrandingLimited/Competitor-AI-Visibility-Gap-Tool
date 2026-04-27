import { runUnifiedPipeline } from '@/lib/pipeline/runUnifiedPipeline';
import type { UnifiedPipelineRun } from '@/lib/pipeline/types';
import { readLatestPipelineRun } from '@/lib/pipeline/store';
import { generateWeeklyDigest } from '@/lib/digest/weekly';
import { isWeeklyDigestDue } from '@/lib/digest/schedule';
import { runTrendsJob } from '@/lib/trends/job';
import { prisma } from '@/lib/prisma';

import { saveSchedulerJob, type SchedulerJobRecord } from './store';

/** Pipeline data older than this is refreshed before digest when org flag is set (digest-only mode). */
const PIPELINE_STALE_MS = 7 * 24 * 60 * 60 * 1000;

export type ScheduledJobMode = 'full' | 'digest-only';

export type RunScheduledJobResult = {
  job: SchedulerJobRecord;
  mode: ScheduledJobMode;
  pipelineRun: UnifiedPipelineRun | null;
  trends: Awaited<ReturnType<typeof runTrendsJob>> | null;
  digest: Awaited<ReturnType<typeof generateWeeklyDigest>> | null;
  digestGenerated: boolean;
  pipelineRefreshedForDigest: boolean;
};

function makeJobId(now: Date): string {
  return `job-${now.getTime()}`;
}

export async function runScheduledJob(
  organizationId: string,
  input?: {
    query?: string;
    limitPerConnector?: number;
    forceWeeklyDigest?: boolean;
    mode?: ScheduledJobMode;
  }
): Promise<RunScheduledJobResult> {
  const started = new Date();
  const explicit = input?.query?.trim();
  const mode: ScheduledJobMode = input?.mode ?? 'full';

  try {
    let pipelineRun: UnifiedPipelineRun | null = null;
    let trends: Awaited<ReturnType<typeof runTrendsJob>> | null = null;
    let pipelineRefreshedForDigest = false;

    const shouldGenerateDigest = input?.forceWeeklyDigest
      ? true
      : await isWeeklyDigestDue(organizationId, started);

    if (mode === 'full') {
      pipelineRun = await runUnifiedPipeline({
        organizationId,
        query: explicit && explicit.length > 0 ? explicit : undefined,
        limitPerConnector: input?.limitPerConnector
      });
      trends = await runTrendsJob(organizationId);
    } else if (shouldGenerateDigest) {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { weeklyDigestRefreshPipelineFirst: true }
      });
      if (org?.weeklyDigestRefreshPipelineFirst) {
        const latest = await readLatestPipelineRun(organizationId);
        const stale =
          !latest ||
          started.getTime() - new Date(latest.createdAt).getTime() > PIPELINE_STALE_MS;
        if (stale) {
          pipelineRun = await runUnifiedPipeline({
            organizationId,
            limitPerConnector: input?.limitPerConnector
          });
          trends = await runTrendsJob(organizationId);
          pipelineRefreshedForDigest = true;
        }
      }
    }

    const digest = shouldGenerateDigest ? await generateWeeklyDigest(organizationId) : null;

    const queryLabel =
      mode === 'digest-only'
        ? shouldGenerateDigest
          ? pipelineRefreshedForDigest
            ? '(digest-only, pipeline refreshed)'
            : '(digest-only)'
          : '(digest-only, skipped — not due)'
        : pipelineRun
          ? pipelineRun.query
          : '(org default)';

    const record: SchedulerJobRecord = {
      id: makeJobId(started),
      startedAt: started.toISOString(),
      completedAt: new Date().toISOString(),
      status: 'success',
      query: queryLabel,
      pipelineRunId: pipelineRun?.id,
      weeklyDigestId: digest?.id
    };
    await saveSchedulerJob(organizationId, record);

    return {
      job: record,
      mode,
      pipelineRun,
      trends,
      digest,
      digestGenerated: Boolean(digest),
      pipelineRefreshedForDigest
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown scheduler error';
    const queryLabel =
      mode === 'digest-only'
        ? '(digest-only)'
        : explicit && explicit.length > 0
          ? explicit
          : '(org default)';
    const record: SchedulerJobRecord = {
      id: makeJobId(started),
      startedAt: started.toISOString(),
      completedAt: new Date().toISOString(),
      status: 'failed',
      query: queryLabel,
      errorMessage: message
    };
    await saveSchedulerJob(organizationId, record);
    throw error;
  }
}
