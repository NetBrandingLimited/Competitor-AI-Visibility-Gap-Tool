import EllipsisAccessible from '@/app/components/EllipsisAccessible';
import { GAP_TOPIC_LABEL_TITLE_THRESHOLD_CHARS } from '@/lib/insights/gap';

export default function GapTopicLabelCell({
  topic,
  className = 'data-table-td'
}: {
  topic: string;
  className?: string;
}) {
  return (
    <td className={className}>
      <EllipsisAccessible value={topic} maxChars={GAP_TOPIC_LABEL_TITLE_THRESHOLD_CHARS} />
    </td>
  );
}
