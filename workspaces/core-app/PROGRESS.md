# Core app progress

Updated: 2026-10-13

- **Completed tasks:** C00 — independent React/Vite and Fastify package scaffold; C01 — six-table SQLite schema, repeatable migration, DB connection setup and integrity checks.
- **Current active task:** C02 — repeatable illustrative seed.
- **Files created/modified:** C00: root `package.json`, `.env.example`, `.gitignore`; core package manifest/lockfile, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/server/app.ts`, `src/server/index.ts`, `src/web/main.tsx`, `src/web/styles/tokens.css`. C01: core package manifest/lockfile, `src/server/db/schema.sql`, `database.ts`, `migrate.ts`; `tests/core/db.test.ts`; this file and `TASKS.md`.
- **Verification:** C00: `npm --prefix workspaces/core-app install` passed (145 packages, 0 vulnerabilities); `npm --prefix workspaces/core-app run typecheck` passed; `npm --prefix workspaces/core-app run build` passed. Dev command started Vite at `127.0.0.1:5173` and Fastify at `127.0.0.1:3001`; direct PowerShell loopback requests were blocked/timed out by the execution environment, so Fastify `app.inject` verified GET `/api/health` → 200 `{"status":"ok"}`. C01: `npm --prefix workspaces/core-app install better-sqlite3 @types/better-sqlite3` passed (0 vulnerabilities); `npm --prefix workspaces/core-app run test:core` passed (2 tests); `npm --prefix workspaces/core-app run typecheck` passed.
- **Decisions:** follow the six approved root plans and `API_CONTRACTS.md`; core must work with innovation disabled; package integration uses `@onedig/innovation` exports.
- **Blockers:** none for C02. Direct network access to the local dev-server socket was denied by the execution environment; in-process Fastify injection verified the endpoint.
- **Next task:** C02. After each verified task, record changed files, exact commands/results, any decision/blocker, and the next task; then check its box in `TASKS.md`.
