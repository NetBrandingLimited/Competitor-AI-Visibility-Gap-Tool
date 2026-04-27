import Link from 'next/link';
import { redirect } from 'next/navigation';

import { resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';
import { readPipelineRunById } from '@/lib/pipeline/store';

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
        Run id: <code>{run.id}</code>
      </p>
      <p>
        Query: <code>{run.query}</code> | Docs: {run.documentCount} | Triggers: {run.triggerCount} |
        Clusters: {run.clusterCount}
      </p>
      <p>
        <Link href="/reports">Back to reports</Link>
      </p>

      <h2>Trigger phrases</h2>
      {run.triggers.length === 0 ? (
        <p>No triggers found for this run.</p>
      ) : (
        <ul>
          {run.triggers.map((trigger) => (
            <li key={`${trigger.phrase}-${trigger.category}`}>
              {trigger.phrase} ({trigger.category}, score {trigger.score})
            </li>
          ))}
        </ul>
      )}

      <h2>Theme clusters</h2>
      {run.clusters.length === 0 ? (
        <p>No clusters generated for this run.</p>
      ) : (
        <ul>
          {run.clusters.map((cluster) => (
            <li key={cluster.id}>
              {cluster.label}: {cluster.keywords.join(', ')} ({cluster.itemCount} items)
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
