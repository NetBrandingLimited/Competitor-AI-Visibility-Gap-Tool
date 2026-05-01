import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { POST } from './route';

function postLogin(body: unknown) {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
}

describe('POST /api/auth/login', () => {
  it('returns 400 when username or password is missing', async () => {
    const res = await POST(postLogin({ password: 'x' }));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error?: string }).error).toBe('username_and_password_required');

    const res2 = await POST(postLogin({ username: 'a' }));
    expect(res2.status).toBe(400);
    expect(((await res2.json()) as { error?: string }).error).toBe('username_and_password_required');
  });

  it('returns 400 for whitespace-only username', async () => {
    const res = await POST(postLogin({ username: '   ', password: 'secret' }));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error?: string }).error).toBe('username_and_password_required');
  });
});
