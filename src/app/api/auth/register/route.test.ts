import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { POST } from './route';

function postRegister(body: unknown) {
  return new NextRequest('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
}

describe('POST /api/auth/register', () => {
  it('returns 400 for invalid email', async () => {
    const res = await POST(
      postRegister({ email: 'not-an-email', password: '12345678', organizationName: 'x' })
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error?: string }).error).toBe('invalid_email');
  });

  it('returns 400 when password is too short', async () => {
    const res = await POST(
      postRegister({ email: 'a@b.co', password: 'short', organizationName: 'x' })
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error?: string }).error).toBe('password_too_short');
  });
});
