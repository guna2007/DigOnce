# OneDig — revised architecture

## Technology choices

Keep one deployable web product: React + TypeScript + Vite, Fastify + TypeScript, SQLite via `better-sqlite3`, and Leaflet for the map. This preserves rapid local development and a single browser experience. Fastify's route schemas validate boundaries ([official guidance](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)); Vite has a React TypeScript starter ([guide](https://vite.dev/guide/)); SQLite transactions make a schedule change and its public event atomic ([SQLite](https://www.sqlite.org/atomiccommit.html)). The server serves the built UI in demo mode and holds the SQLite file on a persistent volume if deployed.

AI notice intake uses a server-only OpenAI Responses API call with structured output ([official guide](https://developers.openai.com/api/docs/guides/structured-outputs)). The model proposes fields from pasted text; application code checks schema, source excerpts, dates, known departments and known road segments. The operator confirms before any database write. A rule-based/manual mode is explicit when the provider is absent or fails. AI never predicts savings, decides a schedule or publishes a notice.

The map uses configurable tiles with visible attribution. If using OpenStreetMap Foundation tiles, obey its [tile policy](https://operations.osmfoundation.org/policies/tiles/); public list/detail still work without tiles. No live civic-data API, geocoder, queue, microservice or hosted identity provider is required.

## Modules and ownership boundary

```text
Browser: core React app ── resident and operator flows ──────────┐
                       └─ imported innovation UI components      │ JSON /api/v1
                                                                  ▼
Core Fastify routes ── validation/session/transactions ── SQLite (core owned)
        │
        └─ innovation adapter ── pure scenario engine
                              └─ notice extractor ── optional AI provider
```

The **core app** owns all persistence, public routes, operator session, project/report writes and the visual shell. It runs with the innovation adapter disabled. The **innovation package** owns pure scenario analysis, notice extraction and two self-contained React surfaces: `CoordinationStudio` and `NoticeIntakePanel`. It receives contract DTOs and callbacks; it never imports SQLite or writes the core database. Server imports use package subpaths `@onedig/innovation/engine` and `@onedig/innovation/intake`; browser imports use `@onedig/innovation/ui`. React is a peer dependency so the final app has one React runtime.

Developer 1 creates a narrow adapter in the core route layer, initially returning `INNOVATION_UNAVAILABLE` and hiding Studio navigation. Developer 2 runs the innovation package against fixture snapshots and mock callbacks in its own local harness. At integration, Developer 1 wires the package into the existing route/UI slots; Developer 2 adjusts only innovation-owned files. The HTTP and package interfaces are frozen in `API_CONTRACTS.md`.

## Workflows and data flow

1. **Core record:** operator logs in and creates a project with department, canonical segment, scheduled dates, optional allowable window, impact and source label. A transaction stores the project and a public event. Residents see it on map/list/detail. Updates and delay reasons append events.
2. **AI intake:** operator pastes a notice. Core's authenticated endpoint passes text and known catalog values to the innovation extractor. Structured fields and exact evidence snippets return as an editable draft. The server rejects quotes absent from source text, invalid dates, and unrecognized IDs. The operator confirms via the ordinary core `POST /operator/projects`; no raw notice is persisted in the prototype.
3. **Scenario analysis:** operator selects a *planned* focus project. Core loads it plus all projects on its canonical segments and calls the pure engine with `asOfDate`. The engine emits evidence-backed current warnings and enumerates candidate starts, preserving inclusive work duration. It considers only the declared `earliestStartDate..latestEndDate` window. If that creates more than 31 candidate starts, it asks the officer to narrow the window rather than silently truncating the search. It evaluates the focus against **all** segment peers, not merely one highlighted pair. A candidate is recommended only if it removes all focus warnings; rank safe candidates by fewest days shifted, then earliest start. Missing window or no safe candidate yields a clear no-solution result.
4. **Decision and publish:** Studio displays current and proposed dates side by side. Officer enters a reason and applies through the core reschedule endpoint. Core checks the focus version and peer versions in one transaction, validates the dates/window, saves and appends a public `reschedule` event. Studio refreshes analysis; resident detail shows the new dates and reason. If versions changed, return 409 and recompute.
5. **Resident feedback:** anonymous report creation returns a random receipt token once; only its hash is stored. Operator responds; receipt holder sees status and response. Report content is never exposed in public project reads.

## Deterministic coordination rules

- Compare non-cancelled works sharing a curated segment ID. `date_overlap`: two planned/active intervals intersect inclusively.
- `recent_resurfacing`: a planned/active excavation starts 1–90 calendar days after a resurfacing project's scheduled end, or its actual end if completed. This includes **planned** resurfacing, so it is preventive. A date overlap takes precedence for a pair/segment.
- Warnings are advisory. A segment name match, model output or map proximity alone is insufficient. The engine does not know utility feasibility, contractor availability, traffic impact or budget. An officer supplies the allowable window and owns the final decision.
- All calculations use date-only calendar arithmetic in the demo locality. Candidate starts must be on/after server `asOfDate`; completed/active projects are fixed. A missing or invalid window generates warnings but no recommendation.

## Persistence and schemas

| Table | Key fields |
| --- | --- |
| `departments` | `id`, `name`, `contact_label` |
| `segments` | `id`, road/from/to labels, curated GeoJSON line and center, normalized aliases |
| `projects` | `id`, title, description, work type, department FK, status, impact, scheduled start/end, nullable actual end, nullable earliest start/latest end, source label, `is_demo`, version, timestamps |
| `project_segments` | project ID + segment ID composite key |
| `project_events` | project ID, event type, summary, reason, previous/new dates, author label, timestamp |
| `reports` | project ID, category, description, status, response, hashed receipt token, timestamps |

Foreign keys and indexes cover segment membership, date/status reads and report queue. Dates are ISO `YYYY-MM-DD`; timestamps are UTC. Require `startDate <= endDate`, both window bounds together or neither, and `earliestStartDate <= startDate <= endDate <= latestEndDate` for planned flexible work. Planned work duration is inclusive day count. Synthetic fixtures are seeded relative to a selected demo date and visibly labelled `Illustrative demo data`.

## Future repository shape — Phase 2 only

```text
/
  PRODUCT.md FEATURES.md ARCHITECTURE.md API_CONTRACTS.md WORKSPACE_PLAN.md ROADMAP.md
  package.json                 # root orchestration, Developer 1
  .env.example                 # Developer 1
  workspaces/
    core-app/                  # full React + Fastify + SQLite MVP, Developer 1
    innovation/                # pure engine, AI intake, UI components, fixture harness, Developer 2
  tests/
    core/                     # Developer 1
    integration/              # Developer 1
    innovation/               # Developer 2
```

Each workspace has its own package manifest and lockfile. The innovation package has no migrations. The final build imports it into the core process, so there is one deployable app and no cross-service network hop.

## Reliability, security and verification

Public reads are anonymous. One seeded operator account with a hashed password and short-lived signed HttpOnly cookie protects writes; origin checks and rate limits protect login/intake/reports. Never log pasted notice text, credentials or receipt tokens. Time out AI requests, validate all output and allow manual correction; show `ai`, `rules` or `manual` provenance. A failed extractor cannot create a project. A failed engine leaves core workflows usable and shows an honest unavailable state.

Test project/report transactions and the browser core loop; test scenario boundary dates, candidate search, missing windows, impossible schedules and quote validation in the innovation package. At integration, run contract tests and a browser journey that uses **newly confirmed data**, not hardcoded recommendations. Rehearse with AI available and with the manual fallback.
