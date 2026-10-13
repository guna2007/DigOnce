# OneDig — optimized two-developer workspace plan

## Principle and count

Use **exactly two** development workspaces. Developer 1 owns a complete, independently demonstrable civic product. Developer 2 owns the entire winning innovation: Dig Once Studio, its deterministic engine, AI notice intake, visual components and fixture harness. This avoids the previous frontend/backend split, where neither developer could finish an end-to-end outcome alone. The final deliverable remains one executable app.

The main Codex planning thread owns decisions, contract changes, checkpoints and demo priorities. Separate implementation threads/worktrees may be set up in the **next phase**; no worktree or task prompt is created here.

## Exclusive file ownership

| Path or asset | Owner | Responsibility |
| --- | --- | --- |
| `workspaces/core-app/**` | Developer 1 | Full React/Fastify/SQLite core; resident and operator flows; core API and adapter slots; root UI shell and tokens |
| `workspaces/innovation/**` | Developer 2 | Pure engine, extraction/provider adapter, Studio and intake components, own fixture harness, package manifest/lockfile |
| `tests/core/**`, `tests/integration/**` | Developer 1 | Core behaviour, HTTP contract and integrated browser flow |
| `tests/innovation/**` | Developer 2 | Engine, extractor, UI component and fixture tests |
| Root `package.json`, `.env.example`, deployment config if added | Developer 1 | One-process build/run and environment settings |
| The six root planning documents | Developer 1 as sole editor after a decision in the main planning thread | Contract corrections; Developer 2 proposes text, does not edit these files |

No joint phase changes file ownership. Developer 1 edits only core/integration-owned files to import the innovation package and polish the shell. Developer 2 edits only innovation-owned files to improve analysis, extraction and Studio/intake UI. Both review the integrated product and assign fixes to the owning developer. Package-local manifests and lockfiles prevent dependency conflicts.

## Developer 1 — complete functional MVP

- Build public map/list, project details and timeline, source/demo labels, mobile layout, filters and loading/error states.
- Build operator login, project create/edit/reschedule, progress/delay updates, segment/department catalog and version-checked writes.
- Build anonymous concern form, receipt tracking and operator response queue.
- Own database schema/migrations/seed/reset, session and abuse controls, API routes, deployment and core tests.
- Include optional `earliestStartDate` and `latestEndDate` in project data and form. The core can display and manually edit projects without using the Studio.
- Provide an inactive innovation adapter slot: routes return `INNOVATION_UNAVAILABLE` until wired; innovation navigation is hidden or clearly unavailable. A standalone core demo must pass before final integration.

## Developer 2 — flagship and wow factors

- Build the pure, bounded scenario evaluator over `ScenarioSnapshot`: warning evidence, safe candidate enumeration, ranking, and honest no-solution states.
- Build `CoordinationStudio` with before/after timeline, rule explanation, exact dates, limitations, public reason entry and callback-based apply.
- Build AI notice extraction with source-evidence validation, catalog matching, timeouts and a labelled rules/manual fallback.
- Build `NoticeIntakePanel` with source text, editable extracted draft, evidence display, unknown-field prompts and callback-based confirmation.
- Maintain realistic fixture snapshots and notice text in the innovation workspace. Run the engine/components in its own harness with mock `onApply`/`onConfirm`; the package must work before the core API is ready.
- Never open the SQLite file, change migrations, call core HTTP from inside the package, or publish model output automatically.

## Contract and independent parallel work

The frozen boundary is `API_CONTRACTS.md`: core DTOs, `ScenarioSnapshot → ScenarioAnalysis`, `NoticeInput → IntakeResult`, UI props/callbacks and HTTP adapters. Developer 1 can implement a full core app with the innovation disabled. Developer 2 can implement/test against contract fixtures and mock callbacks. Neither waits for the other's source code.

Before implementation, both review exact seed IDs and dates, segment aliases, a feasible scheduling window, UI design tokens and package subpath exports. A change request goes through the main planning thread; Developer 1 updates the contract, and both align their own code. No developer modifies the other's files to fix drift.

## Integration checkpoints

1. **Contract gate:** both independently compile their contract types and test fixtures; no missing fields or ambiguous date semantics.
2. **Core standalone gate:** new project, manual schedule update, resident timeline, report and receipt work with innovation disabled.
3. **Innovation standalone gate:** fixture notice produces a reviewable draft; a newly supplied snapshot produces a computed warning and candidate; no-key and no-option states render honestly in the harness.
4. **Read adapter:** Developer 1 builds `ScenarioSnapshot` from SQLite and calls Developer 2's pure engine. Compare route output with the innovation fixture expectation.
5. **Decision adapter:** Developer 1 wires `CoordinationStudio` callbacks to version-checked core reschedule. Developer 2 polishes component states. A save changes the resident page and a fresh analysis.
6. **Intake adapter:** Developer 1 wires extraction route and `NoticeIntakePanel` callbacks; extracted data stays a draft until ordinary core project creation.
7. **Joint polish:** shared review of visual consistency, responsiveness, keyboard access, errors, loading states and demo pacing. Fixes stay in owned paths; run integrated tests and two rehearsals.

## Handoff evidence

At each gate the owner supplies a runnable command, fixture or API example, a passing targeted check, and a screenshot or short interaction description. The final handoff is one build that can reset synthetic data and complete the entire notice → confirmation → warning → computed alternative → operator decision → public update → resident receipt story without hidden mocks.
