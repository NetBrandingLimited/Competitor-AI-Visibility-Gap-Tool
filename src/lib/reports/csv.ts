export function escapeCsv(value: string | number): string {
  const raw = String(value);
  // Prevent CSV formula injection when opened in spreadsheet apps.
  const str = /^[=+\-@]/.test(raw) || raw.startsWith('\t') ? `'${raw}` : raw;
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

export function buildCsvDocument(header: string[], rows: Array<Array<string | number>>): string {
  const encodedRows = rows.map((row) => row.map(escapeCsv).join(','));
  return `\uFEFF${[header.join(','), ...encodedRows].join('\n')}`;
}
