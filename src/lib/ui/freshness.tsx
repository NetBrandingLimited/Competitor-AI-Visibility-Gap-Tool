import { formatAge } from '@/lib/format/age';
import type { ReactNode } from 'react';

export type FreshnessLabel = 'Fresh' | 'Aging' | 'Stale' | 'Missing';
export type FreshnessThresholdInput = {
  freshHours: number;
  agingHours: number;
};

export function getFreshnessLabel(
  iso: string | null,
  thresholds: FreshnessThresholdInput
): FreshnessLabel {
  if (!iso) {
    return 'Missing';
  }
  const ageMs = Date.now() - new Date(iso).getTime();
  if (ageMs <= thresholds.freshHours * 60 * 60 * 1000) {
    return 'Fresh';
  }
  if (ageMs <= thresholds.agingHours * 60 * 60 * 1000) {
    return 'Aging';
  }
  return 'Stale';
}

export function freshnessColor(label: FreshnessLabel): string {
  switch (label) {
    case 'Fresh':
      return '#166534';
    case 'Aging':
      return '#a16207';
    case 'Stale':
      return '#b91c1c';
    default:
      return '#6b7280';
  }
}

export function FreshnessPill({ label }: { label: FreshnessLabel }) {
  return (
    <span
      style={{
        marginLeft: 8,
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        color: '#fff',
        background: freshnessColor(label)
      }}
    >
      {label}
    </span>
  );
}

export function FreshnessLine({
  iso,
  thresholds,
  missingText = 'no data',
  muted = false,
  parenthesized = false
}: {
  iso: string | null;
  thresholds: FreshnessThresholdInput;
  missingText?: string;
  muted?: boolean;
  parenthesized?: boolean;
}) {
  const wrapperStyle = muted ? { color: '#6b7280' } : undefined;

  if (!iso) {
    return (
      <span style={wrapperStyle}>
        {parenthesized ? '(' : null}
        {missingText}
        <FreshnessPill label="Missing" />
        {parenthesized ? ')' : null}
      </span>
    );
  }
  return (
    <span style={wrapperStyle}>
      {parenthesized ? '(' : null}
      {formatAge(iso)}
      <FreshnessPill label={getFreshnessLabel(iso, thresholds)} />
      {parenthesized ? ')' : null}
    </span>
  );
}

export function FreshnessMisconfiguredNotice() {
  return (
    <p
      style={{
        marginTop: 8,
        marginBottom: 8,
        color: '#b91c1c',
        background: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: 6,
        padding: '8px 10px',
        maxWidth: 760
      }}
    >
      Warning: <code>AGING_HOURS</code> is lower than <code>FRESH_HOURS</code>. Set
      <code> AGING_HOURS &gt;= FRESH_HOURS</code> to keep freshness labels consistent.
    </p>
  );
}

export function FreshnessThresholdsHint({
  freshHours,
  agingHours,
  prefix = 'Thresholds:'
}: {
  freshHours: number;
  agingHours: number;
  prefix?: string;
}) {
  return (
    <p style={{ marginTop: 8, marginBottom: 8, fontSize: 12, color: '#6b7280' }}>
      {prefix} <code>Fresh &lt;= {freshHours}h</code>, <code>Aging &lt;= {agingHours}h</code>, otherwise{' '}
      <code>Stale</code>.
    </p>
  );
}

export function FreshnessSectionCard({
  title = 'Data freshness',
  children
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        marginBottom: 16,
        padding: 10,
        border: '1px solid #e5e7eb',
        borderRadius: 6,
        background: '#f8fafc',
        color: '#374151'
      }}
    >
      <strong>{title}</strong>
      {children}
    </div>
  );
}
