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
        <table className="data-table data-table-mb-16">
          <thead>
            <tr>
              <th className="data-table-th-left">Phrase</th>
              <th className="data-table-th-left">Category</th>
              <th className="data-table-th-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {run.triggers.map((trigger) => (
              <tr key={`${trigger.phrase}-${trigger.category}`}>
                <td className="data-table-td">{trigger.phrase}</td>
                <td className="data-table-td">{trigger.category}</td>
                <td className="data-table-td-right">{trigger.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Theme clusters</h2>
      {run.clusters.length === 0 ? (
        <p>No clusters generated for this run.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th className="data-table-th-left">Label</th>
              <th className="data-table-th-left">Keywords</th>
              <th className="data-table-th-right">Items</th>
            </tr>
          </thead>
          <tbody>
            {run.clusters.map((cluster) => (
              <tr key={cluster.id}>
                <td className="data-table-td">{cluster.label}</td>
                <td className="data-table-td">{cluster.keywords.join(', ')}</td>
                <td className="data-table-td-right">{cluster.itemCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
