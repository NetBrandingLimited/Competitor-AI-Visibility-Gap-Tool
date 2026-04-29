import { resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';
import { buildDownloadHeaders } from '@/lib/http/downloadHeaders';
import { listWeeklyDigests, weeklyDigestPipelineLabel, weeklyDigestSignalsLabel } from '@/lib/digest/weekly';

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

  const digests = await listWeeklyDigests(active.organizationId);
  const header = [
    'id',
    'generatedAt',
    'periodStart',
    'periodEnd',
    'score',
    'connectorSignals',
    'pipelineDocs',
    'pipelineIngestionSource',
    'topOpportunities'
  ];
  const rows = digests.map((digest) =>
    [
      digest.id,
      digest.generatedAt,
      digest.periodStart,
      digest.periodEnd,
      digest.summary.score ?? '',
      weeklyDigestSignalsLabel(digest.summary),
      weeklyDigestPipelineLabel(digest.summary),
      digest.summary.pipelineIngestionSource ?? '',
      digest.summary.topOpportunities.join(' | ')
    ]
      .map(escapeCsv)
      .join(',')
  );
  const csv = `\uFEFF${[header.join(','), ...rows].join('\n')}`;

  return new Response(csv, {
    headers: buildDownloadHeaders('text/csv; charset=utf-8', 'weekly-digests.csv')
  });
}
