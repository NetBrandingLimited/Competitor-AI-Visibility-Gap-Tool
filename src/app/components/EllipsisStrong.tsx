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
  return <strong title={parts.title}>{parts.display}</strong>;
}
