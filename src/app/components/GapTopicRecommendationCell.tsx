import { GAP_TOPIC_RECOMMENDATION_TITLE_THRESHOLD_CHARS } from '@/lib/insights/gap';

export default function GapTopicRecommendationCell({
  recommendation,
  className = 'data-table-td'
}: {
  recommendation: string;
  className?: string;
}) {
  return (
    <td
      className={className}
      title={
        recommendation.length > GAP_TOPIC_RECOMMENDATION_TITLE_THRESHOLD_CHARS ? recommendation : undefined
      }
    >
      {recommendation}
    </td>
  );
}
