# OneDig — Phase 1 contract for parallel implementation

This is the source of truth for the two Phase 2 workspaces. HTTP base path: `/api/v1`. JSON keys use `camelCase`; IDs are opaque strings; dates are `YYYY-MM-DD`; timestamps are UTC ISO 8601. Date-only comparisons use calendar days in the demo locality (Asia/Kolkata). Unknown write fields are rejected. Lists use `{ "items": [...] }`. The core app owns HTTP, sessions and persistence. The innovation package receives value objects, returns proposals and never writes SQLite.

## Shared core models

```ts
type WorkType = "excavation" | "resurfacing" | "other";
type ProjectStatus = "planned" | "active" | "paused" | "completed" | "cancelled";
type EventType = "created" | "edit" | "reschedule" | "progress" | "delay" | "completed";
type ReportStatus = "new" | "in_review" | "resolved";
type ReportCategory = "safety" | "access" | "quality" | "other";
type DateOnly = string; // YYYY-MM-DD, valid calendar date
type GeoLineString = { type: "LineString"; coordinates: [number, number][] }; // [lng, lat]

interface Department { id: string; name: string; contactLabel: string | null }
interface Segment {
  id: string; roadName: string; fromLabel: string; toLabel: string;
  aliases: string[]; geometry: GeoLineString; center: { lat: number; lng: number };
}
interface ProjectEvent {
  id: string; type: EventType; summary: string; reason: string | null;
  previousStartDate: DateOnly | null; newStartDate: DateOnly | null;
  previousEndDate: DateOnly | null; newEndDate: DateOnly | null;
  authorLabel: string; createdAt: string;
}
interface ProjectSummary {
  id: string; title: string; description: string; workType: WorkType;
  department: Department; status: ProjectStatus; impact: string;
  startDate: DateOnly; endDate: DateOnly; actualEndDate: DateOnly | null;
  earliestStartDate: DateOnly | null; latestEndDate: DateOnly | null;
  segments: Segment[]; sourceLabel: string; isDemo: boolean;
  reportCount: number; version: number; updatedAt: string;
}
interface ProjectDetail extends ProjectSummary { events: ProjectEvent[] } // newest first
interface ApiError {
  error: { code: string; message: string; details?: Record<string, string>; requestId: string };
}
```

Both window bounds are present or both null. For flexible planned work: `earliestStartDate <= startDate <= endDate <= latestEndDate`. Scheduled duration is inclusive: `endDate - startDate + 1` calendar days. The server sets `isDemo`; synthetic records must be visibly labelled. Public project reads never include report descriptions, tokens, notice source text or AI prompts.

## Core HTTP surface — independently usable

| Method and path | Request | Response |
| --- | --- | --- |
| `GET /projects` | Optional `status`, `departmentId`, `q` | `200 {items: ProjectSummary[]}`; max 100 |
| `GET /projects/:id` | ID | `200 ProjectDetail` |
| `GET /segments` | — | `200 {items: Segment[]}` |
| `GET /departments` | — | `200 {items: Department[]}` |
| `POST /reports` | `{projectId, category, description}` | `201 {reportId, receiptToken, status:"new", createdAt}` |
| `POST /reports/track` | `{receiptToken}` | `200 {reportId, projectId, category, status, operatorResponse, updatedAt}` |
| `GET /operator/session` | Cookie | `200 {authenticated:boolean}` |
| `POST /operator/session` | `{password}` | `200 {authenticated:true, operatorLabel}`; sets cookie |
| `DELETE /operator/session` | Cookie | `204`; clears cookie |
| `POST /operator/projects` | `CreateProject` | `201 ProjectDetail` |
| `PATCH /operator/projects/:id` | `{version, reason, changes}` | `200 ProjectDetail` |
| `POST /operator/projects/:id/reschedule` | `Reschedule` | `200 ProjectDetail` |
| `POST /operator/projects/:id/updates` | `PublishUpdate` | `201 ProjectEvent` |
| `GET /operator/reports` | Optional `status` | `200 {items: OperatorReport[]}` |
| `PATCH /operator/reports/:id` | `{status, operatorResponse}` | `200 OperatorReport` |

```ts
interface CreateProject {
  title: string; description: string; workType: WorkType; departmentId: string;
  impact: string; status: "planned" | "active"; startDate: DateOnly; endDate: DateOnly;
  earliestStartDate?: DateOnly | null; latestEndDate?: DateOnly | null;
  segmentIds: string[]; sourceLabel: string;
}
interface Reschedule {
  version: number; startDate: DateOnly; endDate: DateOnly; reason: string;
  expectedPeerVersions?: Record<string, number>; // optional standalone core flow
}
interface PublishUpdate {
  version: number; type: "progress" | "delay"; summary: string;
  reason?: string; revisedEndDate?: DateOnly;
}
interface OperatorReport {
  id: string; projectId: string; category: ReportCategory; description: string;
  status: ReportStatus; operatorResponse: string | null;
  createdAt: string; updatedAt: string;
}
```

