import Link from 'next/link';
import { redirect } from 'next/navigation';

import { activeOrgCanEdit, resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';
import { listWeeklyDigests } from '@/lib/digest/weekly';
import { getDashboardSnapshotForOrganization } from '@/lib/org-visibility-mock';
import { prisma } from '@/lib/prisma';
import { readLatestPipelineRun } from '@/lib/pipeline/store';
import { readTrendSnapshots } from '@/lib/trends/store';
import { getLatestVisibilityScore } from '@/lib/visibility/scoreV1';

import VisibilityScoreCard from './VisibilityScoreCard';

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export default async function DashboardPage() {
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
  const snapshot = getDashboardSnapshotForOrganization(
    org
      ? {
          brandName: org.brandName,
          category: org.category,
          competitorA: org.competitorA,
          competitorB: org.competitorB,
          competitorC: org.competitorC
        }
      : {}
  );
  const [latestRun, trendSnapshots, visibility, weeklyDigests] = await Promise.all([
    readLatestPipelineRun(active.organizationId),
    readTrendSnapshots(active.organizationId),
    getLatestVisibilityScore(active.organizationId),
    listWeeklyDigests(active.organizationId)
  ]);
  const latestTrend = trendSnapshots.at(-1) ?? null;
  const latestDigest = weeklyDigests[0] ?? null;

  return (
    <section>
      <h1>Dashboard v1</h1>
      <p>
        Workspace: <strong>{active.organizationName}</strong> · Signed in as{' '}
        <strong>{active.user.email}</strong>
      </p>
      <VisibilityScoreCard
        organizationId={active.organizationId}
        canRecalculate={activeOrgCanEdit(active)}
        latest={
          visibility
            ? {
                score: visibility.score,
                createdAt: visibility.createdAt,
                reasons: visibility.reasons,
                signalSource: visibility.inputs.connectorSignalSource,
                signalCount: visibility.inputs.connectorSignalCount,
                signalsAsOf: visibility.inputs.connectorSignalsAsOf
              }
            : null
        }
      />

      {latestDigest ? (
        <p>
          Latest weekly digest:{' '}
          <Link href={`/reports/digest/${latestDigest.id}`}>
            {latestDigest.periodStart} → {latestDigest.periodEnd}
          </Link>{' '}
          <span style={{ color: '#666' }}>
            ({new Date(latestDigest.generatedAt).toLocaleString()}) ·{' '}
            <a href={`/api/orgs/${active.organizationId}/digest/weekly/${latestDigest.id}/export-md`}>
              Download .md
            </a>
          </span>
        </p>
      ) : (
        <p>
          No weekly digest yet.{' '}
          <Link href="/reports">Generate one from Reports</Link>.
        </p>
      )}

      <p>
        Snapshot below uses your organization&apos;s <strong>Brand</strong> and <strong>Competitors</strong> from{' '}
        <a href="/settings/brand">Brand settings</a>. Optional analytics wiring:{' '}
        <a href="/settings/connectors">Data connectors</a>.
      </p>
      <p>
        Last generated: <code>{snapshot.generatedAt}</code>
      </p>
      {latestRun ? (
        <p>
          Latest unified run: <code>{latestRun.id}</code> ({latestRun.documentCount} docs,{' '}
          {latestRun.triggerCount} triggers, {latestRun.clusterCount} clusters) — query:{' '}
          <code>{latestRun.query}</code>
        </p>
      ) : (
        <p>
          No unified pipeline run for this workspace yet. Run it from{' '}
          <a href="/reports">Reports</a>.
        </p>
      )}
      {latestTrend ? (
        <p>
          Latest trend snapshot: <code>{latestTrend.date}</code> ({latestTrend.totalMentions} mentions, top brand{' '}
          {latestTrend.topBrand})
        </p>
      ) : (
        <p>No trend snapshots for this workspace yet. Run a snapshot from Reports.</p>
      )}

      <h2>Leaderboard</h2>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: 24,
          border: '1px solid #ddd'
        }}
      >
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Brand</th>
            <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ddd' }}>Mentions</th>
            <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ddd' }}>Share of voice</th>
            <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ddd' }}>7d delta</th>
          </tr>
        </thead>
        <tbody>
          {snapshot.leaderboard.map((row) => (
            <tr key={row.brand}>
              <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{row.brand}</td>
              <td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'right' }}>{row.mentions}</td>
              <td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'right' }}>
                {formatPercent(row.shareOfVoice)}
              </td>
              <td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'right' }}>
                {row.delta7d >= 0 ? '+' : ''}
                {formatPercent(row.delta7d)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Recent</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Source</th>
            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Query</th>
            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Top brand</th>
            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Published</th>
          </tr>
        </thead>
        <tbody>
          {snapshot.recent.map((row) => (
            <tr key={`${row.source}-${row.query}`}>
              <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{row.source}</td>
              <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{row.query}</td>
              <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{row.topBrand}</td>
              <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                {new Date(row.publishedAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
