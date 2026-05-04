import { beforeEach, describe, expect, it, vi } from 'vitest';

const redirectMock = vi.hoisted(() =>
  vi.fn<(url: string) => never>(() => {
    throw new Error('redirect');
  })
);

vi.mock('next/navigation', () => ({
  redirect: redirectMock
}));

import { redirectUnauthenticatedToLogin } from './redirect-unauthenticated-to-login';

describe('redirectUnauthenticatedToLogin', () => {
  beforeEach(() => {
    redirectMock.mockClear();
    redirectMock.mockImplementation(() => {
      throw new Error('redirect');
    });
  });

  it('calls redirect with /login and encoded next for safe return paths', () => {
    expect(() => redirectUnauthenticatedToLogin('/reports')).toThrow('redirect');
    expect(redirectMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).toHaveBeenCalledWith('/login?next=%2Freports');
  });

  it('calls redirect with bare /login when return path is not a safe next value', () => {
    expect(() => redirectUnauthenticatedToLogin('//evil.com')).toThrow('redirect');
    expect(redirectMock).toHaveBeenCalledWith('/login');
  });

  it('encodes query and path in next', () => {
    expect(() => redirectUnauthenticatedToLogin('/ops?next=%2Freports')).toThrow('redirect');
    expect(redirectMock).toHaveBeenCalledWith(
      `/login?next=${encodeURIComponent('/ops?next=%2Freports')}`
    );
  });
});
