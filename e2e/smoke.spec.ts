import { expect, test, type Page } from '@playwright/test';

/**
 * Public tests always run (parallel by default). Authenticated suite runs when `E2E_AUTH=1` (see CI workflow):
 * migrate, `npm run db:seed` (demo + viewer users), then Playwright.
 *
 * Env (optional): `E2E_USERNAME` / `E2E_PASSWORD` (default demo / demo123),
 * `E2E_VIEWER_USERNAME` / `E2E_VIEWER_PASSWORD` (default viewer / viewer123).
 */
async function submitLoginForm(page: Page, username: string, password: string) {
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  const userField = page.locator('#login-username');
  const passField = page.locator('#login-password');
  await userField.click();
  await userField.pressSequentially(username, { delay: 15 });
  await passField.click();
  await passField.pressSequentially(password, { delay: 15 });
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test.describe('public pages', () => {
  test('home introduces the product', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { level: 1, name: /Competitor AI Visibility Gap Tool/i })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  });

  test('home register link opens signup', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /^register$/i }).click();
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByRole('heading', { level: 1, name: /Create your workspace/i })).toBeVisible();
  });

  test('home sign in link opens login', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /^sign in$/i }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('login page shows credentials form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.locator('#login-username')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();
  });

  test('register page shows workspace signup form', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { level: 1, name: /Create your workspace/i })).toBeVisible();
    await expect(page.locator('#register-email')).toBeVisible();
    await expect(page.locator('#register-password')).toBeVisible();
    await expect(page.getByRole('button', { name: /Create account/i })).toBeVisible();
  });

  for (const path of ['/dashboard', '/reports', '/ops', '/settings/brand', '/settings/connectors'] as const) {
    test(`protected ${path} redirects to login when signed out`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
      expect(new URL(page.url()).searchParams.get('next')).toBe(path);
      await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    });
  }
});

const authSuite = process.env.E2E_AUTH === '1' ? test.describe : test.describe.skip;

authSuite('authenticated smoke (E2E_AUTH=1)', () => {
  /** Serial auth tests: two full sign-ins; avoids hammering `next dev` and keeps traces readable. */
  test.describe.configure({ mode: 'serial' });

  test('login honors next query to return to reports', async ({ page }) => {
    test.setTimeout(90_000);
    const user = process.env.E2E_USERNAME ?? 'demo';
    const pass = process.env.E2E_PASSWORD ?? 'demo123';

    await page.goto('/login?next=%2Freports');
    await submitLoginForm(page, user, pass);
    await expect(page).toHaveURL(/\/reports/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { level: 1, name: /Report Builder/i })).toBeVisible();
  });

  test('login ignores unsafe next (open redirect)', async ({ page }) => {
    test.setTimeout(90_000);
    const user = process.env.E2E_USERNAME ?? 'demo';
    const pass = process.env.E2E_PASSWORD ?? 'demo123';

    await page.goto(`/login?next=${encodeURIComponent('//evil.com')}`);
    await submitLoginForm(page, user, pass);
    await expect(page).toHaveURL(/\/settings\/brand/, { timeout: 30_000 });
  });

  test('seed user can reach core app surfaces', async ({ page }) => {
    test.setTimeout(90_000);
    const user = process.env.E2E_USERNAME ?? 'demo';
    const pass = process.env.E2E_PASSWORD ?? 'demo123';

    await page.goto('/login');
    await submitLoginForm(page, user, pass);
    await expect(page).toHaveURL(/\/settings\/brand/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { level: 1, name: /Brand & competitors/i })).toBeVisible();
    await expect(page.locator('#brand-brandName')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#brand-brandName')).toBeEnabled();

    await page.goto('/reports');
    await expect(page.getByRole('heading', { level: 1, name: /Report Builder/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Run unified pipeline/i })).toBeVisible();

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { level: 1, name: /Dashboard v1/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Recalculate score/i })).toBeVisible();

    await page.goto('/settings/connectors');
    await expect(page.getByRole('heading', { level: 1, name: /Data connectors/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Save connector settings/i })).toBeEnabled();

    await page.goto('/ops');
    await expect(page.getByRole('heading', { level: 1, name: /Ops Monitor/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Run scheduled job now/i })).toBeVisible();
  });

  test('viewer has read-only brand/connectors and no editor-only job controls', async ({ page }) => {
    test.setTimeout(90_000);
    const user = process.env.E2E_VIEWER_USERNAME ?? 'viewer';
    const pass = process.env.E2E_VIEWER_PASSWORD ?? 'viewer123';

    await page.goto('/login');
    await submitLoginForm(page, user, pass);
    await expect(page).toHaveURL(/\/settings\/brand/, { timeout: 30_000 });
    await expect(page.locator('#brand-brandName')).toBeDisabled();
    await expect(
      page.getByText(/Viewer role: brand, competitors, and digest email are read-only/i)
    ).toBeVisible();

    await page.goto('/settings/connectors');
    await expect(page.getByRole('heading', { level: 1, name: /Data connectors/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Save connector settings/i })).toBeDisabled();
    await expect(page.getByRole('button', { name: /Fetch live signals/i })).toBeEnabled();

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { level: 1, name: /Dashboard v1/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Recalculate score/i })).toHaveCount(0);

    await page.goto('/ops');
    await expect(page.getByRole('heading', { level: 1, name: /Ops Monitor/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Run scheduled job now/i })).toHaveCount(0);
    await expect(page.getByText(/Only editors and admins can run the scheduler/i)).toBeVisible();

    await page.goto('/reports');
    await expect(page.getByRole('heading', { level: 1, name: /Report Builder/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Run unified pipeline/i })).toHaveCount(0);
    await expect(
      page.getByText(/Viewer role: pipeline, trend snapshot, and digest generation/i)
    ).toBeVisible();
  });
});
