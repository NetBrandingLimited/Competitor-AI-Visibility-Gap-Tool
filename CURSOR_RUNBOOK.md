# CURSOR RUNBOOK — Competitor AI Visibility Gap Tool

This runbook guides you through building the first end-to-end slice using Cursor.

Phase 0 — Open in Cursor and boot the app
1) Paste into Cursor command bar:
"""
You are my build pair. Use this repo. Ensure Next.js app runs locally (npm i, npm run dev), create a healthcheck route at /api/health, and confirm the homepage renders.
"""
2) Verify: http://localhost:3000 shows the homepage; GET /api/health returns { ok: true }.

Phase 1 — Core schema + auth (guided)
1) Prompt: "Set up basic account + org model, role-based access (viewer, editor, admin), and placeholder server routes. Create a simple .env.example."
2) Verify: migrations present; minimal auth guards on an example API route.

Phase 2 — Connectors + ingestion skeleton
1) Prompt: "Add placeholder free-source connectors and an ingestion pipeline interface (no secrets). Log ingestion events only."
2) Verify: dev logs show simulated ingestion; no external calls.

Phase 3 — Extraction + clustering (baseline)
1) Prompt: "Add question trigger extraction (heuristic) and a stub for theme clustering. Expose a debug route to run them on sample text."
2) Verify: debug route returns triggers and clustered groups.

Phase 4 — Dashboard v1
1) Prompt: "Create a simple dashboard page with Leaderboard + Recent sections wired to mock data."
2) Verify: page renders tables and updates from mock store.

Phase 5 — Trends job + exports
1) Prompt: "Add a cron-like job runner stub, accumulate daily snapshots, and enable CSV export for a report page."
2) Verify: CSV downloads with example data; snapshots written to dev store. In current baseline, `GET /api/reports/export.csv` includes trends + gap rows + latest weekly digest provenance fields (including raw `digestPipelineIngestionSource`), and `GET /api/reports/weekly-digests.csv` provides digest-only rows.

Phase 6 — Unified pipeline: live GSC query ingestion (optional)
1) Context: the unified pipeline prefers **Google Search Console** Search Analytics (aggregated **query**, **page**, and **query+page** requests, rolling 28-day window) when the org has **Settings → Data connectors** (GSC site URL + service account with `webmasters.readonly`) and the **query-only** request returns at least one row (pages and pairs are merged afterward, then **capped** in query→page→pair order so runs stay bounded); otherwise it uses **mock** document templates (same downstream triggers/clusters).
2) Verify (no GSC): sign in as EDITOR+, `POST /api/debug/pipeline/run?limit=2` → run persisted with `ingestionSource` `mock_ingestion` (Reports table, run detail, or `GET /api/reports/pipeline-runs.csv`).
3) Verify (with GSC): configure connectors, run the same POST → when GSC returns query rows, `ingestionSource` is `live_gsc_queries` and document `source` values include `google_search_console`.
4) Debug-only (no DB write): `GET /api/debug/ingestion?query=seo%20tool&limit=2` returns ingestion JSON plus `ingestionSource`; requires EDITOR+ session (same guard as pipeline debug POST).

Recovery prompts
- "Revert the last change and re-run tests."
- "Show diffs and fix TypeScript errors."
- "Recreate file structure from runbook." 

Notes
- Keep everything free-API compatible where possible (Search Console API has no per-query bill for verified properties; still requires GCP + service account setup).
- Early phases avoided secrets; Phase 6 documents optional org-scoped connector credentials for live ingestion.
