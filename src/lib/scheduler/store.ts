import { prisma } from '@/lib/prisma';

export type SchedulerJobRecord = {
  id: string;
  startedAt: string;
  completedAt: string;
  status: 'success' | 'failed';
  query: string;
  pipelineRunId?: string;
  weeklyDigestId?: string;
  errorMessage?: string;
};

export async function readSchedulerJobs(organizationId: string): Promise<SchedulerJobRecord[]> {
  const rows = await prisma.schedulerJob.findMany({
    where: { organizationId },
    orderBy: { completedAt: 'desc' }
  });
  return rows.map((row) => ({
    id: row.id,
    startedAt: row.startedAt.toISOString(),
    completedAt: row.completedAt.toISOString(),
    status: row.status === 'failed' ? 'failed' : 'success',
    query: row.query,
    pipelineRunId: row.pipelineRunId ?? undefined,
    weeklyDigestId: row.weeklyDigestId ?? undefined,
    errorMessage: row.errorMessage ?? undefined
  }));
}

export async function saveSchedulerJob(
  organizationId: string,
  record: SchedulerJobRecord
): Promise<void> {
  await prisma.schedulerJob.create({
    data: {
      id: record.id,
      organizationId,
      startedAt: new Date(record.startedAt),
      completedAt: new Date(record.completedAt),
      status: record.status,
      query: record.query,
      pipelineRunId: record.pipelineRunId ?? null,
      weeklyDigestId: record.weeklyDigestId ?? null,
      errorMessage: record.errorMessage ?? null
    }
  });

  const stale = await prisma.schedulerJob.findMany({
    where: { organizationId },
    orderBy: { completedAt: 'desc' },
    skip: 50,
    select: { id: true }
  });
  if (stale.length > 0) {
    await prisma.schedulerJob.deleteMany({
      where: { id: { in: stale.map((item) => item.id) } }
    });
  }
}
