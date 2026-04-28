import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import FreshnessConfigInfo from '@/app/components/FreshnessConfigInfo';
import RunSchedulerAction from './RunSchedulerAction';
import StatusFreshnessItem from './StatusFreshnessItem';
import WeeklyDigestScheduleForm from './WeeklyDigestScheduleForm';
import { activeOrgCanEdit, resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';
import { getFreshnessConfig } from '@/lib/config/freshness';
import { readLatestPipelineRun } from '@/lib/pipeline/store';
import { prisma } from '@/lib/prisma';
import { readSchedulerJobs } from '@/lib/scheduler/store';
import { readTrendSnapshots } from '@/lib/trends/store';
import { FreshnessSectionCard } from '@/lib/ui/freshness';

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
        <StatusFreshnessItem
          label="Latest scheduler job"
          iso={latestJob?.completedAt ?? null}
          thresholds={freshnessThresholds}
          missingText="Not completed yet"
        >
          <>
            <code>{latestJob?.id}</code> ({latestJob?.status}) · <code>{latestJob?.query}</code>
          </>
        </StatusFreshnessItem>
        <StatusFreshnessItem
          label="Latest unified run"
          iso={latestRun?.createdAt ?? null}
          thresholds={freshnessThresholds}
          missingText="Not run yet"
        >
          <code>{latestRun?.id}</code>
        </StatusFreshnessItem>
        <StatusFreshnessItem
          label="Latest trend snapshot"
          iso={latestTrend?.generatedAt ?? null}
          thresholds={freshnessThresholds}
          missingText="Not generated yet"
        >
          <code>{latestTrend?.date}</code>
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
        <table className="data-table">
          <caption className="sr-only">
            Recent scheduler jobs for this workspace: job id, status, execution details, query, linked pipeline run
            and digest, and completion time.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="data-table-th-left">Job id</th>
              <th scope="col" className="data-table-th-left">Status</th>
              <th scope="col" className="data-table-th-left">Details</th>
              <th scope="col" className="data-table-th-left">Query</th>
              <th scope="col" className="data-table-th-left">Pipeline run</th>
              <th scope="col" className="data-table-th-left">Weekly digest</th>
              <th scope="col" className="data-table-th-left">Completed</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td className="data-table-td">{job.id}</td>
                <td className="data-table-td">{job.status}</td>
                <td className="data-table-td">{describeSchedulerJob(job)}</td>
                <td className="data-table-td">{job.query}</td>
                <td className="data-table-td">{job.pipelineRunId ?? '-'}</td>
                <td className="data-table-td">{job.weeklyDigestId ?? '-'}</td>
                <td className="data-table-td">{new Date(job.completedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}








