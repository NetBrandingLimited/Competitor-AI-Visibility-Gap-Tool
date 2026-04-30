import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import CopyTextButton from '@/app/components/CopyTextButton';
import EllipsisStrong from '@/app/components/EllipsisStrong';
import DocumentUrlCell from '@/app/components/DocumentUrlCell';
import { resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';
import { formatGscIngestionDiagnosticsSummary, tableCellEllipsisParts } from '@/lib/ingestion/gscDiagnostics';
import { ingestionSourceDisplayLabel, pipelineIngestionProvenanceLabel } from '@/lib/ingestion/sourceDisplayLabel';
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

  const queryHeader = tableCellEllipsisParts(run.query);
  const runIdHeader = tableCellEllipsisParts(run.id, 24);
  const gscSummaryText = run.gscIngestionDiagnostics
    ? formatGscIngestionDiagnosticsSummary(run.gscIngestionDiagnostics)
    : '';
  const gscSummaryParts = gscSummaryText ? tableCellEllipsisParts(gscSummaryText) : null;

  return (
    <section>
      <h1>Pipeline Run Detail</h1>
      <p>
        Workspace: <EllipsisStrong text={active.organizationName} />
      </p>
      <p>
        Run id: <code title={runIdHeader.title}>{runIdHeader.display}</code>{' '}
        <CopyTextButton
          text={run.id}
          label="Copy run id"
          ariaLabel={`Copy pipeline run id ${run.id}`}
          className="btn-compact-inline btn-compact-inline-secondary"
        />
      </p>
      <p>
        Query:{' '}
        <code title={queryHeader.title}>{queryHeader.display}</code> | Docs: {run.documentCount} | Triggers:{' '}
        {run.triggerCount} | Clusters:{' '}
        {run.clusterCount}
        {run.ingestionSource ? ` | Ingestion: ${pipelineIngestionProvenanceLabel(run.ingestionSource)}` : null}
      </p>
      {run.gscIngestionDiagnostics ? (
        <div className="panel-box mb-20" id="gsc-diagnostics">
          <h2 className="heading-panel">Search Console ingestion diagnostics</h2>
          <p className="text-muted-note">
            One-line summary (also included in pipeline runs CSV as <code>gscDiagnosticsSummary</code>):
          </p>
          <p>
            <code title={gscSummaryParts?.title}>{gscSummaryParts?.display}</code>{' '}
            <CopyTextButton
              text={gscSummaryText}
              label="Copy summary"
              ariaLabel="Copy GSC ingestion diagnostics summary"
              className="btn-compact-inline btn-compact-inline-secondary"
            />
            <CopyTextButton
              text={JSON.stringify(run.gscIngestionDiagnostics, null, 2)}
              label="Copy JSON"
              ariaLabel="Copy GSC ingestion diagnostics JSON"
              className="btn-compact-inline btn-compact-inline-secondary"
            />
          </p>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {JSON.stringify(run.gscIngestionDiagnostics, null, 2)}
          </pre>
        </div>
      ) : null}
      <p>
        <Link href="/reports">Back to reports</Link>
      </p>

      <h2>Source documents</h2>
      {run.documents.length === 0 ? (
        <p>No documents stored for this run.</p>
      ) : (
        <>
          <p className="table-scroll-hint">On smaller screens, swipe horizontally to see all columns.</p>
          <div className="table-scroll-wrap">
            <table className="data-table data-table-mb-16 data-table-min-run-triggers">
              <caption className="sr-only">
                Ingested source documents for this pipeline run: source, title, URL, document id, and published time.
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="data-table-th-left data-table-sticky-col">
                    Source
                  </th>
                  <th scope="col" className="data-table-th-left">Title</th>
                  <th scope="col" className="data-table-th-left">URL</th>
                  <th scope="col" className="data-table-th-left">Id</th>
                  <th scope="col" className="data-table-th-left">Published</th>
                </tr>
              </thead>
              <tbody>
                {run.documents.map((doc, index) => {
                  const titleCell = tableCellEllipsisParts(doc.title);
                  const sourceCell = tableCellEllipsisParts(ingestionSourceDisplayLabel(doc.source));
                  const idCell = tableCellEllipsisParts(doc.id);
                  return (
                  <tr key={`${doc.id}-${index}`}>
                    <td className="data-table-td data-table-sticky-col" title={sourceCell.title}>
                      {sourceCell.display}
                    </td>
                    <td className="data-table-td data-table-td-wrap-break" title={titleCell.title}>
                      {titleCell.display}
                    </td>
                    <td className="data-table-td">
                      <DocumentUrlCell url={doc.url} />
                    </td>
                    <td className="data-table-td">
                      <code title={idCell.title}>{idCell.display}</code>
                    </td>
                    <td className="data-table-td-nowrap">{new Date(doc.publishedAt).toLocaleString()}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

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
            {run.triggers.map((trigger) => {
              const phraseCell = tableCellEllipsisParts(trigger.phrase);
              const categoryCell = tableCellEllipsisParts(trigger.category);
              return (
                <tr key={`${trigger.phrase}-${trigger.category}`}>
                  <td
                    className="data-table-td data-table-sticky-col data-table-td-wrap-break"
                    title={phraseCell.title}
                  >
                    {phraseCell.display}
                  </td>
                  <td className="data-table-td" title={categoryCell.title}>
                    {categoryCell.display}
                  </td>
                  <td className="data-table-td-right">{trigger.score}</td>
                </tr>
              );
            })}
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
            {run.clusters.map((cluster) => {
              const labelCell = tableCellEllipsisParts(cluster.label);
              const kwCell = tableCellEllipsisParts(cluster.keywords.join(', '));
              return (
              <tr key={cluster.id}>
                <td
                  className="data-table-td data-table-sticky-col data-table-td-wrap-break"
                  title={labelCell.title}
                >
                  {labelCell.display}
                </td>
                <td className="data-table-td data-table-td-wrap-break" title={kwCell.title}>
                  {kwCell.display}
                </td>
                <td className="data-table-td-right">{cluster.itemCount}</td>
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
