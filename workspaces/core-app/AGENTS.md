# Core app workspace — Developer 1

Read root `AGENTS.md`, then this file, `TASKS.md`, `PROGRESS.md`, `API_CONTRACTS.md`, and `ARCHITECTURE.md` before coding. The goal is a **complete resident/operator app that still works with innovation disabled**.

## Ownership

Allowed: `workspaces/core-app/**`, `tests/core/**`, `tests/integration/**`, root `package.json`, `.env.example`, `.gitignore` and deployment config when needed. Update only this workspace's `TASKS.md` checkboxes and `PROGRESS.md` during normal execution. Root contract/planning changes require a decision in the main planning thread and Developer 1 is the sole editor.

Forbidden: `workspaces/innovation/**`, `tests/innovation/**`, other workspace instructions/progress, direct edits to innovation package exports, and unagreed changes to the six approved plan documents. Do not implement Studio logic or AI extraction in core; add adapter routes and callbacks only.

## Architecture and contracts

- Own React shell/screens, Fastify routes, SQLite schema/migrations/seed, operator session, public works and report flows, HTTP error envelope, and one-process demo build.
- Match `API_CONTRACTS.md` exactly for `ProjectSummary`, `ProjectDetail`, `CreateProject`, `Reschedule`, reports, and `/api/v1` paths. Server sets `isDemo`. Planned flexibility bounds are optional but validated as a pair.
- Core builds `ScenarioSnapshot` from real database records, then calls `@onedig/innovation/engine`; it calls `@onedig/innovation/intake` server-side and imports `@onedig/innovation/ui` in the browser. Use package exports; no relative imports into the innovation source tree.
- Before integration, the core runs alone: innovation routes return the specified 503 and the UI does not claim Studio results. Core owns all persistence; AI draft confirmation uses the ordinary project-create endpoint. Apply uses focus and peer version checks in one transaction.
- Use root design tokens in `src/web/styles/tokens.css`; innovation components consume them. Do not depend on map tiles for list/detail.

## Commands

From repository root, after task C00 has created package scripts: `npm --prefix workspaces/core-app install`, `npm --prefix workspaces/core-app run dev`, `npm --prefix workspaces/core-app run seed:reset`, `npm --prefix workspaces/core-app run typecheck`, `npm --prefix workspaces/core-app run test:core`, `npm --prefix workspaces/core-app run test:integration`, `npm --prefix workspaces/core-app run build`. Before C00, these commands are expected to be unavailable; C00 defines them. Never report a command as passing until it ran.

## Coding and done criteria

Use strict TypeScript, Fastify request/response schemas, parameterized SQL and transactions. Dates and JSON/error shapes follow the root contract. Keep auth cookies HttpOnly and report tokens hashed; never log secrets. Each task is done only after its verification commands pass and its changed files/results are recorded in `PROGRESS.md`. The workspace is complete when a fresh seed supports project create/edit, resident detail, progress/delay, report response and receipt, with innovation disabled, then the integrated Studio/intake path and production build pass the shared gates.
