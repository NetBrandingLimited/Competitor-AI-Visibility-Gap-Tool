import type { ReactNode } from 'react';

import type { FreshnessThresholdInput } from '@/lib/config/freshness';
import { FreshnessLine } from '@/lib/ui/freshness';

type StatusFreshnessItemProps = {
  label: string;
  iso: string | null;
  thresholds: FreshnessThresholdInput;
  children: ReactNode;
};

export default function StatusFreshnessItem({ label, iso, thresholds, children }: StatusFreshnessItemProps) {
  return (
    <li>
      {label}:{' '}
      {iso ? (
        <>
          {children}
          <span style={{ marginLeft: 6 }}>
            <FreshnessLine iso={iso} thresholds={thresholds} muted parenthesized />
          </span>
        </>
      ) : (
        <FreshnessLine iso={null} thresholds={thresholds} missingText="none" />
      )}
    </li>
  );
}
