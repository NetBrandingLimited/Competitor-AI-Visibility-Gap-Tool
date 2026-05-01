import {
  GSC_SUMMARY_UI_STATUS_MAX,
  tableCellEllipsisParts
} from '@/lib/ingestion/gscDiagnostics';

type Props = {
  text: string;
  maxChars?: number;
};

/** Status / form feedback: ellipsis with full string in `title` when truncated. */
export default function EllipsisStatusText({ text, maxChars = GSC_SUMMARY_UI_STATUS_MAX }: Props) {
  const m = tableCellEllipsisParts(text, maxChars);
  if (!m.title) {
    return <span>{m.display}</span>;
  }
  return (
    <span title={m.title}>
      <span aria-hidden="true">{m.display}</span>
      <span className="sr-only">{m.title}</span>
    </span>
  );
}
