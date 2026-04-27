import { formatWeeklyDigestMarkdown } from '@/lib/digest/formatMarkdown';
import type { WeeklyDigestSummary } from '@/lib/digest/weekly';

export type SendWeeklyDigestEmailResult =
  | { sent: true; provider: 'resend' | 'smtp' }
  | { sent: false; reason: 'no_recipient' | 'no_provider_config' | 'error'; detail?: string };

export async function sendWeeklyDigestEmail(params: {
  to: string | null | undefined;
  orgName: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  summary: WeeklyDigestSummary;
}): Promise<SendWeeklyDigestEmailResult> {
  const { to, orgName, periodStart, periodEnd, generatedAt, summary } = params;
  const trimmed = to?.trim();
  if (!trimmed) {
    return { sent: false, reason: 'no_recipient' };
  }

  const markdown = formatWeeklyDigestMarkdown({
    orgName,
    periodStart,
    periodEnd,
    generatedAt,
    summary
  });

  const subject = `Weekly visibility digest — ${orgName} (${periodStart}–${periodEnd})`;

  const resendKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM_EMAIL;
  if (resendKey && resendFrom) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: resendFrom,
          to: [trimmed],
          subject,
          text: markdown
        })
      });
      if (!res.ok) {
        const body = await res.text();
        return { sent: false, reason: 'error', detail: `Resend ${res.status}: ${body.slice(0, 500)}` };
      }
      return { sent: true, provider: 'resend' };
    } catch (e) {
      return { sent: false, reason: 'error', detail: e instanceof Error ? e.message : String(e) };
    }
  }

  const smtpUrl = process.env.SMTP_URL;
  const smtpFrom = process.env.SMTP_FROM ?? process.env.EMAIL_FROM;
  if (smtpUrl && smtpFrom) {
    try {
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.createTransport(smtpUrl);
      await transport.sendMail({
        from: smtpFrom,
        to: trimmed,
        subject,
        text: markdown
      });
      return { sent: true, provider: 'smtp' };
    } catch (e) {
      return { sent: false, reason: 'error', detail: e instanceof Error ? e.message : String(e) };
    }
  }

  return { sent: false, reason: 'no_provider_config' };
}
