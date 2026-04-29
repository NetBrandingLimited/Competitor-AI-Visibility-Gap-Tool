import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import CopyTextButton from '@/app/components/CopyTextButton';
import { resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';
import { readPipelineRunById } from '@/lib/pipeline/store';

function runTitleSegment(runId: string): string {
  const id = runId.trim();
  if (!id) return 'Pipeline run';
  return id.length > 12 ? `Run ${id.slice(0, 12)}…` : `Run ${id}`;
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ runId: string }>;
}): Promise<Metadata> {
  const { runId } = await params;
  return { title: runTitleSegment(runId) };
}

export default async function PipelineRunDetailPage({
  params
}: {
  params: Promise<{ runId: string }>;
}) {
  const active = await resolveActiveOrgSessionForServerComponent();
  if (!active) {
    redirect('/login');
  }

  const { runId } = await params;
  const run = await readPipelineRunById(active.organizationId, runId);

  if (!run) {
    return (
      <section>
        <h1>Pipeline Run Not Found</h1>
        <p>
          Run <code>{runId}</code> is not available in this workspace.
        </p>
        <p>
          <Link href="/reports">Back to reports</Link>
        </p>
      </section>
    );
  }

  return (
    <section>
      <h1>Pipeline Run Detail</h1>
      <p>
        Workspace: <strong>{active.organizationName}</strong>
      </p>
      <p>
        Run id: <code>{run.id}</code>{' '}
        <CopyTextButton
          text={run.id}
          label="Copy run id"
          ariaLabel={`Copy pipeline run id ${run.id}`}
          className="btn-compact-inline btn-compact-inline-secondary"
        />
      </p>
      <p>
        Query: <code>{run.query}</code> | Docs: {run.documentCount} | Triggers: {run.triggerCount} | Clusters:{' '}
        {run.clusterCount}
        {run.ingestionSource === 'live_gsc_queries'
          ? ' | Ingestion: Google Search Console queries'
          : run.ingestionSource === 'mock_ingestion'
            ? ' | Ingestion: mock templates'
            : null}
      </p>
      <p>
        <Link href="/reports">Back to reports</Link>
      </p>

      <h2>Trigger phrases</h2>
      {run.triggers.length === 0 ? (
        <p>No triggers found for this run.</p>
      ) : (
        <>
          <p className="table-scroll-hint">On smaller screens, swipe horizontally to see all columns.</p>
          <div className="table-scroll-wrap">
            <table className="data-table data-table-mb-16 data-table-min-run-triggers">
          <caption className="sr-only">
            Trigger phrases for this pipeline run: phrase (sticky while scrolling), category, and score.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="data-table-th-left data-table-sticky-col">Phrase</th>
              <th scope="col" className="data-table-th-left">Category</th>
              <th scope="col" className="data-table-th-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {run.triggers.map((trigger) => (
              <tr key={`${trigger.phrase}-${trigger.category}`}>
                <td className="data-table-td data-table-sticky-col">{trigger.phrase}</td>
                <td className="data-table-td">{trigger.category}</td>
                <td className="data-table-td-right">{trigger.score}</td>
              </tr>
            ))}
          </tbody>
            </table>
          </div>
        </>
      )}

      <h2>Theme clusters</h2>
      {run.clusters.length === 0 ? (
        <p>No clusters generated for this run.</p>
      ) : (
        <>
          <p className="table-scroll-hint">On smaller screens, swipe horizontally to see all columns.</p>
          <div className="table-scroll-wrap">
            <table className="data-table data-table-min-run-clusters">
          <caption className="sr-only">
            Theme clusters for this pipeline run: label (sticky while scrolling), keywords, and item count.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="data-table-th-left data-table-sticky-col">Label</th>
              <th scope="col" className="data-table-th-left">Keywords</th>
              <th scope="col" className="data-table-th-right">Items</th>
            </tr>
          </thead>
          <tbody>
            {run.clusters.map((cluster) => (
              <tr key={cluster.id}>
                <td className="data-table-td data-table-sticky-col">{cluster.label}</td>
                <td className="data-table-td">{cluster.keywords.join(', ')}</td>
                <td className="data-table-td-right">{cluster.itemCount}</td>
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
