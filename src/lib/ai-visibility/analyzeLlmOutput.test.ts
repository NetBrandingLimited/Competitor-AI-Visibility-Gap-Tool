import { describe, expect, it } from 'vitest';

import { analyzeLlmOutput } from './analyzeLlmOutput';

describe('analyzeLlmOutput', () => {
  const org = {
    brandName: 'Acme',
    category: 'SaaS',
    competitorA: 'BetaCo',
    competitorB: null,
    competitorC: null
  };

  it('returns null when answer text is empty', () => {
    expect(analyzeLlmOutput('', org)).toBeNull();
    expect(analyzeLlmOutput('   ', org)).toBeNull();
  });

  it('returns null when org has no tracked brand names', () => {
    expect(analyzeLlmOutput('Acme wins', {})).toBeNull();
    expect(analyzeLlmOutput('Acme wins', { brandName: '', competitorA: null })).toBeNull();
  });

  it('counts mentions and share for workspace brand', () => {
    const a = analyzeLlmOutput(
      'Acme is strong. BetaCo is ok. Acme again beats BetaCo for most teams.',
      org
    );
    expect(a).not.toBeNull();
    expect(a!.mentionsByBrand.Acme).toBe(2);
    expect(a!.mentionsByBrand.BetaCo).toBe(2);
    expect(a!.totalMentions).toBe(4);
    expect(a!.brandShareOfMentions).toBeCloseTo(0.5, 5);
    expect(a!.brandIsTopOrTied).toBe(true);
  });

  it('marks when competitor leads on mentions', () => {
    const a = analyzeLlmOutput('BetaCo BetaCo BetaCo is the winner. Acme is fine.', org);
    expect(a!.topBrandByMentions).toBe('BetaCo');
    expect(a!.brandIsTopOrTied).toBe(false);
    expect(a!.brandShareOfMentions).toBeLessThan(0.5);
  });
});
