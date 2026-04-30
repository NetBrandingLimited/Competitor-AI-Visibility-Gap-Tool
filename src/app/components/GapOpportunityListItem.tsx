import GapOpportunityGscRunLink from '@/app/components/GapOpportunityGscRunLink';
import { GSC_SUMMARY_UI_STATUS_MAX, tableCellEllipsisParts } from '@/lib/ingestion/gscDiagnostics';
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
  const titleParts = tableCellEllipsisParts(opportunity.title, GSC_SUMMARY_UI_STATUS_MAX);
  const detailParts = tableCellEllipsisParts(
    opportunity.detail,
    GAP_OPPORTUNITY_DETAIL_TITLE_THRESHOLD_CHARS
  );

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
      <strong title={titleParts.title}>{titleParts.display}</strong>
      {priorityMark}
      {' — '}
      <span title={detailParts.title}>{detailParts.display}</span>
      <GapOpportunityGscRunLink opportunity={opportunity} />
    </li>
  );
}
