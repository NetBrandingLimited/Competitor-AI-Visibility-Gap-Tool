import Link from 'next/link';
import { redirect } from 'next/navigation';

import CopyDebugConfigButton from './CopyDebugConfigButton';
import RunSchedulerAction from './RunSchedulerAction';
import WeeklyDigestScheduleForm from './WeeklyDigestScheduleForm';
import { activeOrgCanEdit, resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';
import { getFreshnessThresholds } from '@/lib/config/freshness';
import { formatAge } from '@/lib/format/age';
import { readLatestPipelineRun } from '@/lib/pipeline/store';
import { prisma } from '@/lib/prisma';
import { readSchedulerJobs } from '@/lib/scheduler/store';
import { readTrendSnapshots } from '@/lib/trends/store';
import { FreshnessPill, getFreshnessLabel } from '@/lib/ui/freshness';

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
  const { freshHours, agingHours, misconfigured: thresholdsMisconfigured } = getFreshnessThresholds();
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
              <span style={{ marginLeft: 6, color: '#6b7280' }}>({formatAge(latestJob.completedAt)})</span>
              <FreshnessPill
                label={getFreshnessLabel(latestJob.completedAt, { freshHours, agingHours })}
              />
            </>
          ) : (
            <>
              none
              <FreshnessPill label="Missing" />
            </>
          )}
        </li>
        <li>
          Latest unified run:{' '}
          {latestRun ? (
            <>
              <code>{latestRun.id}</code>
              <span style={{ marginLeft: 6, color: '#6b7280' }}>({formatAge(latestRun.createdAt)})</span>
              <FreshnessPill label={getFreshnessLabel(latestRun.createdAt, { freshHours, agingHours })} />
            </>
          ) : (
            <>
              none
              <FreshnessPill label="Missing" />
            </>
          )}
        </li>
        <li>
          Latest trend snapshot:{' '}
          {latestTrend ? (
            <>
              <code>{latestTrend.date}</code>
              <span style={{ marginLeft: 6, color: '#6b7280' }}>({formatAge(latestTrend.generatedAt)})</span>
              <FreshnessPill label={getFreshnessLabel(latestTrend.generatedAt, { freshHours, agingHours })} />
            </>
          ) : (
            <>
              none
              <FreshnessPill label="Missing" />
            </>
          )}
        </li>
      </ul>
      <h2>Freshness thresholds</h2>
      <p style={{ color: '#444' }}>
        Reports badges currently use:
        {' '}
        <code>Fresh &lt;= {freshHours}h</code>,
        {' '}
        <code>Aging &lt;= {agingHours}h</code>,
        {' '}
        otherwise <code>Stale</code>.
      </p>
      <p style={{ marginTop: 6 }}>
        Runtime debug JSON:{' '}
        <a href="/api/debug/config" target="_blank" rel="noreferrer">
          /api/debug/config
        </a>
        <CopyDebugConfigButton />
      </p>
      {thresholdsMisconfigured ? (
        <p
          style={{
            color: '#b91c1c',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 6,
            padding: '8px 10px',
            maxWidth: 760
          }}
        >
          Warning: <code>AGING_HOURS</code> is lower than <code>FRESH_HOURS</code>. Use
          <code> AGING_HOURS &gt;= FRESH_HOURS</code> to keep freshness labels consistent.
        </p>
      ) : null}

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

