import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import CopyTextButton from '@/app/components/CopyTextButton';
import GapOpportunityListItem from '@/app/components/GapOpportunityListItem';
import GapTopicRecommendationCell from '@/app/components/GapTopicRecommendationCell';
import FreshnessConfigInfo from '@/app/components/FreshnessConfigInfo';
import ComputedSourceAsOfNote from '@/app/components/ComputedSourceAsOfNote';
import FreshnessTimestampListItem from '@/app/components/FreshnessTimestampListItem';
import RunActions from './RunActions';
import { resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';
import { getFreshnessConfig } from '@/lib/config/freshness';
import { listWeeklyDigests, weeklyDigestPipelineLabel, weeklyDigestSignalsLabel } from '@/lib/digest/weekly';
import {
  ellipsisGscDiagnosticsSummaryForUi,
  formatGscIngestionDiagnosticsSummary,
  GSC_SUMMARY_UI_TABLE_MAX
} from '@/lib/ingestion/gscDiagnostics';
import { pipelineIngestionProvenanceLabel } from '@/lib/ingestion/sourceDisplayLabel';
import { buildGapInsightsFromLatestData } from '@/lib/insights/gap';
import { readPipelineRuns } from '@/lib/pipeline/store';
import { readTrendSnapshots } from '@/lib/trends/store';
import { FreshnessSectionCard } from '@/lib/ui/freshness';
import { getLatestVisibilityScore } from '@/lib/visibility/scoreV1';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'Reports'
};

