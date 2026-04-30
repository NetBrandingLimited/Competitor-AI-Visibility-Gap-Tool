import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import FreshnessConfigInfo from '@/app/components/FreshnessConfigInfo';
import GapOpportunityListItem from '@/app/components/GapOpportunityListItem';
import GapTopicLabelCell from '@/app/components/GapTopicLabelCell';
import GapTopicRecommendationCell from '@/app/components/GapTopicRecommendationCell';
import ComputedSourceAsOfNote from '@/app/components/ComputedSourceAsOfNote';
import FreshnessTimestampListItem from '@/app/components/FreshnessTimestampListItem';
import { activeOrgCanEdit, resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';
import { getFreshnessConfig } from '@/lib/config/freshness';
import { buildPipelineDashboardSnapshot } from '@/lib/dashboard/pipelineSnapshot';
import {
  formatGscIngestionDiagnosticsSummary,
  GSC_SUMMARY_UI_PARAGRAPH_MAX,
  tableCellEllipsisParts
} from '@/lib/ingestion/gscDiagnostics';
import {
  ingestionSourceDisplayLabel,
  pipelineIngestionProvenanceDescription,
  pipelineIngestionProvenanceLabel
} from '@/lib/ingestion/sourceDisplayLabel';
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
  const dashboardLatestRunQueryParts = latestRun ? tableCellEllipsisParts(latestRun.query) : null;
  const dashboardTrendTopBrandParts = latestTrend ? tableCellEllipsisParts(latestTrend.topBrand) : null;
  const previousRun = recentRuns[1] ?? null;
  const gapInsights = buildGapInsightsFromLatestData(org, latestRun, latestTrend, visibility);

  const pipelineSnapshot =
    latestRun ? buildPipelineDashboardSnapshot(orgFields, latestRun, previousRun) : null;
  const mockSnapshot = getDashboardSnapshotForOrganization(orgFields);
  const snapshot = pipelineSnapshot ?? mockSnapshot;
  const leaderboardSource: 'pipeline' | 'mock' = pipelineSnapshot ? 'pipeline' : 'mock';
  const pipelineDocProvenance = latestRun
    ? pipelineIngestionProvenanceDescription(latestRun.ingestionSource)
    : null;
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
                pipelineRunId: visibility.inputs.pipelineRunId,
                pipelineIngestionSource: visibility.inputs.pipelineIngestionSource,
                pipelineGscDiagnosticsSummary: visibility.inputs.pipelineGscDiagnosticsSummary,
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
            {latestDigest.summary.pipelineGscDiagnosticsSummary ? (
              <>
                {' '}
                · GSC:{' '}
                <Link
                  href={`/reports/digest/${latestDigest.id}#gsc-digest-pipeline`}
                  className="text-priority-muted"
                  title={latestDigest.summary.pipelineGscDiagnosticsSummary}
                >
                  {
                    tableCellEllipsisParts(
                      latestDigest.summary.pipelineGscDiagnosticsSummary,
                      GSC_SUMMARY_UI_PARAGRAPH_MAX
                    ).display
                  }
                </Link>
              </>
            ) : null}
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
            {pipelineDocProvenance ? <>{pipelineDocProvenance} </> : null}
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
          <code title={dashboardLatestRunQueryParts?.title}>
            {dashboardLatestRunQueryParts?.display}
          </code>
          {latestRun.ingestionSource ? <> · ingestion: {pipelineIngestionProvenanceLabel(latestRun.ingestionSource)}</> : null}
          {latestRun.gscIngestionDiagnostics ? (
            <>
              {' '}
              · GSC:{' '}
              <Link
                href={`/reports/runs/${latestRun.id}#gsc-diagnostics`}
                className="text-priority-muted"
                title={formatGscIngestionDiagnosticsSummary(latestRun.gscIngestionDiagnostics)}
              >
                {
                  tableCellEllipsisParts(
                    formatGscIngestionDiagnosticsSummary(latestRun.gscIngestionDiagnostics),
                    GSC_SUMMARY_UI_PARAGRAPH_MAX
                  ).display
                }
              </Link>
            </>
          ) : null}
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
          <span title={dashboardTrendTopBrandParts?.title}>{dashboardTrendTopBrandParts?.display}</span>)
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
          <GapOpportunityListItem key={op.id} opportunity={op} className="mb-8" priorityStyle="parens" />
        ))}
      </ul>

      {gapInsights.topics.length > 0 ? (
        <>
          <p className="table-scroll-hint">On smaller screens, swipe horizontally to see all columns.</p>
          <div className="table-scroll-wrap">
            <table className="data-table data-table-mb-24 data-table-min-reports-topics">
          <caption className="sr-only">
            Top gap topics: topic (sticky while scrolling), gap score, trigger count, and recommendation.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="data-table-th-left data-table-sticky-col">Topic</th>
              <th scope="col" className="data-table-th-right">Gap score</th>
              <th scope="col" className="data-table-th-right">Trigger count</th>
              <th scope="col" className="data-table-th-left">Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {gapInsights.topics.slice(0, 5).map((topic) => (
              <tr key={topic.topic}>
                <GapTopicLabelCell topic={topic.topic} className="data-table-td data-table-sticky-col" />
                <td className="data-table-td-right">{topic.gapScore}</td>
                <td className="data-table-td-right">{topic.triggerCount}</td>
                <GapTopicRecommendationCell recommendation={topic.recommendation} />
              </tr>
            ))}
          </tbody>
            </table>
          </div>
        </>
      ) : null}

      <h2>Leaderboard</h2>
      <>
        <p className="table-scroll-hint">On smaller screens, swipe horizontally to see all columns.</p>
        <div className="table-scroll-wrap">
          <table className="data-table data-table-mb-24 data-table-min-dashboard-leaderboard">
        <caption className="sr-only">
          Brand leaderboard: brand (sticky while scrolling), mentions, share of voice, and{' '}
          {leaderboardSource === 'pipeline' ? 'change versus prior pipeline run' : 'seven-day change'}.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="data-table-th-left data-table-sticky-col">Brand</th>
            <th scope="col" className="data-table-th-right">Mentions</th>
            <th scope="col" className="data-table-th-right">Share of voice</th>
            <th scope="col" className="data-table-th-right">
              {leaderboardSource === 'pipeline' ? 'Δ vs prior run' : '7d delta'}
            </th>
          </tr>
        </thead>
        <tbody>
          {snapshot.leaderboard.map((row) => {
            const brandCell = tableCellEllipsisParts(row.brand);
            return (
              <tr key={row.brand}>
                <td className="data-table-td data-table-sticky-col" title={brandCell.title}>
                  {brandCell.display}
                </td>
                <td className="data-table-td-right">{row.mentions}</td>
                <td className="data-table-td-right">{formatPercent(row.shareOfVoice)}</td>
                <td className="data-table-td-right">
                  {row.delta7d >= 0 ? '+' : ''}
                  {formatPercent(row.delta7d)}
                </td>
              </tr>
            );
          })}
        </tbody>
          </table>
        </div>
      </>

      <h2>Recent</h2>
      <>
        <p className="table-scroll-hint">On smaller screens, swipe horizontally to see all columns.</p>
        <div className="table-scroll-wrap">
          <table className="data-table data-table-min-dashboard-recent">
        <caption className="sr-only">
          Recent {leaderboardSource === 'pipeline' ? 'pipeline-derived' : 'preview'} rows: source (sticky while
          scrolling), query, top brand, and published time.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="data-table-th-left data-table-sticky-col">Source</th>
            <th scope="col" className="data-table-th-left">Query</th>
            <th scope="col" className="data-table-th-left">Top brand</th>
            <th scope="col" className="data-table-th-left">Published</th>
          </tr>
        </thead>
        <tbody>
          {snapshot.recent.map((row, index) => {
            const queryCell = tableCellEllipsisParts(row.query);
            const brandCell = tableCellEllipsisParts(row.topBrand);
            return (
            <tr key={`${row.source}-${row.publishedAt}-${index}`}>
              <td className="data-table-td data-table-sticky-col">
                {ingestionSourceDisplayLabel(row.source)}
              </td>
              <td className="data-table-td data-table-td-wrap-break" title={queryCell.title}>
                {queryCell.display}
              </td>
              <td className="data-table-td data-table-td-wrap-break" title={brandCell.title}>
                {brandCell.display}
              </td>
              <td className="data-table-td">{new Date(row.publishedAt).toLocaleString()}</td>
            </tr>
            );
          })}
        </tbody>
          </table>
        </div>
      </>
    </section>
  );
}






