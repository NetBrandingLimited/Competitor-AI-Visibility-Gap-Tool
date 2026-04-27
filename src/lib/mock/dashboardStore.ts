/**
 * @deprecated Import from `@/lib/org-visibility-mock` for new code.
 * Re-exports org-based visibility mock used by dashboard + trends job.
 */
export type {
  DashboardSnapshot,
  LeaderboardRow,
  OrgBrandFields,
  RecentAnswerRow
} from '@/lib/org-visibility-mock';

export {
  defaultPipelineQueryFromOrg,
  enrichDocumentsWithOrgContext,
  getDashboardSnapshot,
  getDashboardSnapshotForOrganization
} from '@/lib/org-visibility-mock';
