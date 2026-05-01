import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';

const webServerEnv =
  process.env.DATABASE_URL !== undefined ? { DATABASE_URL: process.env.DATABASE_URL } : undefined;

/**
 * Public smoke: UI (home, auth shells, protected redirects) + `GET /api/health` via `request`.
 * Set `E2E_AUTH=1` with a migrated DB and `npm run db:seed` for admin + viewer signed-in flows.
 * See `e2e/smoke.spec.ts` for env vars.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: webServerEnv
  }
});
