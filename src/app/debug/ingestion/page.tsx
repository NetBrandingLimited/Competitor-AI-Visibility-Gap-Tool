import Link from 'next/link';
import { redirect } from 'next/navigation';

import type { Metadata } from 'next';

import { activeOrgCanEdit, resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';
import { defaultPipelineQueryFromOrg, simpleHash } from '@/lib/org-visibility-mock';
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
            Ingestion source: <strong>{pipelineIngestionProvenanceLabel(run.ingestionSource)}</strong>
          </p>
          <p>
            Documents produced: <strong>{run.result.documents.length}</strong>
          </p>

          <h3>GSC diagnostics</h3>
          {run.gscDiagnostics ? (
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {JSON.stringify(run.gscDiagnostics, null, 2)}
            </pre>
          ) : (
            <p>Not recorded (fell back to mock ingestion).</p>
          )}
        </div>
      ) : null}
    </section>
  );
}

