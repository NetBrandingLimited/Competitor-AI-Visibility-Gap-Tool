import { formatAge } from '@/lib/format/age';

export type FreshnessLabel = 'Fresh' | 'Aging' | 'Stale' | 'Missing';

export function getFreshnessLabel(
  iso: string | null,
  thresholds: { freshHours: number; agingHours: number }
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
  missingText = 'no data'
}: {
  iso: string | null;
  thresholds: { freshHours: number; agingHours: number };
  missingText?: string;
}) {
  if (!iso) {
    return (
      <>
        {missingText}
        <FreshnessPill label="Missing" />
      </>
    );
  }
  return (
    <>
      {formatAge(iso)}
      <FreshnessPill label={getFreshnessLabel(iso, thresholds)} />
    </>
  );
}
