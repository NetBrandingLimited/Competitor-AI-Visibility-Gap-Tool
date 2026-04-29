import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import FreshnessConfigInfo from '@/app/components/FreshnessConfigInfo';
import ComputedSourceAsOfNote from '@/app/components/ComputedSourceAsOfNote';
import FreshnessTimestampListItem from '@/app/components/FreshnessTimestampListItem';
import { activeOrgCanEdit, resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';
import { getFreshnessConfig } from '@/lib/config/freshness';
import { buildPipelineDashboardSnapshot } from '@/lib/dashboard/pipelineSnapshot';
import { readLatestWeeklyDigest } from '@/lib/digest/weekly';
import { buildGapInsightsFromLatestData } from '@/lib/insights/gap';
import { getDashboardSnapshotForOrganization } from '@/lib/org-visibility-mock';
import { prisma } from '@/lib/prisma';
import { readRecentPipelineRuns } from '@/lib/pipeline/store';
import { readLatestTrendSnapshot } from '@/lib/trends/store';
import { FreshnessSectionCard } from '@/lib/ui/freshness';
import { getLatestVisibilityScore } from '@/lib/visibility/scoreV1';

import VisibilityScoreCard from './VisibilityScoreCard';

export const metadata: Metadata = {
  title: 'Dashboard'
};

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

  const [recentRuns, latestTrend, visibility, latestDigest] = await Promise.all([
    readRecentPipelineRuns(active.organizationId, 2),
    readLatestTrendSnapshot(active.organizationId),
    getLatestVisibilityScore(active.organizationId),
    readLatestWeeklyDigest(active.organizationId)
  ]);
  const latestRun = recentRuns[0] ?? null;
  const previousRun = recentRuns[1] ?? null;
  const gapInsights = buildGapInsightsFromLatestData(org, latestRun, latestTrend, visibility);

  const pipelineSnapshot =
    latestRun ? buildPipelineDashboardSnapshot(orgFields, latestRun, previousRun) : null;
  const mockSnapshot = getDashboardSnapshotForOrganization(orgFields);
  const snapshot = pipelineSnapshot ?? mockSnapshot;
  const leaderboardSource: 'pipeline' | 'mock' = pipelineSnapshot ? 'pipeline' : 'mock';
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
                signalCacheKind: visibility.inputs.connectorSignalCacheKind,
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
          <span className="text-priority-muted">
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
        <ul className="list-indent-mt8">
          <FreshnessTimestampListItem
            label="Pipeline run"
            iso={latestRun?.createdAt ?? null}
            thresholds={freshnessThresholds}
            fallbackText="Not run yet"
            showTimestamp={false}
          />
          <FreshnessTimestampListItem
            label="Trend snapshot"
            iso={latestTrend?.generatedAt ?? null}
            thresholds={freshnessThresholds}
            fallbackText="Not generated yet"
            showTimestamp={false}
          />
          <FreshnessTimestampListItem
            label="Visibility score"
            iso={visibility?.createdAt ?? null}
            thresholds={freshnessThresholds}
            fallbackText="Not generated yet"
            showTimestamp={false}
          />
          <FreshnessTimestampListItem
            label="Gap insights"
            iso={gapInsights.upstreamAsOf}
            thresholds={freshnessThresholds}
            fallbackText="No source data yet"
            showTimestamp={false}
          />
          <FreshnessTimestampListItem
            label="Weekly digest"
            iso={latestDigest?.generatedAt ?? null}
            thresholds={freshnessThresholds}
            fallbackText="Not generated yet"
            showTimestamp={false}
          />
        </ul>
      </FreshnessSectionCard>

      <p>
        Tables below use your organization&apos;s <strong>Brand</strong> and <strong>Competitors</strong> from{' '}
        <Link href="/settings/brand">Brand settings</Link>. Optional analytics wiring:{' '}
        <Link href="/settings/connectors">Data connectors</Link>.
      </p>
      <p className={leaderboardSource === 'pipeline' ? 'text-leader-live' : 'text-leader-preview'}>
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
      <ComputedSourceAsOfNote
        computedAtIso={gapInsights.generatedAt}
        sourceAsOfIso={gapInsights.upstreamAsOf}
        className="text-muted-subtle"
      />
      <ul className="mt-8 mb-20">
        {gapInsights.opportunities.slice(0, 3).map((op) => (
          <li key={op.id} className="mb-8">
            <strong>{op.title}</strong> ({op.priority}) — {op.detail}
          </li>
        ))}
      </ul>

      {gapInsights.topics.length > 0 ? (
        <table className="data-table data-table-mb-24">
          <caption className="sr-only">
            Top gap topics: topic, gap score, trigger count, and recommendation.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="data-table-th-left">Topic</th>
              <th scope="col" className="data-table-th-right">Gap score</th>
              <th scope="col" className="data-table-th-right">Trigger count</th>
              <th scope="col" className="data-table-th-left">Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {gapInsights.topics.slice(0, 5).map((topic) => (
              <tr key={topic.topic}>
                <td className="data-table-td">{topic.topic}</td>
                <td className="data-table-td-right">{topic.gapScore}</td>
                <td className="data-table-td-right">{topic.triggerCount}</td>
                <td className="data-table-td">{topic.recommendation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <h2>Leaderboard</h2>
      <table className="data-table data-table-mb-24">
        <caption className="sr-only">
          Brand leaderboard: mentions, share of voice, and{' '}
          {leaderboardSource === 'pipeline' ? 'change versus prior pipeline run' : 'seven-day change'}.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="data-table-th-left">Brand</th>
            <th scope="col" className="data-table-th-right">Mentions</th>
            <th scope="col" className="data-table-th-right">Share of voice</th>
            <th scope="col" className="data-table-th-right">
              {leaderboardSource === 'pipeline' ? 'Δ vs prior run' : '7d delta'}
            </th>
          </tr>
        </thead>
        <tbody>
          {snapshot.leaderboard.map((row) => (
            <tr key={row.brand}>
              <td className="data-table-td">{row.brand}</td>
              <td className="data-table-td-right">{row.mentions}</td>
              <td className="data-table-td-right">{formatPercent(row.shareOfVoice)}</td>
              <td className="data-table-td-right">
                {row.delta7d >= 0 ? '+' : ''}
                {formatPercent(row.delta7d)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Recent</h2>
      <table className="data-table">
        <caption className="sr-only">
          Recent {leaderboardSource === 'pipeline' ? 'pipeline-derived' : 'preview'} rows: source, query, top brand,
          and published time.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="data-table-th-left">Source</th>
            <th scope="col" className="data-table-th-left">Query</th>
            <th scope="col" className="data-table-th-left">Top brand</th>
            <th scope="col" className="data-table-th-left">Published</th>
          </tr>
        </thead>
        <tbody>
          {snapshot.recent.map((row) => (
            <tr key={`${row.source}-${row.query}`}>
              <td className="data-table-td">{row.source}</td>
              <td className="data-table-td">{row.query}</td>
              <td className="data-table-td">{row.topBrand}</td>
              <td className="data-table-td">{new Date(row.publishedAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}






