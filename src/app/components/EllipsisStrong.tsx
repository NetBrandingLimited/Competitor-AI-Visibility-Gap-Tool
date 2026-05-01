import {
  GSC_SUMMARY_UI_STATUS_MAX,
  tableCellEllipsisParts
} from '@/lib/ingestion/gscDiagnostics';

type Props = {
  text: string;
  maxChars?: number;
};

/** Dense headers: ellipsis + native `title` when `text` exceeds `maxChars` (default matches status-line width). */
export default function EllipsisStrong({ text, maxChars = GSC_SUMMARY_UI_STATUS_MAX }: Props) {
  const parts = tableCellEllipsisParts(text, maxChars);
  if (!parts.title) {
    return <strong>{parts.display}</strong>;
  }
  return (
    <strong title={parts.title}>
      <span aria-hidden="true">{parts.display}</span>
      <span className="sr-only">{parts.title}</span>
    </strong>
  );
}
