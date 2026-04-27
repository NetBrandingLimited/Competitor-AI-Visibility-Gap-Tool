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
    <div
      style={{
        marginBottom: 28,
        padding: 16,
        border: '1px solid #ddd',
        borderRadius: 8,
        background: '#f8fafc'
      }}
    >
      <h2 style={{ marginTop: 0 }}>Visibility score (v1)</h2>
      <p style={{ marginTop: 0, color: '#444', fontSize: 14 }}>
        Heuristic score from your latest mock pipeline + trend snapshot + connector signals (when configured).{' '}
        <Link href={`/api/orgs/${organizationId}/visibility`} target="_blank" rel="noreferrer">
          JSON API
        </Link>
        {' · '}
        <Link href={`/api/orgs/${organizationId}/connectors`} target="_blank" rel="noreferrer">
          Connector health
        </Link>
      </p>

      {!latest ? (
        <p style={{ marginBottom: 12 }}>
          No score recorded yet. Run a <Link href="/reports">pipeline or trend job</Link>, or recalculate below.
        </p>
      ) : (
        <>
          <p style={{ fontSize: 34, fontWeight: 700, margin: '8px 0' }}>{Math.round(latest.score)}</p>
          <p style={{ color: '#555', fontSize: 13, marginTop: 0 }}>
            Last updated: {new Date(latest.createdAt).toLocaleString()}
            {latest.signalSource ? ` · signals: ${latest.signalSource}` : ''}
            {typeof latest.signalCount === 'number' ? ` · count: ${latest.signalCount}` : ''}
            {latest.signalsAsOf ? ` · asOf: ${latest.signalsAsOf}` : ''}
          </p>
          {freshness ? (
            <p style={{ marginTop: -2, marginBottom: 10 }}>
              <span className={`status-chip status-chip-${freshness.tone}`}>signal recency: {freshness.label}</span>
            </p>
          ) : null}
          <h3 style={{ fontSize: 15, marginBottom: 8 }}>Why it changed (last run)</h3>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {latest.reasons.map((r) => (
              <li key={`${r.code}-${r.message.slice(0, 24)}`} style={{ marginBottom: 6 }}>
                {r.message}
              </li>
            ))}
          </ul>
        </>
      )}

      {canRecalculate ? (
        <RecalculateVisibilityForm organizationId={organizationId} />
      ) : (
        <p style={{ marginTop: 12, fontSize: 13, color: '#666' }}>
          Ask an editor or admin to recalculate if needed (viewer role).
        </p>
      )}

      <p style={{ marginTop: 12, fontSize: 12, color: '#666' }}>
        GSC: <code>GSC_SITE_URL</code> + credentials. GA4: <code>GA4_PROPERTY_ID</code> + credentials (same inline JSON
        vars as connectors page).
      </p>
    </div>
  );
}
