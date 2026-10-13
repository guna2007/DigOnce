export type WorkType = "excavation" | "resurfacing" | "other";
export type ProjectStatus = "planned" | "active" | "paused" | "completed" | "cancelled";
export type EventType = "created" | "edit" | "reschedule" | "progress" | "delay" | "completed";
export type ReportStatus = "new" | "in_review" | "resolved";
export type ReportCategory = "safety" | "access" | "quality" | "other";
export type DateOnly = string;
export type GeoLineString = { type: "LineString"; coordinates: [number, number][] };

export interface Department {
  id: string;
  name: string;
  contactLabel: string | null;
}

export interface Segment {
  id: string;
  roadName: string;
  fromLabel: string;
  toLabel: string;
  aliases: string[];
  geometry: GeoLineString;
  center: { lat: number; lng: number };
}

export interface ProjectEvent {
  id: string;
  type: EventType;
  summary: string;
  reason: string | null;
  previousStartDate: DateOnly | null;
  newStartDate: DateOnly | null;
  previousEndDate: DateOnly | null;
  newEndDate: DateOnly | null;
  authorLabel: string;
  createdAt: string;
}

export interface ProjectSummary {
  id: string;
  title: string;
  description: string;
  workType: WorkType;
  department: Department;
  status: ProjectStatus;
  impact: string;
  startDate: DateOnly;
  endDate: DateOnly;
  actualEndDate: DateOnly | null;
  earliestStartDate: DateOnly | null;
  latestEndDate: DateOnly | null;
  segments: Segment[];
  sourceLabel: string;
  isDemo: boolean;
  reportCount: number;
  version: number;
  updatedAt: string;
}

export interface ProjectDetail extends ProjectSummary {
  events: ProjectEvent[];
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
    requestId: string;
  };
}

export interface ListResponse<T> {
  items: T[];
}
