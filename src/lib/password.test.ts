import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from './password';

describe('hashPassword / verifyPassword', () => {
  it('round-trips a password', () => {
    const hash = hashPassword('correct horse battery staple');
    expect(hash).not.toContain('correct');
    expect(verifyPassword('correct horse battery staple', hash)).toBe(true);
  });

  it('verifyPassword returns false for missing hash', () => {
    expect(verifyPassword('x', null)).toBe(false);
    expect(verifyPassword('x', undefined)).toBe(false);
    expect(verifyPassword('x', '')).toBe(false);
  });

  it('verifyPassword returns false when plain text does not match', () => {
    const hash = hashPassword('secret-one');
    expect(verifyPassword('secret-two', hash)).toBe(false);
  });
});
