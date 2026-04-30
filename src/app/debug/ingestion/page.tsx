import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import EllipsisStrong from '@/app/components/EllipsisStrong';
import { activeOrgCanEdit, resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';
import { defaultPipelineQueryFromOrg, simpleHash } from '@/lib/org-visibility-mock';
import {
  formatGscIngestionDiagnosticsSummary,
  tableCellEllipsisParts
} from '@/lib/ingestion/gscDiagnostics';
import { runOrgIngestionDebug } from '@/lib/ingestion/pipeline';
import { pipelineIngestionProvenanceLabel } from '@/lib/ingestion/sourceDisplayLabel';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'Debug Ingestion'
};

function toNumberOrUndefined(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export default async function DebugIngestionPage({
  searchParams
}: {
  searchParams: { query?: string; limit?: string; run?: string };
}) {
  const active = await resolveActiveOrgSessionForServerComponent();
  if (!active) redirect('/login');
  if (!activeOrgCanEdit(active)) redirect('/ops');

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
  const brandContext = org
    ? {
        brandName: org.brandName,
        category: org.category,
        competitorA: org.competitorA,
        competitorB: org.competitorB,
        competitorC: org.competitorC
      }
    : {};

  const q = searchParams.query?.trim();
  const query = q && q.length > 0 ? q : defaultPipelineQueryFromOrg(brandContext);
  const limitPerConnector = toNumberOrUndefined(searchParams.limit);

  const shouldRun = searchParams.run === '1';
  // Keep this deterministic to satisfy React's render purity checks.
  const contentVariant = simpleHash(
    `${active.organizationId}-${query}-${limitPerConnector ?? ''}-debug-ingestion`
  );

  const run = shouldRun
    ? await runOrgIngestionDebug({
        organizationId: active.organizationId,
        query,
        limitPerConnector,
        brandContext,
        contentVariant
      })
    : null;

  const gscDiagnostics = run?.gscDiagnostics ?? null;

  return (
    <section>
      <h1>Debug Ingestion</h1>
      <p>
        Workspace: <strong>{active.organizationName}</strong> · Signed in as{' '}
        <strong>{active.user.email}</strong>
      </p>
      <p>
        This runs the same hybrid ingestion as the unified pipeline, but returns extra{' '}
        <code>gscDiagnostics</code> so you can see how Search Console rows were filtered/capped.
      </p>

      <form method="get">
        <div style={{ marginBottom: 12 }}>
          <label>
            Query:{' '}
            <input
              name="query"
              defaultValue={query}
              style={{ width: '70%' }}
              aria-label="GSC pipeline query"
            />
          </label>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>
            Limit per connector (rows):{' '}
            <input name="limit" defaultValue={limitPerConnector ?? ''} aria-label="Rows limit" />
          </label>
        </div>
        <button type="submit" name="run" value="1">
          Run ingestion
        </button>
        <span style={{ marginLeft: 10 }}>
          Tip: open the raw JSON at <Link href={`/api/debug/ingestion?query=${encodeURIComponent(query)}&limit=${limitPerConnector ?? ''}`}>/api/debug/ingestion</Link>
        </span>
      </form>

      {run ? (
        <div style={{ marginTop: 18 }}>
          <h2>Result</h2>
          <p>
            Ingestion source:{' '}
            <EllipsisStrong text={pipelineIngestionProvenanceLabel(run.ingestionSource)} />
          </p>
          <p>
            Documents produced: <strong>{run.result.documents.length}</strong>
          </p>

          <h3>GSC diagnostics</h3>
          {gscDiagnostics ? (
            <>
              <p className="text-muted-note">
                <strong>Summary</strong> (same string as API <code>gscDiagnosticsSummary</code> and pipeline CSV):{' '}
                {(() => {
                  const parts = tableCellEllipsisParts(formatGscIngestionDiagnosticsSummary(gscDiagnostics));
                  return (
                    <code title={parts.title}>{parts.display}</code>
                  );
                })()}
              </p>
              <dl
                style={{
                  margin: '8px 0 16px 0',
                  padding: '8px 12px',
                  border: '1px solid rgba(0,0,0,0.08)'
                }}
              >
                <dt>Query attempt</dt>
                <dd>
                  usedFiltered={String(gscDiagnostics.queryAttempt.usedFiltered)} · usedUnfiltered=
                  {String(gscDiagnostics.queryAttempt.usedUnfiltered)} · filteredRows=
                  {gscDiagnostics.queryAttempt.filteredRows} · unfilteredRows=
                  {gscDiagnostics.queryAttempt.unfilteredRows}
                </dd>
                <dt>Query docs</dt>
                <dd>
                  fetched={gscDiagnostics.query.fetched} · zeroEngagementDropped=
                  {gscDiagnostics.query.filteredZeroEngagement} · lowSignalDropped=
                  {gscDiagnostics.query.filteredLowSignal} · created=
                  {gscDiagnostics.query.docsCreated}
                </dd>
                <dt>Page docs</dt>
                <dd>
                  fetched={gscDiagnostics.page.fetched} · zeroEngagementDropped=
                  {gscDiagnostics.page.filteredZeroEngagement} · lowSignalDropped=
                  {gscDiagnostics.page.filteredLowSignal} · created=
                  {gscDiagnostics.page.docsCreated}
                </dd>
                <dt>Query+Page docs</dt>
                <dd>
                  fetched={gscDiagnostics.qp.fetched} · zeroEngagementDropped=
                  {gscDiagnostics.qp.filteredZeroEngagement} · lowSignalDropped=
                  {gscDiagnostics.qp.filteredLowSignal} · created=
                  {gscDiagnostics.qp.docsCreated}
                </dd>
                <dt>Merged → capped</dt>
                <dd>
                  mergedBeforeDedupe={gscDiagnostics.mergedDocsBeforeDedupe} · dedupedDocs=
                  {gscDiagnostics.dedupedDocs} · cappedDocs={gscDiagnostics.cappedDocs}
                </dd>
              </dl>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {JSON.stringify(gscDiagnostics, null, 2)}
              </pre>
            </>
          ) : (
            <p>Not recorded (fell back to mock ingestion).</p>
          )}
        </div>
      ) : null}
    </section>
  );
}

