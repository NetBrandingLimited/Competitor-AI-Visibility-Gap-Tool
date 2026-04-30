import GapOpportunityGscRunLink from '@/app/components/GapOpportunityGscRunLink';
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
  const titleAttr =
    opportunity.detail.length > GAP_OPPORTUNITY_DETAIL_TITLE_THRESHOLD_CHARS
      ? opportunity.detail
      : undefined;

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
    <li className={className} title={titleAttr}>
      <strong>{opportunity.title}</strong>
      {priorityMark}
      {' — '}
      {opportunity.detail}
      <GapOpportunityGscRunLink opportunity={opportunity} />
    </li>
  );
}