Project metadata/status changes and reschedules require a 10–500 character reason and increment `version`. A `delay` update requires a reason and later `revisedEndDate`, saved with the event in one transaction. Completion requires `actualEndDate`. Reports are 10–500 characters; receipt tokens have at least 128 bits of randomness and are stored hashed. Report transitions are `new → in_review → resolved`; resolution requires a 10–500 character response. Tracking returns a generic 404 for an absent token. All operator routes require the signed HttpOnly cookie; login, report and intake calls are rate-limited.

## Innovation engine contract — pure package

```ts
type WarningKind = "date_overlap" | "recent_resurfacing";
interface ScenarioProject {
  id: string; title: string; version: number; workType: WorkType;
  status: ProjectStatus; segmentIds: string[];
  startDate: DateOnly; endDate: DateOnly; actualEndDate: DateOnly | null;
  earliestStartDate: DateOnly | null; latestEndDate: DateOnly | null;
}
interface ScenarioSnapshot {
  asOfDate: DateOnly; focusProjectId: string;
  projects: ScenarioProject[]; // focus plus ALL projects on its segments
  segments: Pick<Segment, "id" | "roadName" | "fromLabel" | "toLabel">[];
}
interface ScenarioWarning {
  id: string; kind: WarningKind; segmentId: string;
  projectIds: [string, string]; explanation: string;
  evidence: {
    overlapStart: DateOnly | null; overlapEnd: DateOnly | null;
    resurfacingEnd: DateOnly | null; excavationStart: DateOnly | null;
    daysAfterResurfacing: number | null;
  };
}
interface ScenarioCandidate {
  id: string; startDate: DateOnly; endDate: DateOnly; daysShifted: number;
  warningCountBefore: number; warningCountAfter: 0;
  resolvedWarningIds: string[];
  expectedPeerVersions: Record<string, number>;
  rationale: string; // deterministic, with exact dates and rule
}
interface ScenarioAnalysis {
  basis: "computed"; asOfDate: DateOnly; focusProjectId: string; focusVersion: number;
  status: "recommendation_available" | "no_change_needed" |
          "window_required" | "no_safe_option";
  currentWarnings: ScenarioWarning[];
  candidate: ScenarioCandidate | null;
  warningsAfter: ScenarioWarning[]; // [] for safe candidate; [] if candidate is null
  evaluatedStarts: number; limitations: string[];
}
declare function analyzeScenario(snapshot: ScenarioSnapshot): ScenarioAnalysis;
```

Rules: compare non-cancelled works sharing a segment. `date_overlap` is inclusive interval intersection for two planned/active works. Otherwise `recent_resurfacing` flags a planned/active excavation beginning 1–90 days after planned/active resurfacing's scheduled end or completed resurfacing's actual end. One pair/segment yields at most one warning; overlap wins. IDs are stable hashes of segment + sorted project IDs + kind. `currentWarnings` includes warnings involving the focus, evaluated against every peer on its segments. A completed/active focus is never moved. For a planned focus, enumerate candidate starts from `max(asOfDate, earliestStartDate)` through `latestEndDate - duration + 1`. If this range has more than 31 starts, return `window_required` with a request to narrow the window; never silently truncate. Recommend only a candidate with **zero focus warnings**, ranked by smallest absolute day shift, then earliest start. No valid window or safe candidate returns null with the appropriate status; the engine must not invent feasibility.

## Innovation HTTP adapter — core owned routes

| Method and path | Request | Response and fallback |
| --- | --- | --- |
| `POST /operator/coordination/analyze` | `{focusProjectId}` | `200 ScenarioAnalysis`; core loads snapshot and calls engine; `503 INNOVATION_UNAVAILABLE` if package disabled |
| `POST /operator/intake/extract` | `{rawText}` (50–6000 chars) | `200 IntakeResult`; if AI fails, return labelled `rules` or `manual` draft |

```ts
type IntakeField = "title" | "description" | "workType" |
  "departmentId" | "startDate" | "endDate" | "impact" | "segmentIds";
interface IntakeResult {
  mode: "ai" | "rules" | "manual"; // never imply rules are AI
  draft: {
    title: string | null; description: string | null; workType: WorkType | null;
    departmentId: string | null; impact: string | null;
    startDate: DateOnly | null; endDate: DateOnly | null;
    segmentIdCandidates: string[];
  };
  evidence: { field: IntakeField; quote: string }[]; // exact substrings of rawText
  warnings: string[]; // unknown, ambiguous, rejected or provider unavailable
}
interface NoticeInput { rawText: string; departments: Department[]; segments: Segment[] }
declare function extractNotice(
  input: NoticeInput, options: { apiKey?: string; model?: string; timeoutMs: number }
): Promise<IntakeResult>;
```

