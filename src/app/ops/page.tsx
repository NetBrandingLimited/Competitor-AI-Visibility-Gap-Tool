import Link from 'next/link';
import type { Metadata } from 'next';

import CopyTextButton from '@/app/components/CopyTextButton';
import EllipsisAccessible from '@/app/components/EllipsisAccessible';
import EllipsisStrong from '@/app/components/EllipsisStrong';
import FreshnessConfigInfo from '@/app/components/FreshnessConfigInfo';
import RunSchedulerAction from './RunSchedulerAction';
import StatusFreshnessItem from './StatusFreshnessItem';
import WeeklyDigestScheduleForm from './WeeklyDigestScheduleForm';
import { activeOrgCanEdit, resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';
import { getFreshnessConfig } from '@/lib/config/freshness';
import { parseWeeklyDigestSummaryJson, readLatestWeeklyDigest, weeklyDigestSignalsLabel } from '@/lib/digest/weekly';
import {
  formatGscIngestionDiagnosticsSummary,
  GSC_SUMMARY_UI_NARROW_MAX,
  UI_INLINE_ID_DISPLAY_MAX
} from '@/lib/ingestion/gscDiagnostics';
import { pipelineIngestionProvenanceLabel } from '@/lib/ingestion/sourceDisplayLabel';
import { readLatestPipelineRun } from '@/lib/pipeline/store';
import type { PipelineIngestionSource } from '@/lib/pipeline/types';
import { prisma } from '@/lib/prisma';
import { readSchedulerJobs } from '@/lib/scheduler/store';
import { readTrendSnapshots } from '@/lib/trends/store';
import { FreshnessSectionCard } from '@/lib/ui/freshness';
import { getLatestVisibilityScore } from '@/lib/visibility/scoreV1';
import { redirectUnauthenticatedToLogin } from '@/lib/redirect-unauthenticated-to-login';

export const metadata: Metadata = {
  title: 'Ops'
};

function describeSchedulerJob(job: {
  status: 'success' | 'failed';
  query: string;
  pipelineRunId?: string;
  weeklyDigestId?: string;
  errorMessage?: string;
}): string {
  if (job.status === 'failed') {
    return job.errorMessage?.trim() || 'Job failed before producing output.';
  }
  const parts: string[] = [];
  parts.push(job.pipelineRunId ? `pipeline run ${job.pipelineRunId}` : 'no pipeline run');
  parts.push(job.weeklyDigestId ? `digest ${job.weeklyDigestId}` : 'no digest');
  if (job.query.includes('not due')) {
    parts.push('digest was skipped because schedule was not due');
  } else if (job.query.includes('digest-only')) {
    parts.push('digest-only mode');
  }
  return parts.join(' · ');
}

export default async function OpsPage() {
  const active = await resolveActiveOrgSessionForServerComponent();
  if (!active) {
    redirectUnauthenticatedToLogin('/ops');
  }

  const jobs = await readSchedulerJobs(active.organizationId);
  const digestIds = Array.from(new Set(jobs.map((job) => job.weeklyDigestId).filter((id): id is string => Boolean(id))));
  const digestSignalLabels = digestIds.length
    ? Object.fromEntries(
        (
          await prisma.weeklyDigest.findMany({
            where: { organizationId: active.organizationId, id: { in: digestIds } },
            select: { id: true, summaryJson: true }
          })
        ).map((row) => [row.id, weeklyDigestSignalsLabel(parseWeeklyDigestSummaryJson(row.summaryJson))])
      )
    : {};
  const pipelineRunIds = Array.from(
    new Set(jobs.map((job) => job.pipelineRunId).filter((id): id is string => Boolean(id)))
  );
  const pipelineIngestionLabels = pipelineRunIds.length
    ? Object.fromEntries(
        (
          await prisma.pipelineRun.findMany({
            where: { organizationId: active.organizationId, id: { in: pipelineRunIds } },
            select: { id: true, ingestionSource: true }
          })
        ).map((row) => {
          const ingestionSource: PipelineIngestionSource | undefined =
            row.ingestionSource === 'live_gsc_queries' || row.ingestionSource === 'mock_ingestion'
              ? row.ingestionSource
              : undefined;
          return [row.id, pipelineIngestionProvenanceLabel(ingestionSource)];
        })
      )
    : {};
  const latestJob = jobs[0] ?? null;
  const [latestRun, latestDigest, trendSnapshots, latestVisibility] = await Promise.all([
    readLatestPipelineRun(active.organizationId),
    readLatestWeeklyDigest(active.organizationId),
    readTrendSnapshots(active.organizationId),
    getLatestVisibilityScore(active.organizationId)
  ]);
  const latestTrend = trendSnapshots.at(-1) ?? null;
  const {
    thresholds: { freshHours, agingHours, misconfigured: thresholdsMisconfigured },
    input: freshnessThresholds
  } = getFreshnessConfig();
  const schedule = await prisma.organization.findUnique({
    where: { id: active.organizationId },
    select: {
      weeklyDigestScheduleEnabled: true,
      weeklyDigestScheduleDayUtc: true,
      weeklyDigestScheduleHourUtc: true,
      weeklyDigestRefreshPipelineFirst: true
    }
  });

  return (
    <section>
      <h1>Ops Monitor (Baseline)</h1>
      <p>
        Workspace: <EllipsisStrong text={active.organizationName} />
      </p>
      <p>
        Scheduler runs in this workspace only. Default pipeline query comes from your brand settings; optional{' '}
        <code>query=</code> overrides. Weekly digest is generated only when schedule is due (or forced).
        Example: <code>POST /api/debug/scheduler/run?limit=2&amp;forceDigest=1</code> (requires sign-in).
        Debug ingestion (live Search Console row filtering/capping):{' '}
        <Link href="/debug/ingestion">/debug/ingestion</Link>.
        Production-style automation: hourly <code>GET /api/cron/weekly-scheduler</code> with{' '}
        <code>Authorization: Bearer $CRON_SECRET</code> generates digests only (no full pipeline) for orgs whose
        schedule is due; add <code>&amp;full=1</code> to run pipeline + trends + digest like Ops. See{' '}
        <code>vercel.json</code>. Export operational history via <code>/api/ops/scheduler-jobs.csv</code> (includes{' '}
        <code>pipelineRunGscDiagnosticsSummary</code> and <code>weeklyDigestGscDiagnosticsSummary</code> when
        available).
      </p>
      <p>
        <Link href="/api/ops/scheduler-jobs.csv">Download scheduler jobs CSV</Link>
      </p>
      <p className="text-muted-note">
        The CSV uses full text in each column; the scheduler jobs table below may truncate for layout.
      </p>
      <p>
        <Link href="/reports">Go to reports</Link>
      </p>
      <WeeklyDigestScheduleForm
        organizationId={active.organizationId}
        canEdit={activeOrgCanEdit(active)}
        initial={{
          enabled: schedule?.weeklyDigestScheduleEnabled ?? false,
          dayUtc: schedule?.weeklyDigestScheduleDayUtc ?? 1,
          hourUtc: schedule?.weeklyDigestScheduleHourUtc ?? 9,
          refreshPipelineFirst: schedule?.weeklyDigestRefreshPipelineFirst ?? false
        }}
      />
      <RunSchedulerAction canEdit={activeOrgCanEdit(active)} />

      <h2>Current status</h2>
      <ul>
        <StatusFreshnessItem
          label="Latest scheduler job"
          iso={latestJob?.completedAt ?? null}
          thresholds={freshnessThresholds}
          missingText="Not completed yet"
        >
          <>
            {latestJob ? (
              <>
                <EllipsisAccessible as="code" value={latestJob.id} maxChars={UI_INLINE_ID_DISPLAY_MAX} /> (
                {latestJob.status}) · <EllipsisAccessible as="code" value={latestJob.query} />
              </>
            ) : null}
          </>
        </StatusFreshnessItem>
        <StatusFreshnessItem
          label="Latest unified run"
          iso={latestRun?.createdAt ?? null}
          thresholds={freshnessThresholds}
          missingText="Not run yet"
        >
          <>
            {latestRun ? (
              <Link href={`/reports/runs/${latestRun.id}`}>
                <EllipsisAccessible as="code" value={latestRun.id} maxChars={UI_INLINE_ID_DISPLAY_MAX} />
              </Link>
            ) : (
              <span className="text-priority-muted">—</span>
            )}
            {latestRun ? ` · ${pipelineIngestionProvenanceLabel(latestRun.ingestionSource)}` : ''}
            {latestRun?.gscIngestionDiagnostics ? (
              <>
                {' '}
                · GSC:{' '}
                <Link
                  href={`/reports/runs/${latestRun.id}#gsc-diagnostics`}
                  className="text-priority-muted"
                  title={formatGscIngestionDiagnosticsSummary(latestRun.gscIngestionDiagnostics)}
                >
                  <EllipsisAccessible
                    value={formatGscIngestionDiagnosticsSummary(latestRun.gscIngestionDiagnostics)}
                    maxChars={GSC_SUMMARY_UI_NARROW_MAX}
                  />
                </Link>
              </>
            ) : null}
          </>
        </StatusFreshnessItem>
        <StatusFreshnessItem
          label="Latest trend snapshot"
          iso={latestTrend?.generatedAt ?? null}
          thresholds={freshnessThresholds}
          missingText="Not generated yet"
        >
          <code>{latestTrend?.date}</code>
        </StatusFreshnessItem>
        <StatusFreshnessItem
          label="Latest visibility score"
          iso={latestVisibility?.createdAt ?? null}
          thresholds={freshnessThresholds}
          missingText="Not calculated yet"
        >
          <>
            {latestVisibility ? (
              <>
                <strong>{Math.round(latestVisibility.score)}</strong>/100 ·{' '}
                {pipelineIngestionProvenanceLabel(latestVisibility.inputs.pipelineIngestionSource)}
                {latestVisibility.inputs.pipelineGscDiagnosticsSummary &&
                latestVisibility.inputs.pipelineRunId ? (
                  <>
                    {' · '}
                    <Link
                      href={`/reports/runs/${latestVisibility.inputs.pipelineRunId}#gsc-diagnostics`}
                      className="text-priority-muted"
                      title={latestVisibility.inputs.pipelineGscDiagnosticsSummary}
                    >
                      GSC:{' '}
                      <EllipsisAccessible
                        value={latestVisibility.inputs.pipelineGscDiagnosticsSummary}
                        maxChars={GSC_SUMMARY_UI_NARROW_MAX}
                      />
                    </Link>
                  </>
                ) : null}
                {' · '}
                <Link href={`/api/orgs/${active.organizationId}/visibility`}>JSON</Link>
                {' · '}
                <Link href="/dashboard">Dashboard</Link>
              </>
            ) : (
              <span className="text-priority-muted">—</span>
            )}
          </>
        </StatusFreshnessItem>
        <StatusFreshnessItem
          label="Latest weekly digest"
          iso={latestDigest?.generatedAt ?? null}
          thresholds={freshnessThresholds}
          missingText="Not generated yet"
        >
          <>
            {latestDigest ? (
              <Link href={`/reports/digest/${latestDigest.id}`}>
                <EllipsisAccessible as="code" value={latestDigest.id} maxChars={UI_INLINE_ID_DISPLAY_MAX} />
              </Link>
            ) : (
              <code />
            )}
            {latestDigest ? ` · ${weeklyDigestSignalsLabel(latestDigest.summary)}` : ''}
            {latestDigest?.summary.pipelineGscDiagnosticsSummary ? (
              <>
                {' '}
                · GSC:{' '}
                <Link
                  href={`/reports/digest/${latestDigest.id}#gsc-digest-pipeline`}
                  className="text-priority-muted"
                  title={latestDigest.summary.pipelineGscDiagnosticsSummary}
                >
                  <EllipsisAccessible
                    value={latestDigest.summary.pipelineGscDiagnosticsSummary}
                    maxChars={GSC_SUMMARY_UI_NARROW_MAX}
                  />
                </Link>
              </>
            ) : null}
          </>
        </StatusFreshnessItem>
      </ul>
      <FreshnessSectionCard title="Freshness thresholds">
        <FreshnessConfigInfo
          freshHours={freshHours}
          agingHours={agingHours}
          misconfigured={thresholdsMisconfigured}
          prefix="Reports badges use:"
        />
      </FreshnessSectionCard>

      <h2>Recent scheduler jobs</h2>
      {jobs.length === 0 ? (
        <p>No scheduler jobs yet for this workspace.</p>
      ) : (
        <>
          <p className="table-scroll-hint">On smaller screens, swipe horizontally to see all columns.</p>
          <div className="table-scroll-wrap">
            <table className="data-table data-table-ops-scheduler">
              <caption className="sr-only">
                Recent scheduler jobs for this workspace: job id, completion time, status, execution details, query,
                linked pipeline run and digest, pipeline document source, digest connector signals label, and quick links.
              </caption>
              <colgroup>
                <col style={{ width: '12%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '8%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col" className="data-table-th-left data-table-sticky-col data-table-sticky-col-id">
                    Job id
                  </th>
                  <th scope="col" className="data-table-th-left">Completed</th>
                  <th scope="col" className="data-table-th-left">Status</th>
                  <th scope="col" className="data-table-th-left">Details</th>
                  <th scope="col" className="data-table-th-left">Query</th>
                  <th scope="col" className="data-table-th-left">Pipeline run</th>
                  <th scope="col" className="data-table-th-left">Weekly digest</th>
                  <th scope="col" className="data-table-th-left">Pipeline docs</th>
                  <th scope="col" className="data-table-th-left">Digest signals</th>
                  <th scope="col" className="data-table-th-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => {
                  const pipelineDocsLabel = job.pipelineRunId
                    ? (pipelineIngestionLabels[job.pipelineRunId] ?? 'Not recorded')
                    : '-';
                  const digestSignalsLabel = job.weeklyDigestId
                    ? (digestSignalLabels[job.weeklyDigestId] ?? '—')
                    : '-';
                  const pipelineRunTrim = job.pipelineRunId?.trim() ?? '';
                  const digestTrim = job.weeklyDigestId?.trim() ?? '';
                  const pipelineRunLinkTitle =
                    pipelineRunTrim.length > UI_INLINE_ID_DISPLAY_MAX ? pipelineRunTrim : undefined;
                  const digestLinkTitle = digestTrim.length > UI_INLINE_ID_DISPLAY_MAX ? digestTrim : undefined;
                  return (
                  <tr key={job.id}>
                    <td className="data-table-td data-table-sticky-col data-table-sticky-col-id">
                      <div className="id-cell-stack">
                        <EllipsisAccessible value={job.id} maxChars={UI_INLINE_ID_DISPLAY_MAX} />
                        <CopyTextButton
                          text={job.id}
                          label="Copy id"
                          ariaLabel={`Copy scheduler job id ${job.id}`}
                          className="btn-compact-inline btn-compact-inline-secondary"
                        />
                      </div>
                    </td>
                    <td
                      className="data-table-td data-table-td-wrap-break"
                      title={new Date(job.completedAt).toISOString()}
                    >
                      {new Date(job.completedAt).toLocaleString()}
                    </td>
                    <td className="data-table-td">
                      <EllipsisAccessible value={job.status} />
                    </td>
                    <td className="data-table-td data-table-td-wrap-break">
                      <EllipsisAccessible value={describeSchedulerJob(job)} />
                    </td>
                    <td className="data-table-td data-table-td-wrap-break">
                      <EllipsisAccessible value={job.query} />
                    </td>
                    <td className="data-table-td data-table-td-break-all">
                      {job.pipelineRunId ? (
                        <Link href={`/reports/runs/${job.pipelineRunId}`} title={pipelineRunLinkTitle}>
                          <EllipsisAccessible value={job.pipelineRunId} maxChars={UI_INLINE_ID_DISPLAY_MAX} />
                        </Link>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="data-table-td data-table-td-break-all">
                      {job.weeklyDigestId ? (
                        <Link href={`/reports/digest/${job.weeklyDigestId}`} title={digestLinkTitle}>
                          <EllipsisAccessible value={job.weeklyDigestId} maxChars={UI_INLINE_ID_DISPLAY_MAX} />
                        </Link>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="data-table-td data-table-td-wrap-break">
                      <EllipsisAccessible value={pipelineDocsLabel} />
                    </td>
                    <td className="data-table-td data-table-td-wrap-break">
                      <EllipsisAccessible value={digestSignalsLabel} />
                    </td>
                    <td className="data-table-td">
                      {job.pipelineRunId || job.weeklyDigestId ? (
                        <>
                          {job.pipelineRunId ? (
                            <Link
                              href={`/reports/runs/${job.pipelineRunId}`}
                              aria-label={`Open pipeline run ${job.pipelineRunId} from scheduler job ${job.id}`}
                            >
                              Open run
                            </Link>
                          ) : null}
                          {job.pipelineRunId && job.weeklyDigestId ? ' | ' : null}
                          {job.weeklyDigestId ? (
                            <Link
                              href={`/reports/digest/${job.weeklyDigestId}`}
                              aria-label={`Open weekly digest ${job.weeklyDigestId} from scheduler job ${job.id}`}
                            >
                              Open digest
                            </Link>
                          ) : null}
                        </>
                      ) : (
                        '-'
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
    </section>
  );
}








