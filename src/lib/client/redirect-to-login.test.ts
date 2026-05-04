import { afterEach, describe, expect, it, vi } from 'vitest';

import { redirectToLogin } from './redirect-to-login';

describe('redirectToLogin', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('no-ops when window is undefined', () => {
    vi.stubGlobal('window', undefined);
    expect(() => redirectToLogin()).not.toThrow();
  });

  it('navigates to /login when no safe next path', () => {
    const assign = vi.fn();
    vi.stubGlobal('window', { location: { assign } } as unknown as Window);
    redirectToLogin(undefined);
    expect(assign).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith('/login');
  });

  it('navigates to /login with encoded next for safe paths', () => {
    const assign = vi.fn();
    vi.stubGlobal('window', { location: { assign } } as unknown as Window);
    redirectToLogin('/dashboard');
    expect(assign).toHaveBeenCalledWith('/login?next=%2Fdashboard');
  });

  it('omits next for unsafe paths', () => {
    const assign = vi.fn();
    vi.stubGlobal('window', { location: { assign } } as unknown as Window);
    redirectToLogin('//evil.com');
    expect(assign).toHaveBeenCalledWith('/login');
  });
});
