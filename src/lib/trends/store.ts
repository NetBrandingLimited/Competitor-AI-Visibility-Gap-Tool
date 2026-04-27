import { prisma } from '@/lib/prisma';

export type TrendSnapshot = {
  date: string; // YYYY-MM-DD
  generatedAt: string;
  totalMentions: number;
  topBrand: string;
  topBrandMentions: number;
};

export async function readTrendSnapshots(organizationId: string): Promise<TrendSnapshot[]> {
  const rows = await prisma.trendSnapshot.findMany({
    where: { organizationId },
    orderBy: { date: 'asc' }
  });
  return rows.map((row) => ({
    date: row.date,
    generatedAt: row.generatedAt.toISOString(),
    totalMentions: row.totalMentions,
    topBrand: row.topBrand,
    topBrandMentions: row.topBrandMentions
  }));
}

export async function writeTrendSnapshots(
  organizationId: string,
  snapshots: TrendSnapshot[]
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.trendSnapshot.deleteMany({ where: { organizationId } });
    if (snapshots.length === 0) {
      return;
    }
    await tx.trendSnapshot.createMany({
      data: snapshots.map((item) => ({
        id: `${organizationId}:${item.date}`,
        organizationId,
        date: item.date,
        generatedAt: new Date(item.generatedAt),
        totalMentions: item.totalMentions,
        topBrand: item.topBrand,
        topBrandMentions: item.topBrandMentions
      }))
    });
  });
}
