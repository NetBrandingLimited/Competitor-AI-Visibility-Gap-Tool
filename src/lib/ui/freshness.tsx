import { formatAge } from '@/lib/format/age';
import type { FreshnessThresholdInput } from '@/lib/config/freshness';
import type { ReactNode } from 'react';

export type FreshnessLabel = 'Fresh' | 'Aging' | 'Stale' | 'Missing';

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
  const variant = label.toLowerCase() as 'fresh' | 'aging' | 'stale' | 'missing';
  return <span className={`freshness-pill freshness-pill--${variant}`}>{label}</span>;
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
  const mutedClass = muted ? 'freshness-line-muted' : undefined;

  if (!iso) {
    return (
      <span className={mutedClass}>
        {parenthesized ? '(' : null}
        {missingText}
        <FreshnessPill label="Missing" />
        {parenthesized ? ')' : null}
      </span>
    );
  }
  return (
    <span className={mutedClass}>
      {parenthesized ? '(' : null}
      {formatAge(iso)}
      <FreshnessPill label={getFreshnessLabel(iso, thresholds)} />
      {parenthesized ? ')' : null}
    </span>
  );
}

export function FreshnessMisconfiguredNotice() {
  return (
    <p className="freshness-warning-box">
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
    <p className="freshness-thresholds-hint">
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
    <div className="freshness-section-card">
      <strong>{title}</strong>
      {children}
    </div>
  );
}
