/** Truncate URL or URI for table cells (ellipsis when longer than maxLen). */
export function truncateUrlForDisplay(url: string, maxLen: number): string {
  const t = url.trim();
  if (t.length <= maxLen) {
    return t;
  }
  return `${t.slice(0, Math.max(0, maxLen - 1))}…`;
}

function truncatedUriTitle(full: string, display: string): string | undefined {
  return display.length < full.length ? full : undefined;
}

type Props = {
  url: string;
  /** Max characters shown in the cell (full value still in link `title` for http(s)). */
  maxDisplayLength?: number;
};

/** Renders a web link for http(s) URLs; otherwise a `code` element (e.g. synthetic `gsc://` URIs). */
export default function DocumentUrlCell({ url, maxDisplayLength = 72 }: Props) {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    const label = truncateUrlForDisplay(trimmed, maxDisplayLength);
    return (
      <a href={trimmed} target="_blank" rel="noopener noreferrer" title={trimmed}>
        {label}
      </a>
    );
  }
  const codeLabel = truncateUrlForDisplay(trimmed, maxDisplayLength);
  return <code title={truncatedUriTitle(trimmed, codeLabel)}>{codeLabel}</code>;
}
