import {
  GSC_SUMMARY_UI_TABLE_MAX,
  tableCellEllipsisParts
} from '@/lib/ingestion/gscDiagnostics';

type Props = {
  value: string;
  maxChars?: number;
  className?: string;
  as?: 'span' | 'code' | 'div';
};

/**
 * Truncated text with hover `title` plus screen-reader full value (not only `title`, which AT often skips).
 */
export default function EllipsisAccessible({
  value,
  maxChars = GSC_SUMMARY_UI_TABLE_MAX,
  className,
  as = 'span'
}: Props) {
  const m = tableCellEllipsisParts(value, maxChars);
  const Tag = as;

  if (!m.title) {
    return <Tag className={className}>{m.display}</Tag>;
  }

  return (
    <Tag className={className} title={m.title}>
      <span aria-hidden="true">{m.display}</span>
      <span className="sr-only">{m.title}</span>
    </Tag>
  );
}
