import { GAP_TOPIC_LABEL_TITLE_THRESHOLD_CHARS } from '@/lib/insights/gap';
import { tableCellEllipsisParts } from '@/lib/ingestion/gscDiagnostics';

export default function GapTopicLabelCell({
  topic,
  className = 'data-table-td'
}: {
  topic: string;
  className?: string;
}) {
  const parts = tableCellEllipsisParts(topic, GAP_TOPIC_LABEL_TITLE_THRESHOLD_CHARS);
  return (
    <td className={className} title={parts.title}>
      {parts.display}
    </td>
  );
}
