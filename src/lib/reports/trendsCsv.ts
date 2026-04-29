import type { TrendSnapshot } from '@/lib/trends/store';

function escapeCsv(value: string | number): string {
  const raw = String(value);
  // Prevent CSV formula injection when opened in spreadsheet apps.
  const str = /^[=+\-@]/.test(raw) || raw.startsWith('\t') ? `'${raw}` : raw;
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

export function buildTrendsCsv(snapshots: TrendSnapshot[]): string {
  const header = ['date', 'generatedAt', 'totalMentions', 'topBrand', 'topBrandMentions'];
  const rows = snapshots.map((row) =>
    [row.date, row.generatedAt, row.totalMentions, row.topBrand, row.topBrandMentions]
      .map(escapeCsv)
      .join(',')
  );
  return `\uFEFF${[header.join(','), ...rows].join('\n')}`;
}
