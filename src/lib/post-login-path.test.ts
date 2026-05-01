import { describe, expect, it } from 'vitest';

import {
  DEFAULT_POST_LOGIN_PATH,
  safeLoginNextQuery,
  safePostLoginPath
} from './post-login-path';

describe('safePostLoginPath', () => {
  it('allows relative paths and rejects open redirects', () => {
    expect(safePostLoginPath('/dashboard')).toBe('/dashboard');
    expect(safePostLoginPath('//evil.com')).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(safePostLoginPath('https://evil')).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(safePostLoginPath('')).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(safePostLoginPath(undefined)).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(safePostLoginPath(null)).toBe(DEFAULT_POST_LOGIN_PATH);
  });

  it('trims whitespace', () => {
    expect(safePostLoginPath(' /ops ')).toBe('/ops');
  });
});

describe('safeLoginNextQuery', () => {
  it('returns null when unsafe or empty', () => {
    expect(safeLoginNextQuery(undefined)).toBe(null);
    expect(safeLoginNextQuery('//x')).toBe(null);
    expect(safeLoginNextQuery('https://example.com')).toBe(null);
    expect(safeLoginNextQuery('')).toBe(null);
  });

  it('returns path when safe', () => {
    expect(safeLoginNextQuery('/reports')).toBe('/reports');
  });
});
