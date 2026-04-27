import { resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';
import { readTrendSnapshots } from '@/lib/trends/store';

function escapeCsv(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
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
  const csv = [header.join(','), ...rows].join('\n');

  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="visibility-trends.csv"'
    }
  });
}
