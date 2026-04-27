import Link from 'next/link';
import { redirect } from 'next/navigation';

import FreshnessConfigInfo from '@/app/components/FreshnessConfigInfo';
import { activeOrgCanEdit, resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';
import { getFreshnessConfig } from '@/lib/config/freshness';
import { buildPipelineDashboardSnapshot } from '@/lib/dashboard/pipelineSnapshot';
import { listWeeklyDigests } from '@/lib/digest/weekly';
import { buildGapInsightsForOrg } from '@/lib/insights/gap';
import { getDashboardSnapshotForOrganization } from '@/lib/org-visibility-mock';
import { prisma } from '@/lib/prisma';
import { readRecentPipelineRuns } from '@/lib/pipeline/store';
import { readTrendSnapshots } from '@/lib/trends/store';
import {
  FreshnessLine,
  FreshnessSectionCard
} from '@/lib/ui/freshness';
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
  const orgFields = org
    ? {
        brandName: org.brandName,
        category: org.category,
        competitorA: org.competitorA,
        competitorB: org.competitorB,
        competitorC: org.competitorC
      }
    : {};

  const [recentRuns, trendSnapshots, visibility, weeklyDigests, gapInsights] = await Promise.all([
    readRecentPipelineRuns(active.organizationId, 2),
    readTrendSnapshots(active.organizationId),
    getLatestVisibilityScore(active.organizationId),
    listWeeklyDigests(active.organizationId),
    buildGapInsightsForOrg(active.organizationId)
  ]);
  const latestRun = recentRuns[0] ?? null;
  const previousRun = recentRuns[1] ?? null;

  const pipelineSnapshot =
    latestRun ? buildPipelineDashboardSnapshot(orgFields, latestRun, previousRun) : null;
  const mockSnapshot = getDashboardSnapshotForOrganization(orgFields);
  const snapshot = pipelineSnapshot ?? mockSnapshot;
  const leaderboardSource: 'pipeline' | 'mock' = pipelineSnapshot ? 'pipeline' : 'mock';
  const latestTrend = trendSnapshots.at(-1) ?? null;
  const latestDigest = weeklyDigests[0] ?? null;
  const { thresholds, input: freshnessThresholds } = getFreshnessConfig();

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
      <FreshnessSectionCard>
        <FreshnessConfigInfo
          freshHours={thresholds.freshHours}
          agingHours={thresholds.agingHours}
          misconfigured={thresholds.misconfigured}
        />
        <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
          <li>
            Pipeline run:{' '}
            <FreshnessLine iso={latestRun?.createdAt ?? null} thresholds={freshnessThresholds} />
          </li>
          <li>
            Trend snapshot:{' '}
            <FreshnessLine iso={latestTrend?.generatedAt ?? null} thresholds={freshnessThresholds} />
          </li>
          <li>
            Visibility score:{' '}
            <FreshnessLine iso={visibility?.createdAt ?? null} thresholds={freshnessThresholds} />
          </li>
          <li>
            Weekly digest:{' '}
            <FreshnessLine iso={latestDigest?.generatedAt ?? null} thresholds={freshnessThresholds} />
          </li>
        </ul>
      </FreshnessSectionCard>

      <p>
        Tables below use your organization&apos;s <strong>Brand</strong> and <strong>Competitors</strong> from{' '}
        <a href="/settings/brand">Brand settings</a>. Optional analytics wiring:{' '}
        <a href="/settings/connectors">Data connectors</a>.
      </p>
      <p style={{ color: leaderboardSource === 'pipeline' ? '#0f5132' : '#664d03' }}>
        {leaderboardSource === 'pipeline' ? (
          <>
            <strong>Live data</strong> from your latest pipeline run (mention counts in ingested text).{' '}
            {previousRun ? (
              <>Share-of-voice change vs the prior run is shown in the last column.</>
            ) : (
              <>Run the pipeline again to populate the &quot;vs prior run&quot; column.</>
            )}
          </>
        ) : (
          <>
            <strong>Preview data</strong> — set brand and competitors, run the unified pipeline from{' '}
            <Link href="/reports">Reports</Link>, then refresh to see mention counts from real documents.
          </>
        )}
      </p>
      <p>
        Last generated: <code>{snapshot.generatedAt}</code>
      </p>
      {latestRun ? (
        <p>
          Latest unified run:{' '}
          <Link href={`/reports/runs/${latestRun.id}`}>
            <code>{latestRun.id}</code>
          </Link>{' '}
          ({latestRun.documentCount} docs, {latestRun.triggerCount} triggers, {latestRun.clusterCount} clusters) — query:{' '}
          <code>{latestRun.query}</code>
        </p>
      ) : (
        <p>
          No unified pipeline run for this workspace yet. Run it from{' '}
          <Link href="/reports">Reports</Link>.
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

      <h2>Gap opportunities</h2>
      <p style={{ color: '#555' }}>
        Generated <code>{new Date(gapInsights.generatedAt).toLocaleString()}</code> from latest run, trend, and
        visibility signals.
      </p>
      <ul style={{ marginTop: 8, marginBottom: 20 }}>
        {gapInsights.opportunities.slice(0, 3).map((op) => (
          <li key={op.id} style={{ marginBottom: 8 }}>
            <strong>{op.title}</strong> ({op.priority}) — {op.detail}
          </li>
        ))}
      </ul>

      {gapInsights.topics.length > 0 ? (
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
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Topic</th>
              <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ddd' }}>Gap score</th>
              <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ddd' }}>Trigger count</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {gapInsights.topics.slice(0, 5).map((topic) => (
              <tr key={topic.topic}>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{topic.topic}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'right' }}>{topic.gapScore}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'right' }}>
                  {topic.triggerCount}
                </td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{topic.recommendation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

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
            <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ddd' }}>
              {leaderboardSource === 'pipeline' ? 'Δ vs prior run' : '7d delta'}
            </th>
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






