import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { User } from '@prisma/client';
import type { NextRequest } from 'next/server';

const authPrismaMocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  organizationMemberFindUnique: vi.fn()
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: authPrismaMocks.userFindUnique },
    organizationMember: { findUnique: authPrismaMocks.organizationMemberFindUnique }
  }
}));

import { getOrgAuthContext, requireOrgRole } from './auth';
import { LEGACY_DEV_SESSION_EMAIL_COOKIE, SESSION_USER_ID_COOKIE } from './session';

const { userFindUnique, organizationMemberFindUnique } = authPrismaMocks;

const mockUser: User = {
  id: 'user-1',
  email: 'member@example.com',
  username: 'member',
  passwordHash: 'hash',
  name: 'Member',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z')
};

function makeRequest(cookies: Record<string, string>, headers?: Record<string, string>): NextRequest {
  const h = new Headers();
  for (const [k, v] of Object.entries(headers ?? {})) {
    h.set(k, v);
  }
  return {
    cookies: {
      get: (name: string) => {
        const value = cookies[name];
        return value !== undefined ? { name, value } : undefined;
      }
    },
    headers: h
  } as unknown as NextRequest;
}

describe('getOrgAuthContext', () => {
  beforeEach(() => {
    userFindUnique.mockReset();
    organizationMemberFindUnique.mockReset();
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('ALLOW_DEV_AUTH_HEADERS', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns null when session user cookie is missing', async () => {
    const ctx = await getOrgAuthContext(makeRequest({}), 'org-1');
    expect(ctx).toBeNull();
    expect(userFindUnique).not.toHaveBeenCalled();
  });

  it('returns null when user id does not exist', async () => {
    userFindUnique.mockResolvedValue(null);
    const ctx = await getOrgAuthContext(
      makeRequest({ [SESSION_USER_ID_COOKIE]: 'missing-id' }),
      'org-1'
    );
    expect(ctx).toBeNull();
    expect(userFindUnique).toHaveBeenCalledWith({ where: { id: 'missing-id' } });
  });

  it('returns null when user has no membership for the org', async () => {
    userFindUnique.mockResolvedValue(mockUser);
    organizationMemberFindUnique.mockResolvedValue(null);
    const ctx = await getOrgAuthContext(
      makeRequest({ [SESSION_USER_ID_COOKIE]: mockUser.id }),
      'org-1'
    );
    expect(ctx).toBeNull();
  });

  it('returns null when membership role is not a valid OrgRole', async () => {
    userFindUnique.mockResolvedValue(mockUser);
    organizationMemberFindUnique.mockResolvedValue({
      userId: mockUser.id,
      organizationId: 'org-1',
      role: 'INVALID'
    });
    const ctx = await getOrgAuthContext(
      makeRequest({ [SESSION_USER_ID_COOKIE]: mockUser.id }),
      'org-1'
    );
    expect(ctx).toBeNull();
  });

  it('returns context when session user is a member with a valid role', async () => {
    userFindUnique.mockResolvedValue(mockUser);
    organizationMemberFindUnique.mockResolvedValue({
      userId: mockUser.id,
      organizationId: 'org-1',
      role: 'EDITOR'
    });
    const ctx = await getOrgAuthContext(
      makeRequest({ [SESSION_USER_ID_COOKIE]: mockUser.id }),
      'org-1'
    );
    expect(ctx).toEqual({
      user: mockUser,
      organizationId: 'org-1',
      role: 'EDITOR'
    });
  });

  it('resolves user from x-dev-user-email when dev headers are enabled', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ALLOW_DEV_AUTH_HEADERS', 'true');
    userFindUnique.mockResolvedValue(mockUser);
    organizationMemberFindUnique.mockResolvedValue({
      userId: mockUser.id,
      organizationId: 'org-1',
      role: 'VIEWER'
    });
    const ctx = await getOrgAuthContext(
      makeRequest({}, { 'x-dev-user-email': '  Member@Example.COM  ' }),
      'org-1'
    );
    expect(ctx?.role).toBe('VIEWER');
    expect(userFindUnique).toHaveBeenCalledWith({ where: { email: 'member@example.com' } });
  });

  it('prefers session cookie over dev email header', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ALLOW_DEV_AUTH_HEADERS', 'true');
    userFindUnique.mockResolvedValue(mockUser);
    organizationMemberFindUnique.mockResolvedValue({
      userId: mockUser.id,
      organizationId: 'org-1',
      role: 'ADMIN'
    });
    await getOrgAuthContext(
      makeRequest(
        { [SESSION_USER_ID_COOKIE]: mockUser.id },
        { 'x-dev-user-email': 'other@example.com' }
      ),
      'org-1'
    );
    expect(userFindUnique).toHaveBeenCalledTimes(1);
    expect(userFindUnique).toHaveBeenCalledWith({ where: { id: mockUser.id } });
  });

  it('resolves user from legacy dev email cookie when no session id', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ALLOW_DEV_AUTH_HEADERS', 'true');
    userFindUnique.mockResolvedValue(mockUser);
    organizationMemberFindUnique.mockResolvedValue({
      userId: mockUser.id,
      organizationId: 'org-1',
      role: 'VIEWER'
    });
    const ctx = await getOrgAuthContext(
      makeRequest({ [LEGACY_DEV_SESSION_EMAIL_COOKIE]: '  Member@Example.COM  ' }),
      'org-1'
    );
    expect(ctx?.user).toEqual(mockUser);
    expect(userFindUnique).toHaveBeenCalledWith({ where: { email: 'member@example.com' } });
  });
});

describe('requireOrgRole', () => {
  beforeEach(() => {
    userFindUnique.mockReset();
    organizationMemberFindUnique.mockReset();
    vi.stubEnv('NODE_ENV', 'test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await requireOrgRole(makeRequest({}), 'org-1', 'VIEWER');
    expect(res).toBeInstanceOf(Response);
    expect((res as Response).status).toBe(401);
    expect(await (res as Response).json()).toEqual({ error: 'unauthorized' });
  });

  it('returns 403 when role is below minimum', async () => {
    userFindUnique.mockResolvedValue(mockUser);
    organizationMemberFindUnique.mockResolvedValue({
      userId: mockUser.id,
      organizationId: 'org-1',
      role: 'VIEWER'
    });
    const res = await requireOrgRole(
      makeRequest({ [SESSION_USER_ID_COOKIE]: mockUser.id }),
      'org-1',
      'EDITOR'
    );
    expect(res).toBeInstanceOf(Response);
    expect((res as Response).status).toBe(403);
    expect(await (res as Response).json()).toEqual({ error: 'forbidden', required: 'EDITOR' });
  });

  it('returns OrgAuthContext when role satisfies minimum', async () => {
    userFindUnique.mockResolvedValue(mockUser);
    organizationMemberFindUnique.mockResolvedValue({
      userId: mockUser.id,
      organizationId: 'org-1',
      role: 'ADMIN'
    });
    const res = await requireOrgRole(
      makeRequest({ [SESSION_USER_ID_COOKIE]: mockUser.id }),
      'org-1',
      'EDITOR'
    );
    expect(res).toEqual({
      user: mockUser,
      organizationId: 'org-1',
      role: 'ADMIN'
    });
  });
});
