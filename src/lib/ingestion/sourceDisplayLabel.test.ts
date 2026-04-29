import { describe, expect, it } from 'vitest';

import { ingestionSourceDisplayLabel } from './sourceDisplayLabel';

describe('ingestionSourceDisplayLabel', () => {
  it('maps known connector ids', () => {
    expect(ingestionSourceDisplayLabel('google_search_console')).toBe('Search Console');
    expect(ingestionSourceDisplayLabel('reddit-mock')).toBe('Reddit (mock)');
    expect(ingestionSourceDisplayLabel('hn-mock')).toBe('Hacker News (mock)');
  });

  it('returns unknown values unchanged', () => {
    expect(ingestionSourceDisplayLabel('future_connector')).toBe('future_connector');
  });
});
