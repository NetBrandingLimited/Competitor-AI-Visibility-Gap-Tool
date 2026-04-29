import type { TrendSnapshot } from '@/lib/trends/store';
import { buildCsvDocument } from './csv';

export function buildTrendsCsv(snapshots: TrendSnapshot[]): string {
  const header = ['date', 'generatedAt', 'totalMentions', 'topBrand', 'topBrandMentions'];
  const rows = snapshots.map((row) =>
    [row.date, row.generatedAt, row.totalMentions, row.topBrand, row.topBrandMentions]
  );
  return buildCsvDocument(header, rows);
}
