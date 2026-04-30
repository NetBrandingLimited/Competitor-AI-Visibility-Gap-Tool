import Link from 'next/link';

import type { GapOpportunity } from '@/lib/insights/gap';

export default function GapOpportunityGscRunLink({ opportunity }: { opportunity: GapOpportunity }) {
  const runId = opportunity.pipelineRunIdForGsc?.trim();
  if (!runId) {
    return null;
  }
  return (
    <>
      {' '}
      <Link
        className="text-muted-note"
        href={`/reports/runs/${runId}#gsc-diagnostics`}
        aria-label="View Search Console ingestion diagnostics for this pipeline run"
      >
        GSC detail
      </Link>
    </>
  );
}
