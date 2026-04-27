/** HttpOnly cookie storing authenticated user id after password login. */
export const SESSION_USER_ID_COOKIE = 'session_user_id';

/** Active organization for this browser session (pipeline, reports, trends). */
export const SESSION_ORG_ID_COOKIE = 'session_org_id';

/** Legacy dev cookie (email); cleared on logout. */
export const LEGACY_DEV_SESSION_EMAIL_COOKIE = 'dev_session_email';

export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function sessionCookieBase() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  };
}
