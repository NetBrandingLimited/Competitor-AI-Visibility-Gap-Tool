export const ORG_ROLES = ['VIEWER', 'EDITOR', 'ADMIN'] as const;

export type OrgRole = (typeof ORG_ROLES)[number];

const ROLE_RANK: Record<OrgRole, number> = {
  VIEWER: 0,
  EDITOR: 1,
  ADMIN: 2
};

export function isOrgRole(value: string): value is OrgRole {
  return (ORG_ROLES as readonly string[]).includes(value);
}

export function roleSatisfies(role: OrgRole, minimum: OrgRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}
