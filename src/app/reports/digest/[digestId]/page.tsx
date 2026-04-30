import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import CopyDigestSummary from '../CopyDigestSummary';
import CopyTextButton from '@/app/components/CopyTextButton';
import { resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';
import { formatWeeklyDigestMarkdown } from '@/lib/digest/formatMarkdown';
import { getWeeklyDigestForOrg, weeklyDigestPipelineLabel, weeklyDigestSignalsLabel } from '@/lib/digest/weekly';
import { GAP_OPPORTUNITY_DETAIL_TITLE_THRESHOLD_CHARS } from '@/lib/insights/gap';

function digestTitleSegment(digestId: string): string {
  const id = digestId.trim();
  if (!id) return 'Weekly digest';
  return id.length > 12 ? `Digest ${id.slice(0, 12)}…` : `Digest ${id}`;
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ digestId: string }>;
}): Promise<Metadata> {
  const { digestId } = await params;
  return { title: digestTitleSegment(digestId) };
}

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
      <p className="mt-8">
        Digest id: <code>{digest.id}</code>{' '}
        <CopyTextButton
          text={digest.id}
          label="Copy digest id"
          ariaLabel={`Copy weekly digest id ${digest.id}`}
          className="btn-compact-inline btn-compact-inline-secondary"
        />
      </p>
      <ul className="list-line-relaxed">
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
          <strong>Pipeline documents:</strong> {weeklyDigestPipelineLabel(digest.summary)}
        </li>
        {digest.summary.pipelineGscDiagnosticsSummary ? (
          <li id="gsc-digest-pipeline">
            <strong>GSC ingestion (latest pipeline):</strong>{' '}
            <code className="text-priority-muted">{digest.summary.pipelineGscDiagnosticsSummary}</code>{' '}
            <CopyTextButton
              text={digest.summary.pipelineGscDiagnosticsSummary}
              label="Copy summary"
              ariaLabel="Copy frozen GSC ingestion diagnostics summary"
              className="btn-compact-inline btn-compact-inline-secondary"
            />
          </li>
        ) : null}
        <li>
          <strong>Connector signals:</strong> {weeklyDigestSignalsLabel(digest.summary)}
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
          <ul className="list-line-compact">
            {digest.summary.opportunities.map((o) => (
              <li key={o.id} title={o.detail.length > GAP_OPPORTUNITY_DETAIL_TITLE_THRESHOLD_CHARS ? o.detail : undefined}>
                <strong>{o.title}</strong> <span className="text-priority-muted">[{o.priority}]</span> — {o.detail}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {digest.summary.topics && digest.summary.topics.length > 0 ? (
        <>
          <h2>Topic gaps (frozen at generation)</h2>
          <p className="table-scroll-hint">On smaller screens, swipe horizontally to see all columns.</p>
          <div className="table-scroll-wrap">
            <table className="data-table data-table-min-reports-topics">
            <caption className="sr-only">
              Topic gaps at digest generation: topic (sticky while scrolling), gap score, trigger count, and
              recommendation.
            </caption>
            <thead>
              <tr>
                <th scope="col" className="data-table-th-left data-table-sticky-col">Topic</th>
                <th scope="col" className="data-table-th-right">Gap</th>
                <th scope="col" className="data-table-th-right">Triggers</th>
                <th scope="col" className="data-table-th-left">Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {digest.summary.topics.map((t) => (
                <tr key={t.topic}>
                  <td className="data-table-td data-table-sticky-col">{t.topic}</td>
                  <td className="data-table-td-right">{t.gapScore}</td>
                  <td className="data-table-td-right">{t.triggerCount}</td>
                  <td className="data-table-td">{t.recommendation}</td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </>
      ) : null}
      <p className="mt-8">
        <a href={exportMdHref}>Download Markdown file</a>
      </p>
      <CopyDigestSummary markdown={md} />
    </section>
  );
}