function display(value: string | null | undefined): string {
  const t = value?.trim();
  return t && t.length > 0 ? t : '—';
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

  const [snapshots, pipelineRuns, weeklyDigests, visibility] = await Promise.all([
    readTrendSnapshots(active.organizationId),
    readPipelineRuns(active.organizationId),
    listWeeklyDigests(active.organizationId),
    getLatestVisibilityScore(active.organizationId)
  ]);
  const {
    thresholds: { freshHours, agingHours, misconfigured: thresholdsMisconfigured },
    input: freshnessThresholds
  } = getFreshnessConfig();
  const latestSnapshot = snapshots.at(-1) ?? null;
  const latestPipelineRun = pipelineRuns[0] ?? null;
  const latestDigest = weeklyDigests[0] ?? null;
  const gapInsights = buildGapInsightsFromLatestData(org, latestPipelineRun, latestSnapshot, visibility);

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

      <div className="panel-box mb-20">
        <h2 className="heading-panel">Tracking profile (saved on organization)</h2>
        <ul className="list-indent">
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
        {' | '}
        <Link href="/api/reports/weekly-digests.csv">Download weekly digests CSV</Link>
      </p>
      <div className="callout-csv-help">
        <strong>Which CSV should I use?</strong>
        <ul className="list-indent-mt8">
          <li>
            <code>full report CSV</code>: trends + gap opportunities + topic recommendations + latest weekly digest
            provenance + a <code>visibility_score</code> row (score, pipeline source, GSC summary, run id) when a snapshot
            exists. For <code>gap_opportunity</code> rows with a pipeline GSC line, <code>visibilityPipelineRunId</code>{' '}
            holds the linked run id (other trailing visibility columns stay empty on those rows).
          </li>
          <li>
            <code>trends-only CSV</code>: legacy trend schema for existing imports/dashboards.
          </li>
          <li>
            <code>pipeline runs CSV</code>: per-run operational metrics (docs, triggers, clusters, query, ingestion
            source).
          </li>
          <li>
            <code>weekly digests CSV</code>: per-digest summary rows (score, connector signal mode, pipeline
            document provenance label + raw source, frozen <code>pipelineGscDiagnosticsSummary</code> when present, and
            top opportunity headlines).
          </li>
        </ul>
      </div>
      <FreshnessSectionCard>
        <FreshnessConfigInfo
          freshHours={freshHours}
          agingHours={agingHours}
          misconfigured={thresholdsMisconfigured}
        />
        <ul className="list-indent-mt8">
          <FreshnessTimestampListItem
            label="Pipeline run"
            iso={latestPipelineRun?.createdAt ?? null}
            thresholds={freshnessThresholds}
            fallbackText="Not run yet"
          />
          <FreshnessTimestampListItem
            label="Trend snapshot"
            iso={latestSnapshot?.generatedAt ?? null}
            thresholds={freshnessThresholds}
            fallbackText="Not generated yet"
          />
          <FreshnessTimestampListItem
            label="Gap insights"
            iso={gapInsights.upstreamAsOf}
            thresholds={freshnessThresholds}
            fallbackText="No source data yet"
          />
          <FreshnessTimestampListItem
            label="Visibility score"
            iso={visibility?.createdAt ?? null}
            thresholds={freshnessThresholds}
            fallbackText="Not generated yet"
          />
          <FreshnessTimestampListItem
            label="Weekly digest"
            iso={latestDigest?.generatedAt ?? null}
            thresholds={freshnessThresholds}
            fallbackText="Not generated yet"
          />
        </ul>
      </FreshnessSectionCard>
      {visibility ? (
        <p className="text-muted-note mb-8">
          Latest visibility score: <strong>{Math.round(visibility.score)}</strong> (updated{' '}
          {new Date(visibility.createdAt).toLocaleString()}) ·{' '}
          {pipelineIngestionProvenanceLabel(visibility.inputs.pipelineIngestionSource)}
          {visibility.inputs.pipelineGscDiagnosticsSummary && visibility.inputs.pipelineRunId ? (
            <>
              {' · '}
              <Link
                href={`/reports/runs/${visibility.inputs.pipelineRunId}#gsc-diagnostics`}
                className="text-priority-muted"
                title={visibility.inputs.pipelineGscDiagnosticsSummary}
              >
                GSC:{' '}
                {ellipsisGscDiagnosticsSummaryForUi(
                  visibility.inputs.pipelineGscDiagnosticsSummary,
                  GSC_SUMMARY_UI_TABLE_MAX
                )}
              </Link>
            </>
          ) : null}
          {' · '}
          <Link href={`/api/orgs/${active.organizationId}/visibility`} target="_blank" rel="noopener noreferrer">
            Visibility JSON
          </Link>
          {' · '}
          <Link href="/dashboard">Recalculate on dashboard</Link>
        </p>
      ) : (
        <p className="text-muted-note mb-8">
          No visibility score yet. Run the pipeline and trend snapshot from the buttons below, then{' '}
          <Link href="/dashboard">open the dashboard</Link> to recalculate the score.
        </p>
      )}
      <RunActions />

      <h2>Competitor gap insights (v1)</h2>
      <p className="text-muted-note">
        Auto-generated opportunities from latest pipeline triggers/clusters, trend leader, and visibility score.
      </p>
      <ComputedSourceAsOfNote
        computedAtIso={gapInsights.generatedAt}
        sourceAsOfIso={gapInsights.upstreamAsOf}
        className="text-muted-subtle"
      />
      <ul>
        {gapInsights.opportunities.map((item) => (
          <GapOpportunityListItem key={item.id} opportunity={item} priorityStyle="brackets" />
        ))}
      </ul>
      <h3>Topic-level gap breakdown</h3>
      {gapInsights.topics.length === 0 ? (
        <p>No topic breakdown available yet. Run the unified pipeline first.</p>
      ) : (
        <>
          <p className="table-scroll-hint">On smaller screens, swipe horizontally to see all columns.</p>
          <div className="table-scroll-wrap">
            <table className="data-table data-table-mb-16 data-table-min-reports-topics">
          <caption className="sr-only">
            Topic-level gap breakdown: topic (sticky while scrolling), gap score, trigger hits, cluster weight, and
            recommendation.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="data-table-th-left data-table-sticky-col">Topic</th>
              <th scope="col" className="data-table-th-right">Gap score</th>
              <th scope="col" className="data-table-th-right">Trigger hits</th>
              <th scope="col" className="data-table-th-right">Cluster weight</th>
              <th scope="col" className="data-table-th-left">Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {gapInsights.topics.map((topic) => (
              <tr key={topic.topic}>
                <td className="data-table-td">{topic.topic}</td>
                <td className="data-table-td-right">{topic.gapScore}</td>
                <td className="data-table-td-right">{topic.triggerCount}</td>
                <td className="data-table-td-right">{topic.clusterWeight}</td>
                <GapTopicRecommendationCell recommendation={topic.recommendation} />
              </tr>
            ))}
          </tbody>
            </table>
          </div>
        </>
      )}

      <h2>Weekly visibility digests</h2>
      {weeklyDigests.length === 0 ? (
        <p>No digest yet. Click &quot;Generate weekly digest&quot; above.</p>
      ) : (
        <>
          <p className="table-scroll-hint">On smaller screens, swipe horizontally to see all columns.</p>
          <div className="table-scroll-wrap">
            <table className="data-table data-table-mb-16 data-table-min-reports-scroll">
          <caption className="sr-only">
            Weekly visibility digests: digest id (open detail or copy id), generated time, period, score, connector signals
            label, pipeline document source, frozen GSC ingestion summary when present, and top opportunities.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="data-table-th-left data-table-sticky-col data-table-sticky-col-id">
                Digest id
              </th>
              <th scope="col" className="data-table-th-left">Generated</th>
              <th scope="col" className="data-table-th-left">Period</th>
              <th scope="col" className="data-table-th-right">Score</th>
              <th scope="col" className="data-table-th-left">Connector signals</th>
              <th scope="col" className="data-table-th-left">Pipeline docs</th>
              <th scope="col" className="data-table-th-left">GSC (pipeline)</th>
              <th scope="col" className="data-table-th-left">Top opportunities</th>
            </tr>
          </thead>
          <tbody>
            {weeklyDigests.map((d) => {
              const topOpportunitiesJoined = d.summary.topOpportunities.join(', ');
              return (
              <tr key={d.id}>
                <td className="data-table-td data-table-sticky-col data-table-sticky-col-id">
                  <div className="inline-run-id-cell">
                    <Link
                      href={`/reports/digest/${d.id}`}
                      aria-label={`View weekly digest ${d.id} generated ${new Date(d.generatedAt).toLocaleString()} for period ${d.periodStart} to ${d.periodEnd}`}
                    >
                      {d.id}
                    </Link>
                    <CopyTextButton
                      text={d.id}
                      label="Copy id"
                      ariaLabel={`Copy weekly digest id ${d.id}`}
                      className="btn-compact-inline btn-compact-inline-secondary"
                    />
                  </div>
                </td>
                <td className="data-table-td">{new Date(d.generatedAt).toLocaleString()}</td>
                <td className="data-table-td">
                  {d.periodStart} → {d.periodEnd}
                </td>
                <td className="data-table-td-right">{d.summary.score ?? '—'}</td>
                <td className="data-table-td">{weeklyDigestSignalsLabel(d.summary)}</td>
                <td className="data-table-td">{weeklyDigestPipelineLabel(d.summary)}</td>
                <td className="data-table-td data-table-td-wrap-break">
                  {d.summary.pipelineGscDiagnosticsSummary ? (
                    <Link
                      href={`/reports/digest/${d.id}#gsc-digest-pipeline`}
                      className="text-priority-muted"
                      title={d.summary.pipelineGscDiagnosticsSummary}
                    >
                      {ellipsisGscDiagnosticsSummaryForUi(
                        d.summary.pipelineGscDiagnosticsSummary,
                        GSC_SUMMARY_UI_TABLE_MAX
                      )}
                    </Link>
                  ) : (
                    '—'
                  )}
                </td>
                <td
                  className="data-table-td"
                  title={
                    d.summary.topOpportunities.length > 0 &&
                    topOpportunitiesJoined.length > GSC_SUMMARY_UI_TABLE_MAX
                      ? topOpportunitiesJoined
                      : undefined
                  }
                >
                  {d.summary.topOpportunities.length === 0
                    ? '—'
                    : ellipsisGscDiagnosticsSummaryForUi(
                        topOpportunitiesJoined,
                        GSC_SUMMARY_UI_TABLE_MAX
                      )}
                </td>
              </tr>
              );
            })}
          </tbody>
            </table>
          </div>
        </>
      )}

      <h2>Stored daily snapshots</h2>
      {snapshots.length === 0 ? (
        <p>No snapshots yet for this workspace. Run the trend snapshot job below.</p>
      ) : (
        <>
          <p className="table-scroll-hint">On smaller screens, swipe horizontally to see all columns.</p>
          <div className="table-scroll-wrap">
            <table className="data-table data-table-min-reports-snapshots">
          <caption className="sr-only">
            Stored daily trend snapshots: date (sticky while scrolling), total mentions, top brand, and top brand
            mentions.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="data-table-th-left data-table-sticky-col">Date</th>
              <th scope="col" className="data-table-th-right">Mentions</th>
              <th scope="col" className="data-table-th-left">Top brand</th>
              <th scope="col" className="data-table-th-right">Top brand mentions</th>
            </tr>
          </thead>
          <tbody>
            {snapshots.map((row) => (
              <tr key={row.date}>
                <td className="data-table-td data-table-sticky-col">{row.date}</td>
                <td className="data-table-td-right">{row.totalMentions}</td>
                <td className="data-table-td">{row.topBrand}</td>
                <td className="data-table-td-right">{row.topBrandMentions}</td>
              </tr>
            ))}
          </tbody>
            </table>
          </div>
        </>
      )}

      <h2 className="mt-24">Unified pipeline runs</h2>
      <p className="text-muted-note-wide">
        Each row is <strong>this workspace only</strong> (not mixed with other accounts). The <strong>Query</strong> is
        built from your saved brand fields when you don&apos;t pass a custom query. <strong>Docs</strong> come from{' '}
        Google Search Console query rows when the workspace has GSC configured and the API returns data; otherwise mock
        templates are used. <strong>Triggers / Clusters</strong> are always derived on-device from document text (not
        live AI answers). Mock runs still rotate wording by run id so counts can differ between runs with the same query.
      </p>
      {pipelineRuns.length === 0 ? (
        <p>No runs yet for this workspace. Run the unified pipeline below.</p>
      ) : (
        <>
          <p className="table-scroll-hint">On smaller screens, swipe horizontally to see all columns.</p>
          <div className="table-scroll-wrap">
            <table className="data-table data-table-min-reports-scroll">
          <caption className="sr-only">
            Unified pipeline runs for this workspace: run id (open detail or copy id), created time, query, document,
            trigger, and cluster counts.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="data-table-th-left data-table-sticky-col data-table-sticky-col-id">
                Run id
              </th>
              <th scope="col" className="data-table-th-left">Created</th>
              <th scope="col" className="data-table-th-left">Query</th>
              <th scope="col" className="data-table-th-left">Ingestion</th>
              <th scope="col" className="data-table-th-right">Docs</th>
              <th scope="col" className="data-table-th-right">Triggers</th>
              <th scope="col" className="data-table-th-right">Clusters</th>
            </tr>
          </thead>
          <tbody>
            {pipelineRuns.map((run) => (
              <tr key={run.id}>
                <td className="data-table-td data-table-sticky-col data-table-sticky-col-id">
                  <div className="inline-run-id-cell">
                    <Link
                      href={`/reports/runs/${run.id}`}
                      aria-label={`Open pipeline run ${run.id} created ${new Date(run.createdAt).toLocaleString()}`}
                    >
                      {run.id}
                    </Link>
                    <CopyTextButton
                      text={run.id}
                      label="Copy id"
                      className="btn-compact-inline btn-compact-inline-secondary"
                      ariaLabel={`Copy pipeline run id ${run.id}`}
                    />
                  </div>
                </td>
                <td className="data-table-td-nowrap">{new Date(run.createdAt).toLocaleString()}</td>
                <td className="data-table-td">{run.query}</td>
                <td className="data-table-td data-table-td-wrap-break">
                  <div>{pipelineIngestionProvenanceLabel(run.ingestionSource)}</div>
                  {run.gscIngestionDiagnostics ? (
                    <div className="mt-4">
                      <Link
                        href={`/reports/runs/${run.id}#gsc-diagnostics`}
                        className="text-priority-muted"
                        title={formatGscIngestionDiagnosticsSummary(run.gscIngestionDiagnostics)}
                      >
                        GSC:{' '}
                        {ellipsisGscDiagnosticsSummaryForUi(
                          formatGscIngestionDiagnosticsSummary(run.gscIngestionDiagnostics),
                          GSC_SUMMARY_UI_TABLE_MAX
                        )}
                      </Link>
                    </div>
                  ) : null}
                </td>
                <td className="data-table-td-right">{run.documentCount}</td>
                <td className="data-table-td-right">{run.triggerCount}</td>
                <td className="data-table-td-right">{run.clusterCount}</td>
              </tr>
            ))}
          </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}








