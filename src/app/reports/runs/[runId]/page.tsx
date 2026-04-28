import Link from 'next/link';
import { redirect } from 'next/navigation';

import { resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';
import { readPipelineRunById } from '@/lib/pipeline/store';
import { tableBase, tableWithMarginBottom, tdCell, tdCellRight, thLeft, thRight } from '@/lib/ui/tableStyles';

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
        <table style={tableWithMarginBottom(16)}>
          <thead>
            <tr>
              <th style={thLeft}>Phrase</th>
              <th style={thLeft}>Category</th>
              <th style={thRight}>Score</th>
            </tr>
          </thead>
          <tbody>
            {run.triggers.map((trigger) => (
              <tr key={`${trigger.phrase}-${trigger.category}`}>
                <td style={tdCell}>{trigger.phrase}</td>
                <td style={tdCell}>{trigger.category}</td>
                <td style={tdCellRight}>{trigger.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Theme clusters</h2>
      {run.clusters.length === 0 ? (
        <p>No clusters generated for this run.</p>
      ) : (
        <table style={tableBase}>
          <thead>
            <tr>
              <th style={thLeft}>Label</th>
              <th style={thLeft}>Keywords</th>
              <th style={thRight}>Items</th>
            </tr>
          </thead>
          <tbody>
            {run.clusters.map((cluster) => (
              <tr key={cluster.id}>
                <td style={tdCell}>{cluster.label}</td>
                <td style={tdCell}>{cluster.keywords.join(', ')}</td>
                <td style={tdCellRight}>{cluster.itemCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
