import { resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';
import { readTrendSnapshots } from '@/lib/trends/store';

function escapeCsv(value: string | number): string {
  const raw = String(value);
  // Prevent CSV formula injection when opened in spreadsheet apps.
  const str = /^[=+\-@]/.test(raw) || raw.startsWith('\t') ? `'${raw}` : raw;
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

export async function GET() {
  const active = await resolveActiveOrgSessionForServerComponent();
  if (!active) {
    return new Response('Unauthorized', { status: 401 });
  }

  const snapshots = await readTrendSnapshots(active.organizationId);
  const header = ['date', 'generatedAt', 'totalMentions', 'topBrand', 'topBrandMentions'];
  const rows = snapshots.map((row) =>
    [row.date, row.generatedAt, row.totalMentions, row.topBrand, row.topBrandMentions]
      .map(escapeCsv)
      .join(',')
  );
  const csv = `\uFEFF${[header.join(','), ...rows].join('\n')}`;

  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="visibility-trends.csv"',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  });
}
