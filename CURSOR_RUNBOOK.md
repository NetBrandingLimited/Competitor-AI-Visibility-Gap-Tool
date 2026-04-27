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
2) Verify: CSV downloads with example data; snapshots written to dev store.

Recovery prompts
- "Revert the last change and re-run tests."
- "Show diffs and fix TypeScript errors."
- "Recreate file structure from runbook." 

Notes
- Keep everything free-API compatible.
- Don’t add secrets or external services yet.
