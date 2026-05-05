import { expect, test, type Page } from '@playwright/test';

/**
 * Public tests always run (parallel by default).
 *
 * Authenticated suite (`E2E_AUTH=1`, after migrate + `npm run db:seed`) is the **full** check for seeded org
 * `seed-demo-org`: UI smoke, **every** session CSV (`/api/reports/*.csv` + `/api/ops/scheduler-jobs.csv`) for both
 * demo (ADMIN) and viewer (VIEWER), `GET /api/orgs/seed-demo-org` for each role, editor `POST` visibility recalc, and
 * viewer `403` on `POST visibility`, `PATCH brand`, `PATCH digest/schedule`.
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

  test('login page preserves safe next on create-account link', async ({ page }) => {
    await page.goto('/login?next=%2Freports');
    await expect(page.getByRole('link', { name: /^create account$/i })).toHaveAttribute(
      'href',
      '/register?next=%2Freports'
    );
  });

  test('/auth forwards safe next to login', async ({ page }) => {
    await page.goto('/auth?next=%2Freports');
    await expect(page).toHaveURL(/\/login/);
    expect(new URL(page.url()).searchParams.get('next')).toBe('/reports');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('/auth drops unsafe next', async ({ page }) => {
    await page.goto(`/auth?next=${encodeURIComponent('//evil.com')}`);
    await expect(page).toHaveURL(/\/login$/);
    expect(new URL(page.url()).searchParams.get('next')).toBeNull();
  });

  test('register page shows workspace signup form', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { level: 1, name: /Create your workspace/i })).toBeVisible();
    await expect(page.locator('#register-email')).toBeVisible();
    await expect(page.locator('#register-password')).toBeVisible();
    await expect(page.getByRole('button', { name: /Create account/i })).toBeVisible();
  });

  test('register page preserves safe next on sign-in link', async ({ page }) => {
    await page.goto('/register?next=%2Freports');
    const expectedHref = '/login?next=%2Freports';
    const signInLinks = await page.getByRole('link', { name: /^sign in$/i }).all();
    expect(signInLinks.length).toBeGreaterThanOrEqual(1);
    for (const link of signInLinks) {
      await expect(link).toHaveAttribute('href', expectedHref);
    }
  });

  for (const path of ['/dashboard', '/reports', '/ops', '/settings/brand', '/settings/prompts', '/settings/connectors'] as const) {
    test(`protected ${path} redirects to login when signed out`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
      expect(new URL(page.url()).searchParams.get('next')).toBe(path);
      await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    });
  }
});

test.describe('public API', () => {
  test('GET /api/health returns ok', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBe(true);
    const body = (await response.json()) as { ok?: boolean; service?: string };
    expect(body.ok).toBe(true);
    expect(body.service).toBe('health');
  });

  test('GET /api/health/ready returns ok when database is reachable', async ({ request }) => {
    const response = await request.get('/api/health/ready');
    expect(response.ok()).toBe(true);
    const body = (await response.json()) as {
      ok?: boolean;
      service?: string;
      checks?: { database?: string };
    };
    expect(body.ok).toBe(true);
    expect(body.service).toBe('ready');
    expect(body.checks?.database).toBe('ok');
  });

  test('GET /api/placeholder returns ok without auth', async ({ request }) => {
    const res = await request.get('/api/placeholder');
    expect(res.ok()).toBe(true);
    const body = (await res.json()) as { ok?: boolean; message?: string };
    expect(body.ok).toBe(true);
    expect(body.message).toBe('placeholder');
  });

  test('GET CSV routes return 401 body when signed out', async ({ request }) => {
    const paths = [
      '/api/reports/export.csv',
      '/api/reports/trends.csv',
      '/api/reports/pipeline-runs.csv',
      '/api/reports/weekly-digests.csv',
      '/api/ops/scheduler-jobs.csv'
    ] as const;
    await Promise.all(
      paths.map(async (path) => {
        const res = await request.get(path);
        expect(res.status(), path).toBe(401);
        expect((await res.text()).trim(), path).toBe('Unauthorized');
      })
    );
  });

  test('GET session-protected JSON API routes return 401 when signed out', async ({ request }) => {
    const paths = [
      '/api/orgs/org-1',
      '/api/orgs/org-1/insights/gaps',
      '/api/orgs/org-1/digest/schedule',
      '/api/orgs/org-1/digest/weekly',
      '/api/orgs/org-1/digest/weekly/digest-1',
      '/api/orgs/org-1/digest/weekly/digest-1/export-md',
      '/api/debug/config',
      '/api/debug/extract-cluster',
      '/api/debug/ingestion',
      '/api/debug/pipeline/run',
      '/api/debug/pipeline/run-1',
      '/api/debug/scheduler/run',
      '/api/debug/trends/run'
    ] as const;
    await Promise.all(
      paths.map(async (path) => {
        const res = await request.get(path);
        expect(res.status(), path).toBe(401);
        expect(((await res.json()) as { error?: string }).error, path).toBe('unauthorized');
      })
    );
  });

  test('Org-scoped mutating API routes return 401 when signed out', async ({ request }) => {
    const cases = [
      {
        label: 'PATCH /api/orgs/.../brand',
        run: () => request.patch('/api/orgs/org-1/brand', { data: {} })
      },
      {
        label: 'PATCH /api/orgs/.../connectors',
        run: () => request.patch('/api/orgs/org-1/connectors', { data: {} })
      },
      {
        label: 'POST /api/orgs/.../connectors',
        run: () => request.post('/api/orgs/org-1/connectors', { data: {} })
      },
      { label: 'POST /api/orgs/.../connectors/signals', run: () => request.post('/api/orgs/org-1/connectors/signals') },
      {
        label: 'DELETE /api/orgs/.../connectors/signals',
        run: () => request.delete('/api/orgs/org-1/connectors/signals')
      },
      {
        label: 'PATCH /api/orgs/.../digest/schedule',
        run: () => request.patch('/api/orgs/org-1/digest/schedule', { data: {} })
      },
      {
        label: 'PUT /api/orgs/.../tracked-prompts',
        run: () =>
          request.fetch('/api/orgs/org-1/tracked-prompts', {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            data: JSON.stringify({ prompts: [] })
          })
      },
      { label: 'POST /api/orgs/.../digest/weekly', run: () => request.post('/api/orgs/org-1/digest/weekly') },
      { label: 'POST /api/orgs/.../visibility', run: () => request.post('/api/orgs/org-1/visibility') }
    ] as const;
    await Promise.all(
      cases.map(async ({ label, run }) => {
        const res = await run();
        expect(res.status(), label).toBe(401);
        expect(((await res.json()) as { error?: string }).error, label).toBe('unauthorized');
      })
    );
  });

  test('POST /api/reports/weekly-digest returns 401 when signed out', async ({ request }) => {
    const res = await request.post('/api/reports/weekly-digest');
    expect(res.status()).toBe(401);
    expect(((await res.json()) as { error?: string }).error).toBe('unauthorized');
  });

  test('POST session-protected debug job routes return 401 when signed out', async ({ request }) => {
    const paths = [
      '/api/debug/pipeline/run',
      '/api/debug/scheduler/run',
      '/api/debug/trends/run'
    ] as const;
    await Promise.all(
      paths.map(async (path) => {
        const res = await request.post(path);
        expect(res.status(), path).toBe(401);
        expect(((await res.json()) as { error?: string }).error, path).toBe('unauthorized');
      })
    );
  });

  test('GET and POST /api/cron/weekly-scheduler return 401 without valid cron secret', async ({ request }) => {
    await Promise.all(
      (['GET', 'POST'] as const).map(async (method) => {
        const res = await request.fetch('/api/cron/weekly-scheduler', { method });
        expect(res.status(), method).toBe(401);
        expect(((await res.json()) as { error?: string }).error, method).toBe('unauthorized');
      })
    );
  });
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

  test('editor session can download trends CSV via API with cookies', async ({ page }) => {
    test.setTimeout(90_000);
    const user = process.env.E2E_USERNAME ?? 'demo';
    const pass = process.env.E2E_PASSWORD ?? 'demo123';

    await page.goto('/login');
    await submitLoginForm(page, user, pass);
    await expect(page).toHaveURL(/\/settings\/brand/, { timeout: 30_000 });

    const res = await page.request.get('/api/reports/trends.csv');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type'] ?? '').toMatch(/text\/csv/i);
    const disposition = res.headers()['content-disposition'] ?? '';
    expect(disposition).toContain('attachment');
    expect(disposition.toLowerCase()).toContain('visibility-trends.csv');

    const body = await res.text();
    expect(body.startsWith('\uFEFF')).toBe(true);
    expect(body).toContain('date');
    expect(body).toContain('generatedAt');
    expect(body).toContain('totalMentions');
    expect(body).toContain('topBrand');
  });

  test('editor session can download full visibility export CSV', async ({ page }) => {
    test.setTimeout(90_000);
    const user = process.env.E2E_USERNAME ?? 'demo';
    const pass = process.env.E2E_PASSWORD ?? 'demo123';

    await page.goto('/login');
    await submitLoginForm(page, user, pass);
    await expect(page).toHaveURL(/\/settings\/brand/, { timeout: 30_000 });

    const res = await page.request.get('/api/reports/export.csv');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type'] ?? '').toMatch(/text\/csv/i);
    const disposition = res.headers()['content-disposition'] ?? '';
    expect(disposition).toContain('attachment');
    expect(disposition.toLowerCase()).toContain('visibility-report.csv');

    const body = await res.text();
    expect(body.startsWith('\uFEFF')).toBe(true);
    expect(body).toContain('section');
    expect(body).toContain('visibilityScore');
    expect(body).toContain('digestPipelineIngestionSource');
  });

  test('editor session can download pipeline-runs CSV', async ({ page }) => {
    test.setTimeout(90_000);
    const user = process.env.E2E_USERNAME ?? 'demo';
    const pass = process.env.E2E_PASSWORD ?? 'demo123';

    await page.goto('/login');
    await submitLoginForm(page, user, pass);
    await expect(page).toHaveURL(/\/settings\/brand/, { timeout: 30_000 });

    const res = await page.request.get('/api/reports/pipeline-runs.csv');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type'] ?? '').toMatch(/text\/csv/i);
    expect((res.headers()['content-disposition'] ?? '').toLowerCase()).toContain('pipeline-runs.csv');

    const body = await res.text();
    expect(body.startsWith('\uFEFF')).toBe(true);
    expect(body).toContain('ingestionSource');
    expect(body).toContain('gscDiagnosticsSummary');
  });

  test('editor session can download weekly-digests CSV', async ({ page }) => {
    test.setTimeout(90_000);
    const user = process.env.E2E_USERNAME ?? 'demo';
    const pass = process.env.E2E_PASSWORD ?? 'demo123';

    await page.goto('/login');
    await submitLoginForm(page, user, pass);
    await expect(page).toHaveURL(/\/settings\/brand/, { timeout: 30_000 });

    const res = await page.request.get('/api/reports/weekly-digests.csv');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type'] ?? '').toMatch(/text\/csv/i);
    expect((res.headers()['content-disposition'] ?? '').toLowerCase()).toContain('weekly-digests.csv');

    const body = await res.text();
    expect(body.startsWith('\uFEFF')).toBe(true);
    expect(body).toContain('periodStart');
    expect(body).toContain('connectorSignals');
    expect(body).toContain('pipelineGscDiagnosticsSummary');
  });

  test('editor session can download scheduler-jobs CSV', async ({ page }) => {
    test.setTimeout(90_000);
    const user = process.env.E2E_USERNAME ?? 'demo';
    const pass = process.env.E2E_PASSWORD ?? 'demo123';

    await page.goto('/login');
    await submitLoginForm(page, user, pass);
    await expect(page).toHaveURL(/\/settings\/brand/, { timeout: 30_000 });

    const res = await page.request.get('/api/ops/scheduler-jobs.csv');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type'] ?? '').toMatch(/text\/csv/i);
    expect((res.headers()['content-disposition'] ?? '').toLowerCase()).toContain('scheduler-jobs.csv');

    const body = await res.text();
    expect(body.startsWith('\uFEFF')).toBe(true);
    expect(body).toContain('startedAt');
    expect(body).toContain('weeklyDigestGscDiagnosticsSummary');
  });

  test('editor session can POST visibility recalc', async ({ page }) => {
    test.setTimeout(120_000);
    const orgId = 'seed-demo-org';
    const user = process.env.E2E_USERNAME ?? 'demo';
    const pass = process.env.E2E_PASSWORD ?? 'demo123';

    await page.goto('/login');
    await submitLoginForm(page, user, pass);
    await expect(page).toHaveURL(/\/settings\/brand/, { timeout: 30_000 });

    const res = await page.request.post(`/api/orgs/${orgId}/visibility`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type'] ?? '').toContain('application/json');
    const json = (await res.json()) as { organizationId?: string; score?: number };
    expect(json.organizationId).toBe(orgId);
    expect(typeof json.score).toBe('number');

    const orgRes = await page.request.get(`/api/orgs/${orgId}`);
    expect(orgRes.status()).toBe(200);
    const orgJson = (await orgRes.json()) as {
      organization?: { id: string };
      viewer?: { role: string };
    };
    expect(orgJson.organization?.id).toBe(orgId);
    expect(orgJson.viewer?.role).toBe('ADMIN');
  });

  test('viewer session can download trends CSV (read-only export)', async ({ page }) => {
    test.setTimeout(90_000);
    const user = process.env.E2E_VIEWER_USERNAME ?? 'viewer';
    const pass = process.env.E2E_VIEWER_PASSWORD ?? 'viewer123';

    await page.goto('/login');
    await submitLoginForm(page, user, pass);
    await expect(page).toHaveURL(/\/settings\/brand/, { timeout: 30_000 });

    const res = await page.request.get('/api/reports/trends.csv');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body.startsWith('\uFEFF')).toBe(true);
    expect(body).toContain('date');
  });

  test('viewer session can download full visibility export CSV', async ({ page }) => {
    test.setTimeout(90_000);
    const user = process.env.E2E_VIEWER_USERNAME ?? 'viewer';
    const pass = process.env.E2E_VIEWER_PASSWORD ?? 'viewer123';

    await page.goto('/login');
    await submitLoginForm(page, user, pass);
    await expect(page).toHaveURL(/\/settings\/brand/, { timeout: 30_000 });

    const res = await page.request.get('/api/reports/export.csv');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type'] ?? '').toMatch(/text\/csv/i);
    expect((res.headers()['content-disposition'] ?? '').toLowerCase()).toContain('visibility-report.csv');

    const body = await res.text();
    expect(body.startsWith('\uFEFF')).toBe(true);
    expect(body).toContain('section');
    expect(body).toContain('visibilityScore');
  });

  test('viewer session can download pipeline-runs and weekly-digests CSV', async ({ page }) => {
    test.setTimeout(90_000);
    const user = process.env.E2E_VIEWER_USERNAME ?? 'viewer';
    const pass = process.env.E2E_VIEWER_PASSWORD ?? 'viewer123';

    await page.goto('/login');
    await submitLoginForm(page, user, pass);
    await expect(page).toHaveURL(/\/settings\/brand/, { timeout: 30_000 });

    const runs = await page.request.get('/api/reports/pipeline-runs.csv');
    expect(runs.status()).toBe(200);
    const runsBody = await runs.text();
    expect(runsBody.startsWith('\uFEFF')).toBe(true);
    expect(runsBody).toContain('ingestionSource');

    const digests = await page.request.get('/api/reports/weekly-digests.csv');
    expect(digests.status()).toBe(200);
    const digestsBody = await digests.text();
    expect(digestsBody.startsWith('\uFEFF')).toBe(true);
    expect(digestsBody).toContain('connectorSignals');
  });

  test('viewer session can download scheduler-jobs CSV', async ({ page }) => {
    test.setTimeout(90_000);
    const user = process.env.E2E_VIEWER_USERNAME ?? 'viewer';
    const pass = process.env.E2E_VIEWER_PASSWORD ?? 'viewer123';

    await page.goto('/login');
    await submitLoginForm(page, user, pass);
    await expect(page).toHaveURL(/\/settings\/brand/, { timeout: 30_000 });

    const res = await page.request.get('/api/ops/scheduler-jobs.csv');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type'] ?? '').toMatch(/text\/csv/i);
    expect((res.headers()['content-disposition'] ?? '').toLowerCase()).toContain('scheduler-jobs.csv');

    const body = await res.text();
    expect(body.startsWith('\uFEFF')).toBe(true);
    expect(body).toContain('startedAt');
    expect(body).toContain('pipelineRunGscDiagnosticsSummary');
  });

  test('viewer GET /api/orgs/seed-demo-org returns VIEWER membership', async ({ page }) => {
    test.setTimeout(90_000);
    const orgId = 'seed-demo-org';
    const user = process.env.E2E_VIEWER_USERNAME ?? 'viewer';
    const pass = process.env.E2E_VIEWER_PASSWORD ?? 'viewer123';

    await page.goto('/login');
    await submitLoginForm(page, user, pass);
    await expect(page).toHaveURL(/\/settings\/brand/, { timeout: 30_000 });

    const res = await page.request.get(`/api/orgs/${orgId}`);
    expect(res.status()).toBe(200);
    const json = (await res.json()) as {
      organization?: { id: string };
      viewer?: { role: string };
    };
    expect(json.organization?.id).toBe(orgId);
    expect(json.viewer?.role).toBe('VIEWER');
  });

  test('viewer receives 403 when POSTing visibility recalc (editor-only)', async ({ page }) => {
    test.setTimeout(90_000);
    const orgId = 'seed-demo-org';
    const user = process.env.E2E_VIEWER_USERNAME ?? 'viewer';
    const pass = process.env.E2E_VIEWER_PASSWORD ?? 'viewer123';

    await page.goto('/login');
    await submitLoginForm(page, user, pass);
    await expect(page).toHaveURL(/\/settings\/brand/, { timeout: 30_000 });

    const res = await page.request.post(`/api/orgs/${orgId}/visibility`);
    expect(res.status()).toBe(403);
    expect(res.headers()['content-type'] ?? '').toContain('application/json');
    const errorPayload = (await res.json()) as { error?: string; required?: string };
    expect(errorPayload.error).toBe('forbidden');
    expect(errorPayload.required).toBe('EDITOR');
  });

  test('viewer receives 403 when PATCHing brand settings (editor-only)', async ({ page }) => {
    test.setTimeout(90_000);
    const orgId = 'seed-demo-org';
    const user = process.env.E2E_VIEWER_USERNAME ?? 'viewer';
    const pass = process.env.E2E_VIEWER_PASSWORD ?? 'viewer123';

    await page.goto('/login');
    await submitLoginForm(page, user, pass);
    await expect(page).toHaveURL(/\/settings\/brand/, { timeout: 30_000 });

    const res = await page.request.fetch(`/api/orgs/${orgId}/brand`, {
      method: 'PATCH',
      data: { brandName: 'E2E viewer must not apply this' }
    });
    expect(res.status()).toBe(403);
    const errorPayload = (await res.json()) as { error?: string; required?: string };
    expect(errorPayload.error).toBe('forbidden');
    expect(errorPayload.required).toBe('EDITOR');
  });

  test('viewer receives 403 when PATCHing weekly digest schedule (editor-only)', async ({ page }) => {
    test.setTimeout(90_000);
    const orgId = 'seed-demo-org';
    const user = process.env.E2E_VIEWER_USERNAME ?? 'viewer';
    const pass = process.env.E2E_VIEWER_PASSWORD ?? 'viewer123';

    await page.goto('/login');
    await submitLoginForm(page, user, pass);
    await expect(page).toHaveURL(/\/settings\/brand/, { timeout: 30_000 });

    const res = await page.request.fetch(`/api/orgs/${orgId}/digest/schedule`, {
      method: 'PATCH',
      data: { enabled: true, dayUtc: 2, hourUtc: 10 }
    });
    expect(res.status()).toBe(403);
    const errorPayload = (await res.json()) as { error?: string; required?: string };
    expect(errorPayload.error).toBe('forbidden');
    expect(errorPayload.required).toBe('EDITOR');
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
