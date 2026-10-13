# OneDig — parallel build and competition roadmap

Assume a 36–48 hour event; adjust clock times to the actual schedule. The plan has three simultaneous-to-sequential outcomes: a complete core app, a working innovation package, then one polished integrated product. **Dig Once Studio begins on day one**, alongside the MVP.

## Milestones and owners

| Window | Developer 1: complete MVP | Developer 2: innovation | Gate |
| --- | --- | --- | --- |
| First 2 hours | Freeze core DTOs, seed relationship, package commands and design tokens | Freeze engine/intake/UI signatures, fixtures and package exports | Contract reviewed in main planning thread |
| Hours 3–10 | Database, seed/reset, public list/detail, operator project form and read APIs | Warning rules, boundary tests, before/after timeline with fixture data; AI extractor schema and evidence validator | Both workspaces run independently |
| Hours 11–20 | Login, manual schedule changes and public events, report/receipt/response path, core browser flow | Bounded candidate search, ranking/no-option states, Studio callbacks; live AI extraction and rules/manual fallback in harness | Core standalone gate **and** innovation standalone gate |
| Hours 21–28 | Wire snapshot, analysis and version-checked apply adapters; confirm SQLite/public update | Connect package exports; refine Studio and intake states; fix engine against integrated snapshots | Newly created project changes computed warning; apply refreshes resident view |
| Hours 29–36 | Wire intake route and confirmation into ordinary project creation; run HTTP/integration checks | Improve evidence display, visual fit, mobile Studio, provider failure handling | Full notice-to-public-update story works |
| Remaining buffer | Production build, clean reset, reliability and deployment | Animation/interaction restraint, exact explanations, demo pacing | Two complete timed rehearsals |

The windows are targets, not a reason to cut the flagship. If time is short, preserve the working simulator and reduce secondary polish or AI intake scope first.

## Ordered dependency path

1. Fix one illustrative street segment, road job and incoming water notice. Road resurfacing ends before the proposed water excavation; the water job has an officer-entered flexibility window that admits a safe earlier slot. Keep example dates relative to the demo day so the recommended slot is not in the past.
2. Developer 1 builds the **entire** core workflow and optional scheduling-window fields. Developer 2 simultaneously builds the engine, intake and components from contract fixtures. Neither requires the other's running server.
3. Verify the core on a fresh SQLite file: create/update project, show resident detail, submit concern, respond, track receipt. Verify innovation separately: warning, safe candidate, no-window, no-safe-option and AI fallback.
4. Connect the read adapter. The server loads a real snapshot; the engine produces the same warning as the fixture. Inspect the actual dates and segment ID, not just a green response.
5. Connect the apply adapter. Version-check focus and peer projects in one transaction; save a public reason; refresh Studio and resident detail. A stale version must refuse the save without a partial event.
6. Connect notice intake. Paste new text, inspect quotes and field validation, correct/confirm it, then create via the core endpoint. Do not let the extractor write directly.
7. Polish one coherent interface and test the full user path at desktop and phone widths. Build and rehearse the production-mode app.

## Testing that protects the demo

- **Core:** migrations/seed repeatability, transaction and version checks, project/report API shapes, cookie protection, receipt secrecy, public event after reschedule.
- **Engine:** inclusive overlap boundaries, planned and completed resurfacing rules, different/cancelled segments, candidate duration, future-date and window bounds, all-peer checking, minimum-shift ranking, no feasible candidate.
- **AI intake:** a live structured result with exact source quotes, ambiguous street, invalid date, unknown department, provider timeout, missing key, and a correctly labelled fallback. Model text is data, not instructions.
- **Integrated browser path:** new notice (or manual fallback) → operator confirmation → computed warning → before/after candidate → apply → public timeline → concern → operator response → receipt. Check a new project changes analysis; this prevents a canned result from passing.
- **Presentation failure states:** no map tiles, expired session, slow API, stale schedule, AI offline. Each state explains what happened and preserves entered work.

## Live demo script

1. Open the resident map/list: Market Road resurfacing is scheduled; project purpose, department and expected dates are visible. Point out the “Illustrative demo data” label.
2. Switch to operator. Paste the fictional water department notice. Show exact highlighted source excerpts and the `AI` mode badge; correct or fill any unknown fields, including the flexibility window. Confirm to create a **new** project.
3. Open Dig Once Studio. Show that the water job begins shortly after paving ends. Display the rule and dates on the street timeline.
4. Generate the before/after comparison. Show the computed earlier water slot and that the warning count changes from one to zero. Explain that the officer must check real-world feasibility.
5. Apply with a public reason. Refresh to show the warning gone and the resident timeline changed. This is a real database mutation, not a visual toggle.
6. Submit a resident access concern, copy its receipt, respond as operator, and track the resolved status. End with the shared record and feedback loop.

If AI is unavailable, use the clearly labelled rules/manual intake flow and still perform live scenario computation. A backup recording or screenshots may support the presentation but must never be described as the live system.

## Risk response

| Risk | Response |
| --- | --- |
| Innovation integration slips | Keep pure engine and Studio visualization; wire analysis/apply before AI intake. Core remains demonstrable. |
| AI provider/key absent | Rules/manual draft; no fabricated AI badge or stored hardcoded output. |
| No feasible schedule | Show the honest no-option state, required window or manual escalation; preserve the warning. |
| Suggestion becomes stale | Peer/focus version conflict, no partial write; refresh and recompute. |
| Map tiles fail | Accessible list and detail remain available; attribution stays on any rendered map. |
| SQLite install or hosting volume fails | Use supported Node LTS and prebuilt driver or compatible SQLite alternative; local one-process demo on the presentation device. |
| Data appears official | Keep synthetic provenance prominent; show calculations on sample data, with no claims of actual savings. |

## Next setup phase

The next **Codex Workspace Setup, AGENTS.md & Task Generation** prompt should establish two isolated implementation workspaces/threads, Git and integration rules, exclusive path ownership, root/package scaffolds, environment example, design tokens, fixture seed, contract-aware task lists and gate checks. It should begin implementation in parallel. This Phase 1 correction changes only the six existing planning documents.
