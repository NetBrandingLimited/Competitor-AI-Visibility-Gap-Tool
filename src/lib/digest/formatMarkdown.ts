import type { WeeklyDigestSummary } from '@/lib/digest/weekly';
import { weeklyDigestSignalsLabel } from '@/lib/digest/weekly';

export function formatWeeklyDigestMarkdown(params: {
  orgName: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  summary: WeeklyDigestSummary;
}): string {
  const { orgName, periodStart, periodEnd, generatedAt, summary } = params;
  const lines: string[] = [
    `# Weekly visibility digest — ${orgName}`,
    '',
    `- **Period:** ${periodStart} → ${periodEnd}`,
    `- **Generated:** ${generatedAt}`,
    `- **Visibility score:** ${summary.score ?? '—'}`,
    `- **Connector signals:** ${weeklyDigestSignalsLabel(summary)}`
  ];
  if (summary.insightsGeneratedAt) {
    lines.push(`- **Insights snapshot:** ${summary.insightsGeneratedAt}`);
  }
  lines.push('', '## Top opportunities (headlines)', '');

  const headlines =
    summary.topOpportunities.length > 0
      ? summary.topOpportunities
      : (summary.opportunities?.slice(0, 3).map((o) => o.title) ?? []);
  lines.push(...headlines.map((o) => `- ${o}`), '');

  if (summary.opportunities && summary.opportunities.length > 0) {
    lines.push('## All opportunities', '');
    for (const o of summary.opportunities) {
      lines.push(`### ${o.title} [${o.priority}]`, '', o.detail, '');
    }
  }

  if (summary.topics && summary.topics.length > 0) {
    lines.push('## Topic gap breakdown', '', '| Topic | Gap score | Triggers | Cluster weight | Recommendation |', '| --- | ---: | ---: | ---: | --- |');
    for (const t of summary.topics) {
      const rec = t.recommendation.replace(/\|/g, '\\|');
      lines.push(
        `| ${t.topic.replace(/\|/g, '\\|')} | ${t.gapScore} | ${t.triggerCount} | ${t.clusterWeight} | ${rec} |`
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}