AI may identify text spans and suggest values, but code verifies that each non-null extracted field has a supporting `quote` appearing verbatim in `rawText`, that dates are real, and that IDs are among the provided catalog. Unsupported fields become null with a warning. Segment matching uses curated aliases; ambiguous matches remain candidates for human selection. The extractor returns no `earliestStartDate` or `latestEndDate`: the officer must enter scheduling flexibility from their own authority. Extraction does **not** call `POST /operator/projects` and never writes SQLite. If AI errors or times out, deterministic known-alias/date parsing may return `mode:"rules"`; otherwise return blank `mode:"manual"` with a warning.

## UI package boundary

```ts
interface CoordinationStudioProps {
  analysis: ScenarioAnalysis; busy: boolean;
  onRefresh(): Promise<ScenarioAnalysis>;
  onApply(candidate: ScenarioCandidate, publicReason: string): Promise<ProjectDetail>;
}
interface NoticeIntakePanelProps {
  departments: Department[]; segments: Segment[];
  onExtract(rawText: string): Promise<IntakeResult>;
  onConfirm(project: CreateProject): Promise<ProjectDetail>;
}
```

The components live in the innovation package and use core CSS tokens. They do not fetch, store credentials, or mutate the database. Core handles selection, loading, auth, API calls and navigation. Core's `onApply` sends `Reschedule` with `focusVersion`, candidate dates and `expectedPeerVersions`. The server compares all stated versions in one transaction and rejects stale input with 409; it then saves an event. The UI refreshes analysis after a successful save. Core's `onConfirm` submits the operator-reviewed draft through `CreateProject`.

## Example flow

Synthetic source text: “Water Department: replace water main on Market Road, Library to Bus Stand, 30 Oct–4 Nov 2026.” The officer pastes it, reviews extracted dates/segment and independently enters an allowable window of 14 Oct–4 Nov 2026. The core creates a planned water project on `seg-market-1`. Existing resurfacing on that segment ends 27 Oct 2026.

```json
{"mode":"ai","draft":{"title":"Water main replacement","description":"Replace the water main","workType":"excavation","departmentId":"water","impact":null,"startDate":"2026-10-30","endDate":"2026-11-04","segmentIdCandidates":["seg-market-1"]},"evidence":[{"field":"title","quote":"replace water main"},{"field":"description","quote":"replace water main"},{"field":"workType","quote":"replace water main"},{"field":"departmentId","quote":"Water Department"},{"field":"segmentIds","quote":"Market Road, Library to Bus Stand"},{"field":"startDate","quote":"30 Oct–4 Nov 2026"},{"field":"endDate","quote":"30 Oct–4 Nov 2026"}],"warnings":["Impact is not stated; operator input required."]}
```

This example is a possible **AI** output, not a hardcoded live result. A rules/manual fallback must carry its own correct mode.

```json
{"basis":"computed","asOfDate":"2026-10-13","focusProjectId":"prj-water","focusVersion":1,"status":"recommendation_available","currentWarnings":[{"id":"warn_52","kind":"recent_resurfacing","segmentId":"seg-market-1","projectIds":["prj-road","prj-water"],"explanation":"Water work starts 3 days after resurfacing ends on Market Road.","evidence":{"overlapStart":null,"overlapEnd":null,"resurfacingEnd":"2026-10-27","excavationStart":"2026-10-30","daysAfterResurfacing":3}}],"candidate":{"id":"cand_16oct","startDate":"2026-10-16","endDate":"2026-10-21","daysShifted":-14,"warningCountBefore":1,"warningCountAfter":0,"resolvedWarningIds":["warn_52"],"expectedPeerVersions":{"prj-road":1},"rationale":"Finish water work by 21 Oct, before resurfacing starts 22 Oct."},"warningsAfter":[],"evaluatedStarts":17,"limitations":["Advisory schedule only; contractor and utility feasibility require officer review."]}
```

```json
{"version":1,"startDate":"2026-10-16","endDate":"2026-10-21","reason":"Water work will finish before resurfacing to avoid reopening this road.","expectedPeerVersions":{"prj-road":1}}
```

The last payload goes to `POST /operator/projects/prj-water/reschedule`. Its response is a `ProjectDetail` with version 2 and a public `reschedule` event. A fresh analysis returns `no_change_needed` and no warning. All dates in examples are illustrative; Phase 2 seed generation should keep the relationship valid relative to the demo date.

## Errors, fallbacks and test obligations

```json
{"error":{"code":"VERSION_CONFLICT","message":"The street schedule changed. Refresh before applying.","details":{"projectId":"prj-road"},"requestId":"req_7k2"}}
```

Use `VALIDATION_ERROR` (400/422), `UNAUTHENTICATED` (401), `FORBIDDEN_ORIGIN` (403), `NOT_FOUND` (404), `VERSION_CONFLICT` (409), `RATE_LIMITED` (429), `INNOVATION_UNAVAILABLE` (503), and `INTERNAL_ERROR` (500). UI preserves input on errors. AI failure returns a labelled draft fallback, while disabled engine returns 503; neither may be presented as a successful recommendation. Contract tests cover these shapes plus invalid windows, stale peer versions, absent source evidence, no safe option, and a newly created project that changes the Studio result.
