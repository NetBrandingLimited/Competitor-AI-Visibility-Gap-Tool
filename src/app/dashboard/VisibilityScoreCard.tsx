import Link from 'next/link';

import RecalculateVisibilityForm from './RecalculateVisibilityForm';
import type { VisibilityReasonV1 } from '@/lib/visibility/scoreV1';

type Props = {
  organizationId: string;
  canRecalculate: boolean;
  latest: {
    score: number;
    createdAt: string;
    reasons: VisibilityReasonV1[];
    signalSource?: 'cache' | 'live';
    signalCacheKind?: 'ttl' | 'stale_fallback' | null;
    signalsAsOf?: string | null;
    signalCount?: number;
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
        Heuristic score from your latest mock pipeline + trend snapshot + connector signals (when configured).{' '}
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
            {latest.signalSource ? ` · signals: ${latest.signalSource}` : ''}
            {typeof latest.signalCount === 'number' ? ` · count: ${latest.signalCount}` : ''}
            {latest.signalsAsOf ? ` · asOf: ${latest.signalsAsOf}` : ''}
          </p>
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
            {latest.reasons.map((r) => (
              <li key={`${r.code}-${r.message.slice(0, 24)}`} className="li-tight">
                {r.message}
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


