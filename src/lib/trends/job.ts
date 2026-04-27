import { getDashboardSnapshotForOrganization } from '@/lib/org-visibility-mock';
import { prisma } from '@/lib/prisma';
import { computeAndPersistVisibilityScoreV1 } from '@/lib/visibility/scoreV1';

import { readTrendSnapshots, type TrendSnapshot, writeTrendSnapshots } from './store';

function toDateKey(input: Date): string {
  return input.toISOString().slice(0, 10);
}

export async function runTrendsJob(
  organizationId: string,
  now = new Date()
): Promise<{
  snapshot: TrendSnapshot;
  stored: 'created' | 'updated';
  totalSnapshots: number;
}> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      brandName: true,
      category: true,
      competitorA: true,
      competitorB: true,
      competitorC: true
    }
  });
  const dashboard = getDashboardSnapshotForOrganization(
    org
      ? {
          brandName: org.brandName,
          category: org.category,
          competitorA: org.competitorA,
          competitorB: org.competitorB,
          competitorC: org.competitorC
        }
      : {},
    now
  );
  const totalMentions = dashboard.leaderboard.reduce((sum, row) => sum + row.mentions, 0);
  const top = dashboard.leaderboard[0];

  const snapshot: TrendSnapshot = {
    date: toDateKey(now),
    generatedAt: now.toISOString(),
    totalMentions,
    topBrand: top?.brand ?? 'Unknown',
    topBrandMentions: top?.mentions ?? 0
  };

  const existing = await readTrendSnapshots(organizationId);
  const index = existing.findIndex((item) => item.date === snapshot.date);
  const stored: 'created' | 'updated' = index >= 0 ? 'updated' : 'created';

  if (index >= 0) {
    existing[index] = snapshot;
  } else {
    existing.push(snapshot);
  }

  existing.sort((a, b) => a.date.localeCompare(b.date));
  await writeTrendSnapshots(organizationId, existing);

  try {
    await computeAndPersistVisibilityScoreV1(organizationId);
  } catch {
    // visibility score must not fail the trend job
  }

  return { snapshot, stored, totalSnapshots: existing.length };
}
