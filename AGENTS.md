# OneDig — instructions for all Codex workspaces

## Goal and priorities

Build the approved OneDig product: a complete resident/operator public-works app plus Dig Once Studio, which computes reviewable schedule alternatives, and evidence-linked AI notice intake. Prioritize a working core, a real computed innovation, one coherent UI, and a repeatable live demo. Never present synthetic data, rule parsing, or model output as verified municipal fact.

## Architecture and authority

- One deployable React/Vite + Fastify/SQLite app in `workspaces/core-app`; a separately buildable `@onedig/innovation` package in `workspaces/innovation` supplies pure analysis, intake, and UI components. Core alone owns HTTP, auth, persistence, and writes.
- Read `PRODUCT.md` and `FEATURES.md` for product scope; `ARCHITECTURE.md` for module/data flow; **`API_CONTRACTS.md` for exact DTOs, routes, date rules, errors and package interfaces**; `WORKSPACE_PLAN.md` for ownership; `ROADMAP.md` for gates; `GIT_WORKFLOW.md` for branch/integration procedure.
- If documents conflict, stop the affected task, record the issue in your `PROGRESS.md`, and raise it in the main planning thread. Do not silently alter a shared interface.

## Coding rules

- TypeScript strict mode, small named modules, explicit validation at HTTP and AI boundaries. JSON is `camelCase`; SQL is `snake_case`; date-only values are `YYYY-MM-DD`, timestamps UTC; date arithmetic follows `API_CONTRACTS.md`.
- Use package exports/imports. Do not import another workspace's `src` by relative path, reach into its database, or duplicate its runtime responsibility.
- Keep credentials and report tokens out of logs and Git. Label illustrative data and `ai`/`rules`/`manual` results accurately. Model output is untrusted and operator-reviewed.
- Keep web screens responsive and keyboard usable. Show honest loading, empty, error, stale and unavailable states. A map or AI outage cannot break the core resident journey.

## Ownership and progress

- Developer 1 edits only `workspaces/core-app/**`, `tests/core/**`, `tests/integration/**`, and root package/environment/deployment files. Developer 2 edits only `workspaces/innovation/**` and `tests/innovation/**`. Root planning/instruction documents change only through the main planning thread; Developer 1 is their sole file editor after agreement. See `WORKSPACE_PLAN.md` for details.
- Read your workspace `AGENTS.md`, `TASKS.md`, and `PROGRESS.md` before work. Work in task order. After each task, run its stated verification, record commands/results and changed files in `PROGRESS.md`, then mark its checkbox. Never mark a task complete on assumption.
- Do not start the next task when its dependency or required contract is unresolved. Report blockers with the exact failing command or mismatch. Keep your progress file compact enough for a fresh thread to continue.

## Testing gates

Both workspaces must typecheck, test and build independently. Integration must verify a newly created project changes the computed warning, a version-checked suggestion updates SQLite and the public timeline, and a resident report receipt reflects the operator response. Run the full demo path with AI enabled and with its labelled fallback. Do not claim tests passed without running them.
