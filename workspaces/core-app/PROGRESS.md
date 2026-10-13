# Core app progress

Updated: 2026-10-13

- **Completed tasks:** C00 — independent React/Vite and Fastify package scaffold; C01 — six-table SQLite schema, repeatable migration, DB connection setup and integrity checks; C02 — date-relative illustrative Market Road seed and explicit local reset; C03 — public project/catalog reads, DTO mapping and validation/error envelope.
- **Current active task:** C04 — resident works view.
- **Files created/modified:** C00: root `package.json`, `.env.example`, `.gitignore`; core manifest/lockfile, `tsconfig.json`, Vite config, HTML shell, server entry/app, web entry and tokens. C01: DB schema/connection/migration; `tests/core/db.test.ts`. C02: DB seed and demo data; `tests/core/seed.test.ts`. C03: `src/shared/contracts.ts`, `src/server/errors.ts`, `src/server/services/projects.ts`, `src/server/routes/public.ts`, app registration; `tests/integration/public.test.ts`; this file and `TASKS.md`.
- **Verification:** C00: install (145 packages, 0 vulnerabilities), `typecheck`, and `build` passed. Dev started Vite (`127.0.0.1:5173`) and Fastify (`127.0.0.1:3001`); direct loopback requests were blocked/timed out by the execution environment, so Fastify `app.inject` verified GET `/api/health` → 200 `{"status":"ok"}`. C01: approved SQLite package install passed (0 vulnerabilities); `test:core` passed (2 tests); `typecheck` passed. C02: `seed:reset` passed for `DEMO_DAY=2026-10-13`; `test:core` passed (3 tests); `typecheck` passed. C03: `test:integration` passed (2 tests); `typecheck` passed. Tests cover exact public reads, 404, invalid/unknown filters, and public receipt/report secrecy.
- **Decisions:** follow the six approved root plans and `API_CONTRACTS.md`; core must work with innovation disabled; package integration uses `@onedig/innovation` exports.
- **Blockers:** none for C04. Direct network access to the local dev-server socket was denied by the execution environment; HTTP tests use Fastify injection.
- **Next task:** C04. After each verified task, record changed files, exact commands/results, any decision/blocker, and the next task; then check its box in `TASKS.md`.
