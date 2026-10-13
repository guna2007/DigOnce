export type WorkType = "excavation" | "resurfacing" | "other";
export type ProjectStatus = "planned" | "active" | "paused" | "completed" | "cancelled";
export type DateOnly = string;

export interface Department { id: string; name: string; contactLabel: string | null }
export interface Segment {
  id: string; roadName: string; fromLabel: string; toLabel: string;
  aliases: string[]; geometry: { type: "LineString"; coordinates: [number, number][] };
  center: { lat: number; lng: number };
}
export interface ProjectEvent {
  id: string; type: "created" | "edit" | "reschedule" | "progress" | "delay" | "completed";
  summary: string; reason: string | null; previousStartDate: DateOnly | null;
  newStartDate: DateOnly | null; previousEndDate: DateOnly | null;
  newEndDate: DateOnly | null; authorLabel: string; createdAt: string;
}
export interface ProjectSummary {
  id: string; title: string; description: string; workType: WorkType;
  department: Department; status: ProjectStatus; impact: string;
  startDate: DateOnly; endDate: DateOnly; actualEndDate: DateOnly | null;
  earliestStartDate: DateOnly | null; latestEndDate: DateOnly | null;
  segments: Segment[]; sourceLabel: string; isDemo: boolean;
  reportCount: number; version: number; updatedAt: string;
}
export interface ProjectDetail extends ProjectSummary { events: ProjectEvent[] }
export interface CreateProject {
  title: string; description: string; workType: WorkType; departmentId: string;
  impact: string; status: "planned" | "active"; startDate: DateOnly; endDate: DateOnly;
  earliestStartDate?: DateOnly | null; latestEndDate?: DateOnly | null;
  segmentIds: string[]; sourceLabel: string;
}
export type WarningKind = "date_overlap" | "recent_resurfacing";
export interface ScenarioProject {
  id: string; title: string; version: number; workType: WorkType;
  status: ProjectStatus; segmentIds: string[]; startDate: DateOnly; endDate: DateOnly;
  actualEndDate: DateOnly | null; earliestStartDate: DateOnly | null; latestEndDate: DateOnly | null;
}
export interface ScenarioSnapshot {
  asOfDate: DateOnly; focusProjectId: string; projects: ScenarioProject[];
  segments: Pick<Segment, "id" | "roadName" | "fromLabel" | "toLabel">[];
}
export interface ScenarioWarning {
  id: string; kind: WarningKind; segmentId: string; projectIds: [string, string];
  explanation: string; evidence: {
    overlapStart: DateOnly | null; overlapEnd: DateOnly | null;
    resurfacingEnd: DateOnly | null; excavationStart: DateOnly | null;
    daysAfterResurfacing: number | null;
  };
}
export interface ScenarioCandidate {
  id: string; startDate: DateOnly; endDate: DateOnly; daysShifted: number;
  warningCountBefore: number; warningCountAfter: 0; resolvedWarningIds: string[];
  expectedPeerVersions: Record<string, number>; rationale: string;
}
export interface ScenarioAnalysis {
  basis: "computed"; asOfDate: DateOnly; focusProjectId: string; focusVersion: number;
  status: "recommendation_available" | "no_change_needed" | "window_required" | "no_safe_option";
  currentWarnings: ScenarioWarning[]; candidate: ScenarioCandidate | null;
  warningsAfter: ScenarioWarning[]; evaluatedStarts: number; limitations: string[];
}
export type IntakeField = "title" | "description" | "workType" | "departmentId" | "startDate" | "endDate" | "impact" | "segmentIds";
export interface IntakeResult {
  mode: "ai" | "rules" | "manual";
  draft: {
    title: string | null; description: string | null; workType: WorkType | null;
    departmentId: string | null; impact: string | null; startDate: DateOnly | null;
    endDate: DateOnly | null; segmentIdCandidates: string[];
  };
  evidence: { field: IntakeField; quote: string }[]; warnings: string[];
}
export interface NoticeInput { rawText: string; departments: Department[]; segments: Segment[] }
export interface CoordinationStudioProps {
  analysis: ScenarioAnalysis; busy: boolean;
  onRefresh(): Promise<ScenarioAnalysis>;
  onApply(candidate: ScenarioCandidate, publicReason: string): Promise<ProjectDetail>;
}
export interface NoticeIntakePanelProps {
  departments: Department[]; segments: Segment[];
  onExtract(rawText: string): Promise<IntakeResult>;
  onConfirm(project: CreateProject): Promise<ProjectDetail>;
}
