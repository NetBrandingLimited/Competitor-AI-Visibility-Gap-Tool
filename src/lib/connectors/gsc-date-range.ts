/** YYYY-MM-DD in UTC (Search Console expects date-only strings). */
export function formatGscDateUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Rolling window ending today (UTC). Start/end are inclusive (GSC), so span is exactly `days` calendar days. */
export function rollingGscWindowDays(days: number): { startDate: string; endDate: string; asOf: string } {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const endDate = formatGscDateUtc(end);
  return {
    startDate: formatGscDateUtc(start),
    endDate,
    asOf: endDate
  };
}
