import { describe, expect, it } from 'vitest';

import { membershipCanEdit } from './roles';

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
