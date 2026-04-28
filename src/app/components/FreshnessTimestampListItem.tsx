import type { FreshnessThresholdInput } from '@/lib/config/freshness';
import { FreshnessLine } from '@/lib/ui/freshness';

type FreshnessTimestampListItemProps = {
  label: string;
  iso: string | null;
  thresholds: FreshnessThresholdInput;
  fallbackText: string;
  showTimestamp?: boolean;
};

export default function FreshnessTimestampListItem({
  label,
  iso,
  thresholds,
  fallbackText,
  showTimestamp = true
}: FreshnessTimestampListItemProps) {
  return (
    <li>
      <code>{label}</code>
      {showTimestamp ? <>: {iso ? new Date(iso).toLocaleString() : fallbackText}</> : ': '}
      <span className="ml-6">
        <FreshnessLine iso={iso} thresholds={thresholds} muted parenthesized />
      </span>
    </li>
  );
}
