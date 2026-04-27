export default function HomePage() {
  return (
    <section>
      <h1>Competitor AI Visibility Gap Tool</h1>
      <p>
        Each client gets a separate account and workspace: <a href="/register">register</a> or{' '}
        <a href="/login">sign in</a>, then set brand and competitors at <code>/settings/brand</code>. Pipeline runs,
        trends, scheduler jobs, and CSV exports are stored per workspace. Copy <code>.env.example</code> to{' '}
        <code>.env</code>, run migrations and seed for a demo user.
      </p>
      <ul>
        <li>npm install</li>
        <li>npx prisma migrate deploy &amp;&amp; npm run db:seed</li>
        <li>npm run dev</li>
        <li>
          Phase 3 debug: <code>/api/debug/extract-cluster?text=best%20seo%20tool%20vs%20alternatives</code>
        </li>
        <li>
          Phase 4 dashboard: <code>/dashboard</code>
        </li>
        <li>
          Phase 5 reports: <code>/reports</code> and <code>POST /api/debug/trends/run</code>
        </li>
        <li>
          Unified run: <code>POST /api/debug/pipeline/run?query=seo%20tool&amp;limit=2</code>
        </li>
        <li>
          Ops monitor: <code>/ops</code> and <code>POST /api/debug/scheduler/run</code>
        </li>
        <li>
          Sign in: <code>/login</code> · Brand form: <code>/settings/brand</code>
        </li>
      </ul>
    </section>
  );
}
