import { afterEach, describe, expect, it, vi } from 'vitest';

import { getFreshnessConfig, getFreshnessThresholds } from './freshness';

describe('getFreshnessThresholds', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses defaults when env is unset or empty', () => {
    delete process.env.FRESH_HOURS;
    delete process.env.AGING_HOURS;
    const t = getFreshnessThresholds();
    expect(t.freshHours).toBe(24);
    expect(t.agingHours).toBe(72);
    expect(t.misconfigured).toBe(false);
  });

  it('reads positive numeric env values', () => {
    vi.stubEnv('FRESH_HOURS', '12');
    vi.stubEnv('AGING_HOURS', '48');
    const t = getFreshnessThresholds();
    expect(t.freshHours).toBe(12);
    expect(t.agingHours).toBe(48);
    expect(t.misconfigured).toBe(false);
  });

  it('marks misconfigured when aging is less than fresh', () => {
    vi.stubEnv('FRESH_HOURS', '48');
    vi.stubEnv('AGING_HOURS', '24');
    const t = getFreshnessThresholds();
    expect(t.misconfigured).toBe(true);
  });

  it('falls back to defaults for non-finite or non-positive values', () => {
    vi.stubEnv('FRESH_HOURS', 'nan');
    vi.stubEnv('AGING_HOURS', '0');
    const t = getFreshnessThresholds();
    expect(t.freshHours).toBe(24);
    expect(t.agingHours).toBe(72);
  });
});

describe('getFreshnessConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns thresholds and matching input', () => {
    vi.stubEnv('FRESH_HOURS', '6');
    vi.stubEnv('AGING_HOURS', '30');
    const c = getFreshnessConfig();
    expect(c.thresholds.freshHours).toBe(6);
    expect(c.thresholds.agingHours).toBe(30);
    expect(c.thresholds.misconfigured).toBe(false);
    expect(c.input).toEqual({ freshHours: 6, agingHours: 30 });
  });
});
