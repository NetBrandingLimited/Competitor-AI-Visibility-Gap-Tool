import Link from 'next/link';
import { redirect } from 'next/navigation';

import FreshnessConfigInfo from '@/app/components/FreshnessConfigInfo';
import RunSchedulerAction from './RunSchedulerAction';
import WeeklyDigestScheduleForm from './WeeklyDigestScheduleForm';
import { activeOrgCanEdit, resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';
import { getFreshnessConfig } from '@/lib/config/freshness';
import { readLatestPipelineRun } from '@/lib/pipeline/store';
import { prisma } from '@/lib/prisma';
import { readSchedulerJobs } from '@/lib/scheduler/store';
import { readTrendSnapshots } from '@/lib/trends/store';
import {
  FreshnessLine,
  FreshnessSectionCard
} from '@/lib/ui/freshness';

export default async function OpsPage() {
  const active = await resolveActiveOrgSessionForServerComponent();
  if (!active) {
    redirect('/login');
  }

  const jobs = await readSchedulerJobs(active.organizationId);
  const latestJob = jobs[0] ?? null;
  const latestRun = await readLatestPipelineRun(active.organizationId);
  const trendSnapshots = await readTrendSnapshots(active.organizationId);
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
        Workspace: <strong>{active.organizationName}</strong>
      </p>
      <p>
        Scheduler runs in this workspace only. Default pipeline query comes from your brand settings; optional{' '}
        <code>query=</code> overrides. Weekly digest is generated only when schedule is due (or forced).
        Example: <code>POST /api/debug/scheduler/run?limit=2&amp;forceDigest=1</code> (requires sign-in).
        Production-style automation: hourly <code>GET /api/cron/weekly-scheduler</code> with{' '}
        <code>Authorization: Bearer $CRON_SECRET</code> generates digests only (no full pipeline) for orgs whose
        schedule is due; add <code>&amp;full=1</code> to run pipeline + trends + digest like Ops. See{' '}
        <code>vercel.json</code>.
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
      <RunSchedulerAction />

      <h2>Current status</h2>
      <ul>
        <li>
          Latest scheduler job:{' '}
          {latestJob ? (
            <>
              <code>{latestJob.id}</code> ({latestJob.status})
              <span style={{ marginLeft: 6 }}>
                <FreshnessLine
                  iso={latestJob.completedAt}
                  thresholds={freshnessThresholds}
                  muted
                  parenthesized
                />
              </span>
            </>
          ) : (
            <FreshnessLine iso={null} thresholds={freshnessThresholds} missingText="none" />
          )}
        </li>
        <li>
          Latest unified run:{' '}
          {latestRun ? (
            <>
              <code>{latestRun.id}</code>
              <span style={{ marginLeft: 6 }}>
                <FreshnessLine
                  iso={latestRun.createdAt}
                  thresholds={freshnessThresholds}
                  muted
                  parenthesized
                />
              </span>
            </>
          ) : (
            <FreshnessLine iso={null} thresholds={freshnessThresholds} missingText="none" />
          )}
        </li>
        <li>
          Latest trend snapshot:{' '}
          {latestTrend ? (
            <>
              <code>{latestTrend.date}</code>
              <span style={{ marginLeft: 6 }}>
                <FreshnessLine
                  iso={latestTrend.generatedAt}
                  thresholds={freshnessThresholds}
                  muted
                  parenthesized
                />
              </span>
            </>
          ) : (
            <FreshnessLine iso={null} thresholds={freshnessThresholds} missingText="none" />
          )}
        </li>
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
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Job id</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Status</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Query</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>
                Pipeline run
              </th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>
                Weekly digest
              </th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>
                Completed
              </th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{job.id}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{job.status}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{job.query}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                  {job.pipelineRunId ?? '-'}
                </td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                  {job.weeklyDigestId ?? '-'}
                </td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                  {new Date(job.completedAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}








