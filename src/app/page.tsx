import Link from 'next/link';

export default function HomePage() {
  return (
    <section>
      <h1>Competitor AI Visibility Gap Tool</h1>
      <p>
        Each client gets a separate account and workspace: <Link href="/register">register</Link> or{' '}
        <Link href="/login">sign in</Link>, then set brand and competitors at <code>/settings/brand</code>. Pipeline runs,
        trends, scheduler jobs, and CSV exports are stored per workspace. Copy <code>.env.example</code> to{' '}
        <code>.env</code>, run migrations and seed for a demo user.
      </p>
      <ul>
        <li>npm install</li>
        <li>npx prisma migrate deploy &amp;&amp; npm run db:seed</li>
        <li>
          Quality gate (lint + TypeScript + Vitest): <code>npm run check</code>
        </li>
        <li>
          Optional: <code>npm run test:all</code> runs <code>check</code> plus Playwright; use{' '}
          <code>E2E_AUTH=1</code> with a seeded DB for the signed-in smoke paths.
        </li>
        <li>npm run dev</li>
        <li>
          Phase 3 debug: <code>/api/debug/extract-cluster?text=best%20seo%20tool%20vs%20alternatives</code>
        </li>
        <li>
          Phase 4 dashboard: <Link href="/dashboard">/dashboard</Link>
        </li>
        <li>
          Phase 5 reports: <Link href="/reports">/reports</Link> and <code>POST /api/debug/trends/run</code>
        </li>
        <li>
          Unified run: <code>POST /api/debug/pipeline/run?query=seo%20tool&amp;limit=2</code>
        </li>
        <li>
          Ops monitor: <Link href="/ops">/ops</Link> and <code>POST /api/debug/scheduler/run</code>
        </li>
        <li>
          Sign in: <Link href="/login">/login</Link> · Brand form: <Link href="/settings/brand">/settings/brand</Link>
        </li>
      </ul>
    </section>
  );
}
