import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import FreshnessConfigInfo from '@/app/components/FreshnessConfigInfo';
import FreshnessTimestampListItem from '@/app/components/FreshnessTimestampListItem';
import RunActions from './RunActions';
import { resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';
import { getFreshnessConfig } from '@/lib/config/freshness';
import { listWeeklyDigests } from '@/lib/digest/weekly';
import { buildGapInsightsForOrg } from '@/lib/insights/gap';
import { readPipelineRuns } from '@/lib/pipeline/store';
import { readTrendSnapshots } from '@/lib/trends/store';
import { FreshnessSectionCard } from '@/lib/ui/freshness';
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

  const snapshots = await readTrendSnapshots(active.organizationId);
  const pipelineRuns = await readPipelineRuns(active.organizationId);
  const [gapInsights, weeklyDigests] = await Promise.all([
    buildGapInsightsForOrg(active.organizationId),
    listWeeklyDigests(active.organizationId)
  ]);
  const {
    thresholds: { freshHours, agingHours, misconfigured: thresholdsMisconfigured },
    input: freshnessThresholds
  } = getFreshnessConfig();
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
      </p>
      <div className="callout-csv-help">
        <strong>Which CSV should I use?</strong>
        <ul className="list-indent-mt8">
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
            iso={gapInsights.generatedAt}
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
      <RunActions />

      <h2>Competitor gap insights (v1)</h2>
      <p className="text-muted-note">
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
        <table className="data-table data-table-mb-16">
          <caption className="sr-only">
            Topic-level gap breakdown: topic, gap score, trigger hits, cluster weight, and recommendation.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="data-table-th-left">Topic</th>
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
                <td className="data-table-td">{topic.recommendation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Weekly visibility digests</h2>
      {weeklyDigests.length === 0 ? (
        <p>No digest yet. Click &quot;Generate weekly digest&quot; above.</p>
      ) : (
        <table className="data-table data-table-mb-16">
          <caption className="sr-only">
            Weekly visibility digests: link, generated time, period, score, signal source, and top opportunities.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="data-table-th-left">Digest</th>
              <th scope="col" className="data-table-th-left">Generated</th>
              <th scope="col" className="data-table-th-left">Period</th>
              <th scope="col" className="data-table-th-right">Score</th>
              <th scope="col" className="data-table-th-left">Signal source</th>
              <th scope="col" className="data-table-th-left">Top opportunities</th>
            </tr>
          </thead>
          <tbody>
            {weeklyDigests.map((d) => (
              <tr key={d.id}>
                <td className="data-table-td">
                  <Link
                    href={`/reports/digest/${d.id}`}
                    aria-label={`View weekly digest generated ${new Date(d.generatedAt).toLocaleString()} for period ${d.periodStart} to ${d.periodEnd}`}
                  >
                    View
                  </Link>
                </td>
                <td className="data-table-td">{new Date(d.generatedAt).toLocaleString()}</td>
                <td className="data-table-td">
                  {d.periodStart} → {d.periodEnd}
                </td>
                <td className="data-table-td-right">{d.summary.score ?? '—'}</td>
                <td className="data-table-td">{d.summary.signalSource ?? '—'}</td>
                <td className="data-table-td">{d.summary.topOpportunities.join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Stored daily snapshots</h2>
      {snapshots.length === 0 ? (
        <p>No snapshots yet for this workspace. Run the trend snapshot job below.</p>
      ) : (
        <table className="data-table">
          <caption className="sr-only">
            Stored daily trend snapshots: date, total mentions, top brand, and top brand mentions.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="data-table-th-left">Date</th>
              <th scope="col" className="data-table-th-right">Mentions</th>
              <th scope="col" className="data-table-th-left">Top brand</th>
              <th scope="col" className="data-table-th-right">Top brand mentions</th>
            </tr>
          </thead>
          <tbody>
            {snapshots.map((row) => (
              <tr key={row.date}>
                <td className="data-table-td">{row.date}</td>
                <td className="data-table-td-right">{row.totalMentions}</td>
                <td className="data-table-td">{row.topBrand}</td>
                <td className="data-table-td-right">{row.topBrandMentions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 className="mt-24">Unified pipeline runs</h2>
      <p className="text-muted-note-wide">
        Each row is <strong>this workspace only</strong> (not mixed with other accounts). The <strong>Query</strong> is
        built from your saved brand fields when you don&apos;t pass a custom query. <strong>Docs / Triggers / Clusters</strong>{' '}
        are counts from mock ingestion plus on-device heuristics (not live Google or AI answers). New runs rotate mock
        document wording by run id so trigger and cluster counts can differ between runs even with the same query.
      </p>
      {pipelineRuns.length === 0 ? (
        <p>No runs yet for this workspace. Run the unified pipeline below.</p>
      ) : (
        <table className="data-table">
          <caption className="sr-only">
            Unified pipeline runs for this workspace: run id, created time, query, document, trigger, and cluster counts.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="data-table-th-left">Run id</th>
              <th scope="col" className="data-table-th-left">Created</th>
              <th scope="col" className="data-table-th-left">Query</th>
              <th scope="col" className="data-table-th-right">Docs</th>
              <th scope="col" className="data-table-th-right">Triggers</th>
              <th scope="col" className="data-table-th-right">Clusters</th>
            </tr>
          </thead>
          <tbody>
            {pipelineRuns.map((run) => (
              <tr key={run.id}>
                <td className="data-table-td">
                  <Link
                    href={`/reports/runs/${run.id}`}
                    aria-label={`Open pipeline run ${run.id} created ${new Date(run.createdAt).toLocaleString()}`}
                  >
                    {run.id}
                  </Link>
                </td>
                <td className="data-table-td-nowrap">{new Date(run.createdAt).toLocaleString()}</td>
                <td className="data-table-td">{run.query}</td>
                <td className="data-table-td-right">{run.documentCount}</td>
                <td className="data-table-td-right">{run.triggerCount}</td>
                <td className="data-table-td-right">{run.clusterCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}








