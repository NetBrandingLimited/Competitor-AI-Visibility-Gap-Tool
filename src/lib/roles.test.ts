import { describe, expect, it } from 'vitest';

import { isOrgRole, membershipCanEdit, roleSatisfies } from './roles';

describe('isOrgRole', () => {
  it('accepts workspace roles only', () => {
    expect(isOrgRole('VIEWER')).toBe(true);
    expect(isOrgRole('EDITOR')).toBe(true);
    expect(isOrgRole('ADMIN')).toBe(true);
    expect(isOrgRole('OWNER')).toBe(false);
    expect(isOrgRole('')).toBe(false);
  });
});

describe('roleSatisfies', () => {
  it('treats VIEWER as lowest privilege', () => {
    expect(roleSatisfies('VIEWER', 'VIEWER')).toBe(true);
    expect(roleSatisfies('EDITOR', 'VIEWER')).toBe(true);
    expect(roleSatisfies('ADMIN', 'VIEWER')).toBe(true);
    expect(roleSatisfies('VIEWER', 'EDITOR')).toBe(false);
    expect(roleSatisfies('VIEWER', 'ADMIN')).toBe(false);
  });

  it('treats ADMIN as highest privilege', () => {
    expect(roleSatisfies('ADMIN', 'ADMIN')).toBe(true);
    expect(roleSatisfies('EDITOR', 'ADMIN')).toBe(false);
    expect(roleSatisfies('VIEWER', 'ADMIN')).toBe(false);
  });
});

describe('membershipCanEdit', () => {
  it('is false for viewers and invalid strings', () => {
    expect(membershipCanEdit('VIEWER')).toBe(false);
    expect(membershipCanEdit('')).toBe(false);
    expect(membershipCanEdit('OWNER')).toBe(false);
  });

  it('is true for editors and admins', () => {
    expect(membershipCanEdit('EDITOR')).toBe(true);
    expect(membershipCanEdit('ADMIN')).toBe(true);
  });
});
