import { expect, test } from '@playwright/test';

/** Avoid racing the dev server and give client components time to hydrate before interacting. */
test.describe.configure({ mode: 'serial' });

test.describe('public pages', () => {
  test('home introduces the product', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { level: 1, name: /Competitor AI Visibility Gap Tool/i })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  });

  test('login page shows credentials form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });
});

const authSuite = process.env.E2E_AUTH === '1' ? test.describe : test.describe.skip;

authSuite('authenticated smoke (E2E_AUTH=1)', () => {
  test('seed user can open reports', async ({ page }) => {
    test.setTimeout(90_000);
    const user = process.env.E2E_USERNAME ?? 'demo';
    const pass = process.env.E2E_PASSWORD ?? 'demo123';

    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    const userField = page.locator('input[name="username"]');
    const passField = page.locator('input[name="password"]');
    await userField.click();
    await userField.pressSequentially(user, { delay: 15 });
    await passField.click();
    await passField.pressSequentially(pass, { delay: 15 });
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/settings\/brand/, { timeout: 30_000 });

    await page.goto('/reports');
    await expect(page.getByRole('heading', { level: 1, name: /Report Builder/i })).toBeVisible();

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { level: 1, name: /Dashboard v1/i })).toBeVisible();
  });
});
