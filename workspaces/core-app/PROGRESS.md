# Core app progress

Updated: 2026-10-13

- **Completed tasks:** C00 — independent React/Vite and Fastify package scaffold; API health route, Vite `/api` proxy, strict TypeScript, shared tokens, env example, and generated lockfile.
- **Current active task:** C01 — SQLite schema and migration.
- **Files created/modified:** root `package.json`, `.env.example`, `.gitignore`; core package manifest/lockfile, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/server/app.ts`, `src/server/index.ts`, `src/web/main.tsx`, `src/web/styles/tokens.css`; this file and `TASKS.md`.
- **Verification:** `npm --prefix workspaces/core-app install` passed (145 packages, 0 vulnerabilities); `npm --prefix workspaces/core-app run typecheck` passed; `npm --prefix workspaces/core-app run build` passed. `npm --prefix workspaces/core-app run dev` started Vite at `127.0.0.1:5173` and Fastify at `127.0.0.1:3001`; direct PowerShell loopback requests were blocked/timed out by the execution environment, so the health route was verified with Fastify `app.inject` (GET `/api/health` → 200 `{"status":"ok"}`).
- **Decisions:** follow the six approved root plans and `API_CONTRACTS.md`; core must work with innovation disabled; package integration uses `@onedig/innovation` exports.
- **Blockers:** none for C01. Direct network access to the local dev-server socket was denied by the execution environment; in-process Fastify injection verified the endpoint.
- **Next task:** C01. After each verified task, record changed files, exact commands/results, any decision/blocker, and the next task; then check its box in `TASKS.md`.
