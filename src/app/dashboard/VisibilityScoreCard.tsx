import Link from 'next/link';

import EllipsisAccessible from '@/app/components/EllipsisAccessible';
import EllipsisStatusText from '@/app/components/EllipsisStatusText';
import RecalculateVisibilityForm from './RecalculateVisibilityForm';
import { pipelineIngestionProvenanceLabel } from '@/lib/ingestion/sourceDisplayLabel';
import type { PipelineIngestionSource } from '@/lib/pipeline/types';
import { GSC_SUMMARY_UI_NARROW_MAX } from '@/lib/ingestion/gscDiagnostics';
import type { VisibilityReasonV1 } from '@/lib/visibility/scoreV1';

type Props = {
  organizationId: string;
  canRecalculate: boolean;
  latest: {
    score: number;
    createdAt: string;
    reasons: VisibilityReasonV1[];
    pipelineRunId?: string | null;
    pipelineIngestionSource?: PipelineIngestionSource | null;
    pipelineGscDiagnosticsSummary?: string | null;
    signalSource?: 'cache' | 'live';
    signalCacheKind?: 'ttl' | 'stale_fallback' | null;
    signalsAsOf?: string | null;
    signalCount?: number;
    /** Share of brand mentions in latest pipeline document text (0–1), when computable. */
    pipelineBrandShareOfVoice?: number | null;
    /** Whether mention-share points use LLM answers or the trend snapshot. */
    mentionShareSource?: 'llm_answers' | 'trend_snapshot';
    llmAvgBrandShareOfMentions?: number | null;
    llmShareSampleCount?: number;
    llmBrandTopOrTiedRate?: number | null;
    llmAnswerSamplesScanned?: number;
  } | null;
};

const SIGNAL_FRESH_MS = 24 * 60 * 60 * 1000;

function signalFreshness(iso: string | null | undefined): { label: string; tone: 'ok' | 'warn' | 'none' } {
  if (!iso) {
    return { label: 'no signal timestamp', tone: 'none' };
  }
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) {
    return { label: 'invalid signal timestamp', tone: 'warn' };
  }
  const ageMs = Date.now() - ts;
  if (ageMs <= SIGNAL_FRESH_MS) {
    return { label: 'fresh', tone: 'ok' };
  }
  const ageHours = Math.max(1, Math.floor(ageMs / (60 * 60 * 1000)));
  return { label: `stale (${ageHours}h)`, tone: 'warn' };
}

export default function VisibilityScoreCard({ organizationId, canRecalculate, latest }: Props) {
  const freshness = latest ? signalFreshness(latest.signalsAsOf) : null;
  return (
    <div className="panel-box-info mb-28">
      <h2 className="mt-0">Visibility score (v1)</h2>
      <p className="text-muted-note mt-0">
        Heuristic score: <strong>mention share</strong> comes from recent{' '}
        <Link href="/settings/prompts">LLM answer samples</Link> when they mention your tracked brands; otherwise from
        the trend snapshot. Pipeline document mention share, pipeline metadata, and connector signals (when configured)
        also contribute.{' '}
        <Link
          href={`/api/orgs/${organizationId}/visibility`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open visibility JSON API in a new tab"
        >
          JSON API
        </Link>
        {' · '}
        <Link
          href={`/api/orgs/${organizationId}/connectors`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open connector health API in a new tab"
        >
          Connector health
        </Link>
      </p>

      {!latest ? (
        <p className="mb-12">
          No score recorded yet. Run a <Link href="/reports">pipeline or trend job</Link>, or recalculate below.
        </p>
      ) : (
        <>
          <p className="score-display-lg">{Math.round(latest.score)}</p>
          <p className="text-muted-small-subtle mt-0">
            Last updated: {new Date(latest.createdAt).toLocaleString()}
            {` · pipeline docs: ${pipelineIngestionProvenanceLabel(latest.pipelineIngestionSource)}`}
            {latest.pipelineGscDiagnosticsSummary && latest.pipelineRunId ? (
              <>
                {' · '}
                <Link
                  href={`/reports/runs/${latest.pipelineRunId}#gsc-diagnostics`}
                  className="text-priority-muted"
                  title={latest.pipelineGscDiagnosticsSummary}
                >
                  GSC:{' '}
                  <EllipsisAccessible
                    value={latest.pipelineGscDiagnosticsSummary}
                    maxChars={GSC_SUMMARY_UI_NARROW_MAX}
                  />
                </Link>
              </>
            ) : null}
            {latest.signalSource ? ` · signals: ${latest.signalSource}` : ''}
            {typeof latest.signalCount === 'number' ? ` · count: ${latest.signalCount}` : ''}
            {latest.signalsAsOf ? ` · asOf: ${latest.signalsAsOf}` : ''}
          </p>
          {latest.mentionShareSource === 'llm_answers' &&
          typeof latest.llmAvgBrandShareOfMentions === 'number' &&
          typeof latest.llmShareSampleCount === 'number' ? (
            <p className="text-muted-note mt-8 mb-0">
              <strong>LLM answers</strong> (last {latest.llmAnswerSamplesScanned ?? '—'} stored samples): your brand’s
              avg mention share is {(latest.llmAvgBrandShareOfMentions * 100).toFixed(1)}% across{' '}
              {latest.llmShareSampleCount} answer(s) with any tracked-brand mention
              {typeof latest.llmBrandTopOrTiedRate === 'number'
                ? ` · top/tied on mentions in ${(latest.llmBrandTopOrTiedRate * 100).toFixed(0)}% of those`
                : ''}
              .
            </p>
          ) : (
            <p className="text-muted-note mt-8 mb-0">
              <strong>Mention share</strong> is using the <strong>trend snapshot</strong> (mock leaderboard). Capture
              LLM answers under <Link href="/settings/prompts">Tracked prompts</Link> to drive the score from real model
              output.
            </p>
          )}
          {typeof latest.pipelineBrandShareOfVoice === 'number' ? (
            <p className="text-muted-note mt-8 mb-0">
              Brand share in pipeline documents: {(latest.pipelineBrandShareOfVoice * 100).toFixed(1)}% (ingested page
              text vs saved competitors — separate from LLM mention share above).
            </p>
          ) : null}
          {freshness ? (
            <p className="status-chip-row">
              <span className={`status-chip status-chip-${freshness.tone}`}>signal recency: {freshness.label}</span>
            </p>
          ) : null}
          {latest.signalCacheKind === 'stale_fallback' ? (
            <p className="text-muted-note mt-8 mb-0" role="status">
              Live connector fetch returned no metrics; this score uses the last cached signals. Try{' '}
              <Link href="/settings/connectors">Fetch live signals</Link> on Connectors, then recalculate.
            </p>
          ) : null}
          <h3 className="subheading-sm">Why it changed (last run)</h3>
          <ul className="list-indent">
            {latest.reasons.map((r, index) => (
              <li key={`${r.code}-${index}`} className="li-tight">
                <EllipsisStatusText text={r.message} />
              </li>
            ))}
          </ul>
        </>
      )}

      {canRecalculate ? (
        <RecalculateVisibilityForm organizationId={organizationId} />
      ) : (
        <p className="text-muted-small mt-12">
          Ask an editor or admin to recalculate if needed (viewer role).
        </p>
      )}

      <p className="text-muted-xs mt-12">
        GSC: <code>GSC_SITE_URL</code> + credentials. GA4: <code>GA4_PROPERTY_ID</code> + credentials (same inline JSON
        vars as connectors page).
      </p>
    </div>
  );
}


