import Link from 'next/link';
import { redirect } from 'next/navigation';

import RunActions from './RunActions';
import { resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';
import { getFreshnessThresholds } from '@/lib/config/freshness';
import { listWeeklyDigests } from '@/lib/digest/weekly';
import { buildGapInsightsForOrg } from '@/lib/insights/gap';
import { readPipelineRuns } from '@/lib/pipeline/store';
import { readTrendSnapshots } from '@/lib/trends/store';
import { prisma } from '@/lib/prisma';

function display(value: string | null | undefined): string {
  const t = value?.trim();
  return t && t.length > 0 ? t : '—';
}

const { freshHours: FRESH_HOURS, agingHours: AGING_HOURS, misconfigured: THRESHOLDS_MISCONFIGURED } =
  getFreshnessThresholds();

function freshnessFor(iso: string | null): { label: 'Fresh' | 'Aging' | 'Stale' | 'Missing'; color: string } {
  if (!iso) {
    return { label: 'Missing', color: '#6b7280' };
  }
  const ageMs = Date.now() - new Date(iso).getTime();
  if (ageMs <= FRESH_HOURS * 60 * 60 * 1000) {
    return { label: 'Fresh', color: '#166534' };
  }
  if (ageMs <= AGING_HOURS * 60 * 60 * 1000) {
    return { label: 'Aging', color: '#a16207' };
  }
  return { label: 'Stale', color: '#b91c1c' };
}

function freshnessBadge(iso: string | null) {
  const info = freshnessFor(iso);
  return (
    <span
      style={{
        marginLeft: 8,
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        color: '#fff',
        background: info.color
      }}
    >
      {info.label}
    </span>
  );
}

function formatAge(iso: string | null): string {
  if (!iso) {
    return 'no data';
  }
  const deltaMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    return 'just now';
  }
  const mins = Math.floor(deltaMs / 60000);
  if (mins < 1) {
    return 'just now';
  }
  if (mins < 60) {
    return `${mins}m ago`;
  }
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default async function ReportsPage() {
  const active = await resolveActiveOrgSessionForServerComponent();
  if (!active) {
    redirect('/login');
  }

  const org = await prisma.organization.findUnique({
    where: { id: active.organizationId },
    select: {
      brandName: true,
      category: true,
      competitorA: true,
      competitorB: true,
      competitorC: true
    }
  });

  const snapshots = await readTrendSnapshots(active.organizationId);
  const pipelineRuns = await readPipelineRuns(active.organizationId);
  const [gapInsights, weeklyDigests] = await Promise.all([
    buildGapInsightsForOrg(active.organizationId),
    listWeeklyDigests(active.organizationId)
  ]);
  const latestSnapshot = snapshots.at(-1) ?? null;
  const latestPipelineRun = pipelineRuns[0] ?? null;
  const latestDigest = weeklyDigests[0] ?? null;

  return (
    <section>
      <h1>Report Builder (Baseline)</h1>
      <p>
        Workspace: <strong>{active.organizationName}</strong>
      </p>
      <p>
        Daily snapshots and pipeline runs use your organization&apos;s brand and competitors from{' '}
        <Link href="/settings/brand">Brand settings</Link>. Update those fields, then run the jobs again to refresh
        numbers and queries.
      </p>

      <div
        style={{
          marginBottom: 20,
          padding: 12,
          border: '1px solid #ddd',
          borderRadius: 6,
          background: '#fafafa'
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>Tracking profile (saved on organization)</h2>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>
            <strong>Brand name:</strong> {display(org?.brandName)}
          </li>
          <li>
            <strong>Category:</strong> {display(org?.category)}
          </li>
          <li>
            <strong>Competitor A:</strong> {display(org?.competitorA)}
          </li>
          <li>
            <strong>Competitor B:</strong> {display(org?.competitorB)}
          </li>
          <li>
            <strong>Competitor C:</strong> {display(org?.competitorC)}
          </li>
        </ul>
      </div>

      <p>Export CSV is scoped to this workspace only.</p>
      <p>
        <Link href="/api/reports/export.csv">Download full report CSV</Link>
        {' | '}
        <Link href="/api/reports/trends.csv">Download trends-only CSV</Link>
        {' | '}
        <Link href="/api/reports/pipeline-runs.csv">Download pipeline runs CSV</Link>
      </p>
      <div
        style={{
          marginBottom: 16,
          padding: 10,
          border: '1px solid #e5e7eb',
          borderRadius: 6,
          background: '#fcfcfd',
          color: '#374151'
        }}
      >
        <strong>Which CSV should I use?</strong>
        <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
          <li>
            <code>full report CSV</code>: trends + gap opportunities + topic recommendations in one file.
          </li>
          <li>
            <code>trends-only CSV</code>: legacy trend schema for existing imports/dashboards.
          </li>
          <li>
            <code>pipeline runs CSV</code>: per-run operational metrics (docs, triggers, clusters, query).
          </li>
        </ul>
      </div>
      <div
        style={{
          marginBottom: 16,
          padding: 10,
          border: '1px solid #e5e7eb',
          borderRadius: 6,
          background: '#f8fafc',
          color: '#374151'
        }}
      >
        <strong>Data freshness</strong>
        <p style={{ marginTop: 8, marginBottom: 8, fontSize: 12, color: '#6b7280' }}>
          Thresholds: Fresh ≤ {FRESH_HOURS}h, Aging ≤ {AGING_HOURS}h, otherwise Stale.
        </p>
        {THRESHOLDS_MISCONFIGURED ? (
          <p
            style={{
              marginTop: 8,
              marginBottom: 8,
              color: '#b91c1c',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 6,
              padding: '8px 10px',
              maxWidth: 760
            }}
          >
            Warning: <code>AGING_HOURS</code> is lower than <code>FRESH_HOURS</code>. Set
            <code> AGING_HOURS &gt;= FRESH_HOURS</code> to keep freshness labels consistent.
          </p>
        ) : null}
        <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
          <li>
            <code>Pipeline run</code>:{' '}
            {latestPipelineRun ? new Date(latestPipelineRun.createdAt).toLocaleString() : 'Not run yet'}
            <span style={{ marginLeft: 6, color: '#6b7280' }}>({formatAge(latestPipelineRun?.createdAt ?? null)})</span>
            {freshnessBadge(latestPipelineRun?.createdAt ?? null)}
          </li>
          <li>
            <code>Trend snapshot</code>:{' '}
            {latestSnapshot ? new Date(latestSnapshot.generatedAt).toLocaleString() : 'Not generated yet'}
            <span style={{ marginLeft: 6, color: '#6b7280' }}>({formatAge(latestSnapshot?.generatedAt ?? null)})</span>
            {freshnessBadge(latestSnapshot?.generatedAt ?? null)}
          </li>
          <li>
            <code>Gap insights</code>: {new Date(gapInsights.generatedAt).toLocaleString()}
            <span style={{ marginLeft: 6, color: '#6b7280' }}>({formatAge(gapInsights.generatedAt)})</span>
            {freshnessBadge(gapInsights.generatedAt)}
          </li>
          <li>
            <code>Weekly digest</code>: {latestDigest ? new Date(latestDigest.generatedAt).toLocaleString() : 'Not generated yet'}
            <span style={{ marginLeft: 6, color: '#6b7280' }}>({formatAge(latestDigest?.generatedAt ?? null)})</span>
            {freshnessBadge(latestDigest?.generatedAt ?? null)}
          </li>
        </ul>
      </div>
      <RunActions />

      <h2>Competitor gap insights (v1)</h2>
      <p style={{ color: '#444', fontSize: 14 }}>
        Auto-generated opportunities from latest pipeline triggers/clusters, trend leader, and visibility score.
      </p>
      <ul>
        {gapInsights.opportunities.map((item) => (
          <li key={item.id}>
            <strong>{item.title}</strong> [{item.priority}] — {item.detail}
          </li>
        ))}
      </ul>
      <h3>Topic-level gap breakdown</h3>
      {gapInsights.topics.length === 0 ? (
        <p>No topic breakdown available yet. Run the unified pipeline first.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd', marginBottom: 16 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Topic</th>
              <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ddd' }}>Gap score</th>
              <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ddd' }}>Trigger hits</th>
              <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ddd' }}>Cluster weight</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {gapInsights.topics.map((topic) => (
              <tr key={topic.topic}>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{topic.topic}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'right' }}>{topic.gapScore}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'right' }}>{topic.triggerCount}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'right' }}>{topic.clusterWeight}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{topic.recommendation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Weekly visibility digests</h2>
      {weeklyDigests.length === 0 ? (
        <p>No digest yet. Click &quot;Generate weekly digest&quot; above.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd', marginBottom: 16 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Digest</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Generated</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Period</th>
              <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ddd' }}>Score</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Signal source</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Top opportunities</th>
            </tr>
          </thead>
          <tbody>
            {weeklyDigests.map((d) => (
              <tr key={d.id}>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                  <Link href={`/reports/digest/${d.id}`}>View</Link>
                </td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                  {new Date(d.generatedAt).toLocaleString()}
                </td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                  {d.periodStart} → {d.periodEnd}
                </td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'right' }}>
                  {d.summary.score ?? '—'}
                </td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{d.summary.signalSource ?? '—'}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                  {d.summary.topOpportunities.join(', ') || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Stored daily snapshots</h2>
      {snapshots.length === 0 ? (
        <p>No snapshots yet for this workspace. Run the trend snapshot job below.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Date</th>
              <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ddd' }}>Mentions</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Top brand</th>
              <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ddd' }}>
                Top brand mentions
              </th>
            </tr>
          </thead>
          <tbody>
            {snapshots.map((row) => (
              <tr key={row.date}>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{row.date}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'right' }}>
                  {row.totalMentions}
                </td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{row.topBrand}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'right' }}>
                  {row.topBrandMentions}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 style={{ marginTop: 24 }}>Unified pipeline runs</h2>
      <p style={{ fontSize: 14, color: '#444', maxWidth: 720 }}>
        Each row is <strong>this workspace only</strong> (not mixed with other accounts). The <strong>Query</strong> is
        built from your saved brand fields when you don&apos;t pass a custom query. <strong>Docs / Triggers / Clusters</strong>{' '}
        are counts from mock ingestion plus on-device heuristics (not live Google or AI answers). New runs rotate mock
        document wording by run id so trigger and cluster counts can differ between runs even with the same query.
      </p>
      {pipelineRuns.length === 0 ? (
        <p>No runs yet for this workspace. Run the unified pipeline below.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Run id</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Created</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Query</th>
              <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ddd' }}>Docs</th>
              <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ddd' }}>Triggers</th>
              <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ddd' }}>Clusters</th>
            </tr>
          </thead>
          <tbody>
            {pipelineRuns.map((run) => (
              <tr key={run.id}>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                  <Link href={`/reports/runs/${run.id}`}>{run.id}</Link>
                </td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee', whiteSpace: 'nowrap' }}>
                  {new Date(run.createdAt).toLocaleString()}
                </td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{run.query}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'right' }}>
                  {run.documentCount}
                </td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'right' }}>
                  {run.triggerCount}
                </td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'right' }}>
                  {run.clusterCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
