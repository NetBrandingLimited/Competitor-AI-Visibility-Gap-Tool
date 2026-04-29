import { describe, expect, it } from 'vitest';

import { truncateUrlForDisplay } from './DocumentUrlCell';

describe('truncateUrlForDisplay', () => {
  it('returns short strings unchanged', () => {
    expect(truncateUrlForDisplay('https://a.com/x', 72)).toBe('https://a.com/x');
  });

  it('truncates with ellipsis', () => {
    const long = 'https://example.com/' + 'path/'.repeat(30);
    const out = truncateUrlForDisplay(long, 20);
    expect(out.length).toBe(20);
    expect(out.endsWith('…')).toBe(true);
  });
});
