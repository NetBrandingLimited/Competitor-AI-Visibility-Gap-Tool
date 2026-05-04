import { afterEach, describe, expect, it, vi } from 'vitest';

import type { WeeklyDigestSummary } from '@/lib/digest/weekly';

const smtpMocks = vi.hoisted(() => {
  const sendMail = vi.fn().mockResolvedValue(undefined);
  const createTransport = vi.fn(() => ({ sendMail }));
  return { sendMail, createTransport };
});

vi.mock('nodemailer', () => ({
  default: { createTransport: smtpMocks.createTransport },
  createTransport: smtpMocks.createTransport
}));

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
    vi.unstubAllGlobals();
    smtpMocks.createTransport.mockClear();
    smtpMocks.sendMail.mockClear();
    smtpMocks.sendMail.mockResolvedValue(undefined);
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

  it('sends via Resend when configured and API returns ok', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key');
    vi.stubEnv('RESEND_FROM_EMAIL', 'digest@example.com');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '{}'
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendWeeklyDigestEmail({
      ...baseParams,
      to: 'recipient@example.com'
    });

    expect(result).toEqual({ sent: true, provider: 'resend' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.from).toBe('digest@example.com');
    expect(body.to).toEqual(['recipient@example.com']);
    expect(String(body.subject)).toContain('Acme Inc');
    expect(String(body.text)).toContain('Opportunity one');
  });

  it('returns error when Resend responds non-ok', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key');
    vi.stubEnv('RESEND_FROM_EMAIL', 'digest@example.com');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        text: async () => '{"message":"invalid"}'
      })
    );

    const result = await sendWeeklyDigestEmail({
      ...baseParams,
      to: 'recipient@example.com'
    });

    expect(result).toEqual({
      sent: false,
      reason: 'error',
      detail: 'Resend 422: {"message":"invalid"}'
    });
  });

  it('returns error when Resend fetch throws', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key');
    vi.stubEnv('RESEND_FROM_EMAIL', 'digest@example.com');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const result = await sendWeeklyDigestEmail({
      ...baseParams,
      to: 'recipient@example.com'
    });

    expect(result).toEqual({
      sent: false,
      reason: 'error',
      detail: 'network down'
    });
  });

  it('sends via SMTP when SMTP_URL and SMTP_FROM are set and Resend is not', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('RESEND_FROM_EMAIL', '');
    vi.stubEnv('SMTP_URL', 'smtps://user:pass@host');
    vi.stubEnv('SMTP_FROM', 'digest@example.com');

    const result = await sendWeeklyDigestEmail({
      ...baseParams,
      to: 'recipient@example.com'
    });

    expect(result).toEqual({ sent: true, provider: 'smtp' });
    expect(smtpMocks.createTransport).toHaveBeenCalledWith('smtps://user:pass@host');
    expect(smtpMocks.sendMail).toHaveBeenCalledTimes(1);
    expect(smtpMocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'digest@example.com',
        to: 'recipient@example.com',
        subject: expect.stringContaining('Acme Inc'),
        text: expect.stringContaining('Opportunity one')
      })
    );
  });

  it('uses EMAIL_FROM when SMTP_FROM is absent from the environment', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('RESEND_FROM_EMAIL', '');
    vi.stubEnv('SMTP_URL', 'smtps://user:pass@host');
    vi.stubEnv('EMAIL_FROM', 'fallback@example.com');
    const hadSmtpFrom = 'SMTP_FROM' in process.env;
    const prevSmtpFrom = process.env.SMTP_FROM;
    delete process.env.SMTP_FROM;

    try {
      const result = await sendWeeklyDigestEmail({
        ...baseParams,
        to: 'recipient@example.com'
      });

      expect(result).toEqual({ sent: true, provider: 'smtp' });
      expect(smtpMocks.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ from: 'fallback@example.com' })
      );
    } finally {
      if (hadSmtpFrom) {
        process.env.SMTP_FROM = prevSmtpFrom;
      }
    }
  });

  it('returns error when SMTP sendMail throws', async () => {
    smtpMocks.sendMail.mockRejectedValueOnce(new Error('smtp refused'));
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('RESEND_FROM_EMAIL', '');
    vi.stubEnv('SMTP_URL', 'smtps://user:pass@host');
    vi.stubEnv('SMTP_FROM', 'digest@example.com');

    const result = await sendWeeklyDigestEmail({
      ...baseParams,
      to: 'recipient@example.com'
    });

    expect(result).toEqual({
      sent: false,
      reason: 'error',
      detail: 'smtp refused'
    });
  });
});
