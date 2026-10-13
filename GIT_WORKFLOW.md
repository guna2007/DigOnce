# OneDig — Git and integration workflow

## Baseline and worktrees

At setup time this directory has **no Git metadata**. The main planning/coordination thread should initialize Git (`git init -b main` if still needed), commit the approved six plans plus these execution documents, and only then create implementation branches. Do not create worktrees from an uncommitted baseline. Use Codex-managed worktrees when available; each is a full checkout, but ownership below limits edits. This file describes the workflow and does not itself initialize Git or create worktrees.

| Worktree/branch | Developer | Allowed implementation paths |
| --- | --- | --- |
| `feat/core-mvp` | Developer 1 | `workspaces/core-app/**`, `tests/core/**`, `tests/integration/**`, root package/environment/deployment files |
| `feat/innovation-studio` | Developer 2 | `workspaces/innovation/**`, `tests/innovation/**` |
| `integrate/onedig-demo` | Coordinator/Developer 1 after both standalone gates | Core adapter/UI/test paths and agreed root contract changes; merge innovation commits, do not hand-edit its files |

Developer 1 maintains core standalone behaviour through C10; Developer 2 completes innovation I07 independently. The two branches can advance simultaneously because they do not edit the same files. The main thread records cross-workspace decisions and gate status. Root planning/instruction changes require a decision there; Developer 1 applies them as sole editor, and both branches synchronize before using the new contract.

## Commit and review discipline

- Commit small verified tasks: `core: add project event writes`, `innovation: search safe schedule windows`, `test: cover stale peer version`, or `docs: clarify scenario contract`. Include the task ID in the commit body or title when useful.
- Before commit: inspect changed paths, run the task's verification, update only your `TASKS.md` checkbox and `PROGRESS.md`, then commit code and progress together. Do not commit `.env`, SQLite files, `node_modules`, build output or raw notice/report tokens. Developer 1 adds `.gitignore` in C00.
- One developer does not edit the other's workspace to fix an issue. Send the failing payload/test and expected contract behaviour to the owner. Do not commit a mock result as a live engine or AI response.

## Integration sequence

1. **Baseline:** main contains documentation and no application source. Confirm both branches start from this commit.
2. **Parallel:** merge no incomplete tasks. Developer 1 reaches C10; Developer 2 reaches I07. Each hands off passing commands, package/build artifacts, fixture payloads and any unresolved caveat.
3. **Integration branch:** create `integrate/onedig-demo` from current main; merge `feat/core-mvp`, then `feat/innovation-studio`. Run both workspace typechecks/tests/builds before adapter edits.
4. **Core wiring:** Developer 1 works in the integration checkout on C11–C13. Add `@onedig/innovation` as a package dependency using its exports; never import `../innovation/src/*` or copy source files. Developer 2 continues I08 only on its own branch/worktree. The coordinator merges those innovation commits into the integration branch at explicit checkpoints, after Developer 1 has paused conflicting integration tests/builds.
5. **Gates:** verify real SQLite snapshot → computed analysis; stale focus/peer versions → 409 with no event; AI draft → human-confirmed core create; public timeline and report receipt. Run the full demo from clean reset, then merge the integration branch into main.

## Conflict and contract rules

- A conflict in an owned path is resolved by that path's owner; the coordinator asks for their fix rather than rewriting it. A root config conflict belongs to Developer 1. Do not use blanket conflict-resolution options that discard a branch.
- For a proposed shared DTO/route/engine signature change: write the exact old/new shape and reason in the main planning thread; decide there; Developer 1 updates `API_CONTRACTS.md`; each developer updates only its own implementation and tests; rerun both package checks and the integrated contract test. No silent interface drift.
- Keep an integration checkpoint after the read adapter, after version-checked apply, after intake confirmation, and before final demo. If a checkpoint fails, fix the owning module and rerun that gate before proceeding.
