import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import CopyDigestSummary from '../CopyDigestSummary';
import { resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';
import { formatWeeklyDigestMarkdown } from '@/lib/digest/formatMarkdown';
import { getWeeklyDigestForOrg } from '@/lib/digest/weekly';

export default async function WeeklyDigestDetailPage({
  params
}: {
  params: Promise<{ digestId: string }>;
}) {
  const { digestId } = await params;
  const active = await resolveActiveOrgSessionForServerComponent();
  if (!active) {
    redirect('/login');
  }

  const digest = await getWeeklyDigestForOrg(active.organizationId, digestId);
  if (!digest) {
    notFound();
  }

  const generatedLabel = new Date(digest.generatedAt).toLocaleString();
  const md = formatWeeklyDigestMarkdown({
    orgName: active.organizationName,
    periodStart: digest.periodStart,
    periodEnd: digest.periodEnd,
    generatedAt: generatedLabel,
    summary: digest.summary
  });
  const exportMdHref = `/api/orgs/${active.organizationId}/digest/weekly/${digest.id}/export-md`;

  return (
    <section>
      <p>
        <Link href="/reports">← Reports</Link>
      </p>
      <h1>Weekly digest</h1>
      <p>
        Workspace: <strong>{active.organizationName}</strong>
      </p>
      <ul style={{ lineHeight: 1.6 }}>
        <li>
          <strong>Period:</strong> {digest.periodStart} → {digest.periodEnd}
        </li>
        <li>
          <strong>Generated:</strong> {generatedLabel}
        </li>
        <li>
          <strong>Visibility score:</strong> {digest.summary.score ?? '—'}
        </li>
        <li>
          <strong>Connector signal source:</strong> {digest.summary.signalSource ?? '—'}
        </li>
        {digest.summary.insightsGeneratedAt ? (
          <li>
            <strong>Gap insights captured:</strong> {digest.summary.insightsGeneratedAt}
          </li>
        ) : null}
      </ul>
      <h2>Top opportunities (snapshot)</h2>
      {digest.summary.topOpportunities.length === 0 ? (
        <p>None recorded for this digest.</p>
      ) : (
        <ul>
          {digest.summary.topOpportunities.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
      {digest.summary.opportunities && digest.summary.opportunities.length > 0 ? (
        <>
          <h2>All opportunities (frozen at generation)</h2>
          <ul style={{ lineHeight: 1.5 }}>
            {digest.summary.opportunities.map((o) => (
              <li key={o.id}>
                <strong>{o.title}</strong> <span style={{ color: '#666' }}>[{o.priority}]</span> — {o.detail}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {digest.summary.topics && digest.summary.topics.length > 0 ? (
        <>
          <h2>Topic gaps (frozen at generation)</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Topic</th>
                <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ddd' }}>Gap</th>
                <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ddd' }}>Triggers</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {digest.summary.topics.map((t) => (
                <tr key={t.topic}>
                  <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{t.topic}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'right' }}>{t.gapScore}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'right' }}>
                    {t.triggerCount}
                  </td>
                  <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{t.recommendation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
      <p style={{ marginTop: 8 }}>
        <a href={exportMdHref}>Download Markdown file</a>
      </p>
      <CopyDigestSummary markdown={md} />
    </section>
  );
}
