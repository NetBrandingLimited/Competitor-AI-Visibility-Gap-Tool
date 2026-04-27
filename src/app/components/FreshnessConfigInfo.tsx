import DebugConfigActions from '@/app/components/DebugConfigActions';
import { FreshnessMisconfiguredNotice, FreshnessThresholdsHint } from '@/lib/ui/freshness';

type FreshnessConfigInfoProps = {
  freshHours: number;
  agingHours: number;
  misconfigured: boolean;
  prefix?: string;
};

export default function FreshnessConfigInfo({
  freshHours,
  agingHours,
  misconfigured,
  prefix
}: FreshnessConfigInfoProps) {
  return (
    <>
      <FreshnessThresholdsHint freshHours={freshHours} agingHours={agingHours} prefix={prefix} />
      <DebugConfigActions />
      {misconfigured ? <FreshnessMisconfiguredNotice /> : null}
    </>
  );
}
