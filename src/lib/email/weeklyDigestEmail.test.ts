import { afterEach, describe, expect, it, vi } from 'vitest';

import type { WeeklyDigestSummary } from '@/lib/digest/weekly';

import { sendWeeklyDigestEmail } from './weeklyDigestEmail';

const summary: WeeklyDigestSummary = {
  score: 42,
  signalSource: 'cache',
  topOpportunities: ['Opportunity one']
};

const baseParams = {
  orgName: 'Acme Inc',
  periodStart: '2026-01-01',
  periodEnd: '2026-01-07',
  generatedAt: '2026-01-08T12:00:00.000Z',
  summary
};

describe('sendWeeklyDigestEmail', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns no_recipient when to is missing or only whitespace', async () => {
    for (const to of [null, undefined, '', '  \t  ']) {
      const result = await sendWeeklyDigestEmail({ ...baseParams, to: to as null });
      expect(result).toEqual({ sent: false, reason: 'no_recipient' });
    }
  });

  it('returns no_provider_config when Resend and SMTP env are not set', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('RESEND_FROM_EMAIL', '');
    vi.stubEnv('SMTP_URL', '');
    vi.stubEnv('SMTP_FROM', '');
    vi.stubEnv('EMAIL_FROM', '');

    const result = await sendWeeklyDigestEmail({
      ...baseParams,
      to: 'ops@example.com'
    });

    expect(result).toEqual({ sent: false, reason: 'no_provider_config' });
  });
});
