# OneDig — ready-to-copy Codex prompts

Use these after the documentation baseline is committed and the relevant worktree/branch exists as described in `GIT_WORKFLOW.md`. The main planning thread coordinates decisions. Starting prompts are for separate implementation threads; they do not authorize cross-workspace edits.

## Start Developer 1 — complete core MVP

```text
You are Developer 1 in the OneDig core-app implementation worktree on feat/core-mvp. Read root AGENTS.md; workspaces/core-app/AGENTS.md, TASKS.md, and PROGRESS.md; and PRODUCT.md, FEATURES.md, ARCHITECTURE.md, API_CONTRACTS.md, WORKSPACE_PLAN.md, ROADMAP.md, and GIT_WORKFLOW.md. Implement core tasks C00–C10 in order, starting at the first unchecked task. Own only the core-app, tests/core, tests/integration, and permitted root setup files. Build a complete resident/operator app that runs with innovation disabled. Use the exact contracts; do not redesign them or edit workspaces/innovation. For every task, run its verification, record the commands/results and changed files in PROGRESS.md, and only then check TASKS.md. Commit small verified increments. If blocked by a contract ambiguity, report the exact field/endpoint and pause only the affected task; continue independent tasks. Stop at the core standalone gate and hand the main planning thread the runnable commands, passing results, and remaining caveats.
```

## Start Developer 2 — innovation and wow factors

```text
You are Developer 2 in the OneDig innovation implementation worktree on feat/innovation-studio. Read root AGENTS.md; workspaces/innovation/AGENTS.md, TASKS.md, and PROGRESS.md; and PRODUCT.md, FEATURES.md, ARCHITECTURE.md, API_CONTRACTS.md, WORKSPACE_PLAN.md, ROADMAP.md, and GIT_WORKFLOW.md. Implement innovation tasks I00–I07 in order, starting at the first unchecked task. Own only workspaces/innovation and tests/innovation. Build and test the pure Dig Once Studio engine, before/after UI, evidence-linked AI notice intake, labelled fallback, and fixture harness independently from the core app. Use package exports and the exact contracts; do not edit core files or silently change shared interfaces. For every task, run its verification, record commands/results and changed files in PROGRESS.md, and only then check TASKS.md. Commit small verified increments. If blocked by a contract ambiguity, report the exact type/field and continue independent tasks. Stop at the innovation standalone gate and hand the main planning thread package build commands, fixture results, and caveats.
```

## Continue in a fresh implementation thread

```text
Continue the active OneDig implementation workspace in this checkout. Read root AGENTS.md and GIT_WORKFLOW.md, then identify whether this checkout owns workspaces/core-app or workspaces/innovation. Read that workspace's AGENTS.md, TASKS.md, and PROGRESS.md plus ARCHITECTURE.md, API_CONTRACTS.md, WORKSPACE_PLAN.md, and ROADMAP.md. Resume the current or first unchecked task using the recorded files and test results; do not redo completed work. Keep exclusive file ownership, run the task's verification before checking it, update PROGRESS.md, and report any contract change through the main planning thread. If the checkout or owner is ambiguous, inspect Git branch and changed paths before editing.
```

## Integrate after both standalone gates

```text
Work in the OneDig integration checkout only after core C10 and innovation I07 have passed. Read root AGENTS.md, GIT_WORKFLOW.md, ARCHITECTURE.md, API_CONTRACTS.md, WORKSPACE_PLAN.md, ROADMAP.md, and both workspaces' AGENTS.md, TASKS.md, and PROGRESS.md. Merge the verified core and innovation branches in the sequence in GIT_WORKFLOW.md. Developer 1 owns core adapter/UI files and completes C11–C13; Developer 2 completes I08 only in innovation-owned files and hands over commits at explicit checkpoints. Wire @onedig/innovation package exports, real SQLite snapshots, version-checked apply, and operator-confirmed intake. Run the read, decision, intake and full-demo gates in order. Record exact commands/results and keep all fixes within their owning paths. Do not claim a successful integration from fixture-only or hardcoded outputs.
```

## Debug a failing gate

```text
Debug the latest failing OneDig task or integration gate. Read root AGENTS.md, ARCHITECTURE.md, API_CONTRACTS.md, GIT_WORKFLOW.md, and the relevant workspace AGENTS.md, TASKS.md, and PROGRESS.md (core-app or innovation). Reproduce the recorded failure, identify the owning module, and make the smallest fix only in that owner's files. Check the contract before changing any payload or date rule; route a shared-interface change through the main planning thread. Run the failing check and its nearest dependent gate, record both results in PROGRESS.md, and update the task checkbox only if its acceptance criteria now pass. Do not mask a failure with a canned response or loosen a test without evidence.
```

## Final testing and demo readiness

```text
Audit the integrated OneDig product for the live demo. Read root AGENTS.md, PRODUCT.md, FEATURES.md, ARCHITECTURE.md, API_CONTRACTS.md, WORKSPACE_PLAN.md, ROADMAP.md, GIT_WORKFLOW.md, and both workspace AGENTS.md, TASKS.md, and PROGRESS.md. Use a fresh synthetic-data reset, run both packages' typechecks/tests/builds and the integrated browser journey. Demonstrate new notice input (AI if available, honestly labelled rules/manual otherwise), operator confirmation, a newly computed warning, safe before/after candidate, version-checked save, public timeline refresh, resident report and receipt response. Rehearse at desktop and phone widths; check tile, AI, stale-session and no-safe-option states. Record exact results, failures and remaining risks in the owning PROGRESS.md files. State demo-ready only if the complete live path passes twice; do not infer test results.
```
