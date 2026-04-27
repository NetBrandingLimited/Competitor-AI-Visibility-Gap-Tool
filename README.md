# Competitor AI Visibility Gap Tool

[![CI](https://github.com/NetBrandingLimited/Competitor-AI-Visibility-Gap-Tool/actions/workflows/ci.yml/badge.svg?branch=sprint-1)](https://github.com/NetBrandingLimited/Competitor-AI-Visibility-Gap-Tool/actions/workflows/ci.yml)

Track brand vs competitors in AI-generated answers. This repo starts with a minimal Next.js scaffold and a Cursor runbook to build the first slice fast.

Quick start
- npm install
- Copy `.env.example` to `.env` and adjust if needed
- `npx prisma migrate deploy` (or `npm run db:migrate` during development)
- `npm run db:seed` for demo user/org (username `demo`, password `demo123`)
- npm run dev
- Sign in: `GET /login` · Brand & competitors: `GET /settings/brand`
- Phase 3 debug endpoint: `GET /api/debug/extract-cluster?text=best%20seo%20tool%20vs%20alternatives`
- Phase 4 dashboard page: `GET /dashboard`
- Phase 5 job + reports:
  - `POST /api/debug/trends/run` to generate/update a daily snapshot
  - `GET /api/debug/trends/run` to list stored snapshots
  - `GET /api/reports/export.csv` to download CSV
  - `GET /reports` for report page baseline
- Unified pipeline run:
  - `POST /api/debug/pipeline/run?query=seo%20tool&limit=2`
  - `GET /api/debug/pipeline/run` for latest run summary
- Scheduler + monitoring baseline:
  - `POST /api/debug/scheduler/run?query=seo%20tool&limit=2`
  - `GET /api/debug/scheduler/run` for recent job history
  - `GET /ops` for a simple operations monitor page
- Reports freshness thresholds (optional):
  - `FRESH_HOURS` (default `24`)
  - `AGING_HOURS` (default `72`)
- Auth:
  - `POST /api/auth/login` with `{ "username": "demo", "password": "demo123" }` (or use email as username)
  - `GET /api/auth/session`
  - `POST /api/auth/logout`
  - `PATCH /api/orgs/[orgId]/brand` for brand name, category, competitors (requires EDITOR+)

Docs
- See CURSOR_RUNBOOK.md for guided prompts and verification steps.
