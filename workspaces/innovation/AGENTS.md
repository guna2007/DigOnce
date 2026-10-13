# Innovation workspace — Developer 2

Read root `AGENTS.md`, then this file, `TASKS.md`, `PROGRESS.md`, `API_CONTRACTS.md`, and `ARCHITECTURE.md` before coding. The goal is a **standalone, testable Dig Once Studio and evidence-linked notice intake package**, later imported into the core app.

## Ownership

Allowed: `workspaces/innovation/**` and `tests/innovation/**`. Update only this workspace's `TASKS.md` checkboxes and `PROGRESS.md` during normal execution. Propose contract or core design-token changes in the main planning thread; Developer 1 applies agreed changes in its owned files.

Forbidden: `workspaces/core-app/**`, `tests/core/**`, `tests/integration/**`, root package/environment/deployment files and the six planning documents. Never edit the SQLite schema, call core HTTP from innovation components, handle sessions, or write projects/reports directly.

## Architecture and contracts

- Export `analyzeScenario` from `@onedig/innovation/engine`, `extractNotice` from `@onedig/innovation/intake`, and `CoordinationStudio`/`NoticeIntakePanel` from `@onedig/innovation/ui`. Export types through `@onedig/innovation/contracts`; use package subpaths, not cross-directory source paths. React is a peer dependency.
- Implement the exact `ScenarioSnapshot`, warning, candidate, analysis, intake and component props in `API_CONTRACTS.md`. The engine is pure and deterministic. It recommends only zero-warning candidates inside a valid window; above 31 candidate starts requires a narrower window. No AI decides scheduling.
- Extraction is server-only, with structured AI output, verified source quotes and catalog IDs, a timeout, and accurately labelled `ai`, `rules`, or `manual` fallback. Unknown fields remain null. Operator confirmation belongs to the core callback.
- Components receive data/callback props, use core CSS tokens, and show before/after, limitations, no-solution, loading and error states. The local harness uses realistic fixtures and mock callbacks; it must not pretend a mock result is live API data.

## Commands

From repository root, after task I00 has created package scripts: `npm --prefix workspaces/innovation install`, `npm --prefix workspaces/innovation run dev:harness`, `npm --prefix workspaces/innovation run typecheck`, `npm --prefix workspaces/innovation run test`, `npm --prefix workspaces/innovation run build`. Before I00, these commands are expected to be unavailable; I00 defines them. Never report a command as passing until it ran.

## Coding and done criteria

Use strict TypeScript, pure date calculations, bounded loops and explicit validation of model output. Do not use cost or traffic estimates, silent candidate truncation, invented source evidence, or auto-apply. Each task is done only after its verification commands pass and its changed files/results are recorded in `PROGRESS.md`. The workspace is complete when fixture changes alter the computed result, the harness demonstrates a safe candidate and honest no-option path, AI extraction and fallback are labelled, and exported package APIs build cleanly for core integration.
