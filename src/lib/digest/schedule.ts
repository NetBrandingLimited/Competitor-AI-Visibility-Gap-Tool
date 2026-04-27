import { prisma } from '@/lib/prisma';

export async function listOrganizationIdsWithWeeklyDigestScheduleEnabled(): Promise<string[]> {
  const rows = await prisma.organization.findMany({
    where: { weeklyDigestScheduleEnabled: true },
    select: { id: true }
  });
  return rows.map((r) => r.id);
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Returns true when weekly digest should run for this org at the given UTC time.
 * Rules:
 * - schedule must be enabled
 * - current UTC weekday and hour must match configured day/hour
 * - no digest already generated for the current UTC day
 */
export async function isWeeklyDigestDue(organizationId: string, now = new Date()): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      weeklyDigestScheduleEnabled: true,
      weeklyDigestScheduleDayUtc: true,
      weeklyDigestScheduleHourUtc: true
    }
  });
  if (!org?.weeklyDigestScheduleEnabled) {
    return false;
  }

  const day = now.getUTCDay();
  const hour = now.getUTCHours();
  if (day !== org.weeklyDigestScheduleDayUtc || hour !== org.weeklyDigestScheduleHourUtc) {
    return false;
  }

  const dayStart = startOfUtcDay(now);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const existingToday = await prisma.weeklyDigest.findFirst({
    where: {
      organizationId,
      generatedAt: {
        gte: dayStart,
        lt: dayEnd
      }
    },
    select: { id: true }
  });
  if (existingToday) {
    return false;
  }

  // Also guard by period end date if available (idempotence across reruns).
  const today = isoDate(now);
  const existingPeriod = await prisma.weeklyDigest.findFirst({
    where: {
      organizationId,
      periodEnd: today
    },
    select: { id: true }
  });
  return !existingPeriod;
}
