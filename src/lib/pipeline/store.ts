import type { UnifiedPipelineRun } from './types';
import { prisma } from '@/lib/prisma';

function tryParseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function stringify(value: unknown): string {
  return JSON.stringify(value);
}

function rowToRun(row: {
  id: string;
  createdAt: Date;
  query: string;
  limitPerConnector: number;
  documentCount: number;
  triggerCount: number;
  clusterCount: number;
  ingestionEventsRaw: string;
  documentsRaw: string;
  triggersRaw: string;
  clustersRaw: string;
}): UnifiedPipelineRun | null {
  const ingestionEvents = tryParseJson<string[]>(row.ingestionEventsRaw);
  const documents = tryParseJson<UnifiedPipelineRun['documents']>(row.documentsRaw);
  const triggers = tryParseJson<UnifiedPipelineRun['triggers']>(row.triggersRaw);
  const clusters = tryParseJson<UnifiedPipelineRun['clusters']>(row.clustersRaw);
  if (!ingestionEvents || !documents || !triggers || !clusters) {
    return null;
  }
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    query: row.query,
    limitPerConnector: row.limitPerConnector,
    documentCount: row.documentCount,
    triggerCount: row.triggerCount,
    clusterCount: row.clusterCount,
    ingestionEvents,
    documents,
    triggers,
    clusters
  };
}

export async function readPipelineRuns(organizationId: string): Promise<UnifiedPipelineRun[]> {
  const rows = await prisma.pipelineRun.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' }
  });
  return rows.map((row) => rowToRun(row)).filter((r): r is UnifiedPipelineRun => r !== null);
}

export async function savePipelineRun(
  organizationId: string,
  run: UnifiedPipelineRun
): Promise<void> {
  await prisma.pipelineRun.create({
    data: {
      id: run.id,
      organizationId,
      createdAt: new Date(run.createdAt),
      query: run.query,
      limitPerConnector: run.limitPerConnector,
      documentCount: run.documentCount,
      triggerCount: run.triggerCount,
      clusterCount: run.clusterCount,
      ingestionEventsRaw: stringify(run.ingestionEvents),
      documentsRaw: stringify(run.documents),
      triggersRaw: stringify(run.triggers),
      clustersRaw: stringify(run.clusters)
    }
  });

  const stale = await prisma.pipelineRun.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    skip: 25,
    select: { id: true }
  });
  if (stale.length > 0) {
    await prisma.pipelineRun.deleteMany({
      where: { id: { in: stale.map((item) => item.id) } }
    });
  }
}

export async function readLatestPipelineRun(
  organizationId: string
): Promise<UnifiedPipelineRun | null> {
  const run = await prisma.pipelineRun.findFirst({
    where: { organizationId },
    orderBy: { createdAt: 'desc' }
  });
  if (!run) {
    return null;
  }
  return rowToRun(run);
}

export async function readRecentPipelineRuns(
  organizationId: string,
  take: number
): Promise<UnifiedPipelineRun[]> {
  const rows = await prisma.pipelineRun.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take
  });
  return rows.map((row) => rowToRun(row)).filter((r): r is UnifiedPipelineRun => r !== null);
}

export async function readPipelineRunById(
  organizationId: string,
  runId: string
): Promise<UnifiedPipelineRun | null> {
  const run = await prisma.pipelineRun.findFirst({
    where: { organizationId, id: runId }
  });
  if (!run) {
    return null;
  }
  return rowToRun(run);
}
