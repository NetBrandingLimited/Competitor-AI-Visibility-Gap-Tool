import Link from 'next/link';
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
import { tableBase, tableWithMarginBottom, tdCell, tdCellNowrap, tdCellRight, thLeft, thRight } from '@/lib/ui/tableStyles';
import { prisma } from '@/lib/prisma';

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

      <div className="panel-box" style={{ marginBottom: 20 }}>
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
      <FreshnessSectionCard>
        <FreshnessConfigInfo
          freshHours={freshHours}
          agingHours={agingHours}
          misconfigured={thresholdsMisconfigured}
        />
        <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
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
        <table style={tableWithMarginBottom(16)}>
          <thead>
            <tr>
              <th style={thLeft}>Topic</th>
              <th style={thRight}>Gap score</th>
              <th style={thRight}>Trigger hits</th>
              <th style={thRight}>Cluster weight</th>
              <th style={thLeft}>Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {gapInsights.topics.map((topic) => (
              <tr key={topic.topic}>
                <td style={tdCell}>{topic.topic}</td>
                <td style={tdCellRight}>{topic.gapScore}</td>
                <td style={tdCellRight}>{topic.triggerCount}</td>
                <td style={tdCellRight}>{topic.clusterWeight}</td>
                <td style={tdCell}>{topic.recommendation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Weekly visibility digests</h2>
      {weeklyDigests.length === 0 ? (
        <p>No digest yet. Click &quot;Generate weekly digest&quot; above.</p>
      ) : (
        <table style={tableWithMarginBottom(16)}>
          <thead>
            <tr>
              <th style={thLeft}>Digest</th>
              <th style={thLeft}>Generated</th>
              <th style={thLeft}>Period</th>
              <th style={thRight}>Score</th>
              <th style={thLeft}>Signal source</th>
              <th style={thLeft}>Top opportunities</th>
            </tr>
          </thead>
          <tbody>
            {weeklyDigests.map((d) => (
              <tr key={d.id}>
                <td style={tdCell}>
                  <Link href={`/reports/digest/${d.id}`}>View</Link>
                </td>
                <td style={tdCell}>{new Date(d.generatedAt).toLocaleString()}</td>
                <td style={tdCell}>
                  {d.periodStart} → {d.periodEnd}
                </td>
                <td style={tdCellRight}>{d.summary.score ?? '—'}</td>
                <td style={tdCell}>{d.summary.signalSource ?? '—'}</td>
                <td style={tdCell}>{d.summary.topOpportunities.join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Stored daily snapshots</h2>
      {snapshots.length === 0 ? (
        <p>No snapshots yet for this workspace. Run the trend snapshot job below.</p>
      ) : (
        <table style={tableBase}>
          <thead>
            <tr>
              <th style={thLeft}>Date</th>
              <th style={thRight}>Mentions</th>
              <th style={thLeft}>Top brand</th>
              <th style={thRight}>Top brand mentions</th>
            </tr>
          </thead>
          <tbody>
            {snapshots.map((row) => (
              <tr key={row.date}>
                <td style={tdCell}>{row.date}</td>
                <td style={tdCellRight}>{row.totalMentions}</td>
                <td style={tdCell}>{row.topBrand}</td>
                <td style={tdCellRight}>{row.topBrandMentions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 style={{ marginTop: 24 }}>Unified pipeline runs</h2>
      <p className="text-muted-note-wide">
        Each row is <strong>this workspace only</strong> (not mixed with other accounts). The <strong>Query</strong> is
        built from your saved brand fields when you don&apos;t pass a custom query. <strong>Docs / Triggers / Clusters</strong>{' '}
        are counts from mock ingestion plus on-device heuristics (not live Google or AI answers). New runs rotate mock
        document wording by run id so trigger and cluster counts can differ between runs even with the same query.
      </p>
      {pipelineRuns.length === 0 ? (
        <p>No runs yet for this workspace. Run the unified pipeline below.</p>
      ) : (
        <table style={tableBase}>
          <thead>
            <tr>
              <th style={thLeft}>Run id</th>
              <th style={thLeft}>Created</th>
              <th style={thLeft}>Query</th>
              <th style={thRight}>Docs</th>
              <th style={thRight}>Triggers</th>
              <th style={thRight}>Clusters</th>
            </tr>
          </thead>
          <tbody>
            {pipelineRuns.map((run) => (
              <tr key={run.id}>
                <td style={tdCell}>
                  <Link href={`/reports/runs/${run.id}`}>{run.id}</Link>
                </td>
                <td style={tdCellNowrap}>{new Date(run.createdAt).toLocaleString()}</td>
                <td style={tdCell}>{run.query}</td>
                <td style={tdCellRight}>{run.documentCount}</td>
                <td style={tdCellRight}>{run.triggerCount}</td>
                <td style={tdCellRight}>{run.clusterCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}








