import { GAP_TOPIC_RECOMMENDATION_TITLE_THRESHOLD_CHARS } from '@/lib/insights/gap';
import { tableCellEllipsisParts } from '@/lib/ingestion/gscDiagnostics';

export default function GapTopicRecommendationCell({
  recommendation,
  className = 'data-table-td'
}: {
  recommendation: string;
  className?: string;
}) {
  const parts = tableCellEllipsisParts(recommendation, GAP_TOPIC_RECOMMENDATION_TITLE_THRESHOLD_CHARS);
  return (
    <td className={className} title={parts.title}>
      {parts.display}
    </td>
  );
}
