import EllipsisAccessible from '@/app/components/EllipsisAccessible';
import GapOpportunityGscRunLink from '@/app/components/GapOpportunityGscRunLink';
import { GSC_SUMMARY_UI_STATUS_MAX } from '@/lib/ingestion/gscDiagnostics';
import {
  GAP_OPPORTUNITY_DETAIL_TITLE_THRESHOLD_CHARS,
  type GapOpportunity
} from '@/lib/insights/gap';

export type GapOpportunityListItemPriorityStyle = 'parens' | 'brackets' | 'bracketsMuted';

export default function GapOpportunityListItem({
  opportunity,
  className,
  priorityStyle
}: {
  opportunity: GapOpportunity;
  className?: string;
  priorityStyle: GapOpportunityListItemPriorityStyle;
}) {
  const priorityMark =
    priorityStyle === 'parens' ? (
      <> ({opportunity.priority})</>
    ) : priorityStyle === 'bracketsMuted' ? (
      <>
        {' '}
        <span className="text-priority-muted">[{opportunity.priority}]</span>
      </>
    ) : (
      <> [{opportunity.priority}]</>
    );

  return (
    <li className={className}>
      <strong>
        <EllipsisAccessible value={opportunity.title} maxChars={GSC_SUMMARY_UI_STATUS_MAX} />
      </strong>
      {priorityMark}
      {' — '}
      <EllipsisAccessible value={opportunity.detail} maxChars={GAP_OPPORTUNITY_DETAIL_TITLE_THRESHOLD_CHARS} />
      <GapOpportunityGscRunLink opportunity={opportunity} />
    </li>
  );
}
