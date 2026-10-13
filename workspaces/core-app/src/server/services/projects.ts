import type { CoreDatabase } from "../db/database";
import type {
  Department,
  EventType,
  GeoLineString,
  ProjectDetail,
  ProjectEvent,
  ProjectStatus,
  ProjectSummary,
  Segment,
  WorkType,
} from "../../shared/contracts";
import { ApiFailure } from "../errors";

interface RawProject {
  id: string;
  title: string;
  description: string;
  work_type: WorkType;
  department_id: string;
  department_name: string;
  contact_label: string | null;
  status: ProjectStatus;
  impact: string;
  start_date: string;
  end_date: string;
  actual_end_date: string | null;
  earliest_start_date: string | null;
  latest_end_date: string | null;
  source_label: string;
  is_demo: number;
  report_count: number;
  version: number;
  updated_at: string;
}

interface RawSegment {
  id: string;
  road_name: string;
  from_label: string;
  to_label: string;
  aliases_json: string;
  geometry_json: string;
  center_lat: number;
  center_lng: number;
}

const projectSelect = `
  SELECT p.id, p.title, p.description, p.work_type, p.department_id,
    d.name AS department_name, d.contact_label, p.status, p.impact,
    p.start_date, p.end_date, p.actual_end_date, p.earliest_start_date,
    p.latest_end_date, p.source_label, p.is_demo, p.version, p.updated_at,
    (SELECT count(*) FROM reports r WHERE r.project_id = p.id) AS report_count
  FROM projects p JOIN departments d ON d.id = p.department_id
`;

function mapSegment(row: RawSegment): Segment {
  return {
    id: row.id,
    roadName: row.road_name,
    fromLabel: row.from_label,
    toLabel: row.to_label,
    aliases: JSON.parse(row.aliases_json) as string[],
    geometry: JSON.parse(row.geometry_json) as GeoLineString,
    center: { lat: row.center_lat, lng: row.center_lng },
  };
}

function mapProject(row: RawProject, segments: Segment[]): ProjectSummary {
  const department: Department = {
    id: row.department_id,
    name: row.department_name,
    contactLabel: row.contact_label,
  };
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    workType: row.work_type,
    department,
    status: row.status,
    impact: row.impact,
    startDate: row.start_date,
    endDate: row.end_date,
    actualEndDate: row.actual_end_date,
    earliestStartDate: row.earliest_start_date,
    latestEndDate: row.latest_end_date,
    segments,
    sourceLabel: row.source_label,
    isDemo: row.is_demo === 1,
    reportCount: row.report_count,
    version: row.version,
    updatedAt: row.updated_at,
  };
}

function segmentMapForProjects(database: CoreDatabase, projectIds: string[]): Map<string, Segment[]> {
  if (projectIds.length === 0) return new Map();
  const placeholders = projectIds.map(() => "?").join(", ");
  const rows = database.prepare(`
    SELECT ps.project_id, s.id, s.road_name, s.from_label, s.to_label,
      s.aliases_json, s.geometry_json, s.center_lat, s.center_lng
    FROM project_segments ps JOIN segments s ON s.id = ps.segment_id
    WHERE ps.project_id IN (${placeholders})
    ORDER BY s.road_name, s.from_label, s.id
  `).all(...projectIds) as Array<RawSegment & { project_id: string }>;
  const result = new Map<string, Segment[]>();
  for (const row of rows) {
    const { project_id, ...segmentRow } = row;
    const segments = result.get(project_id) ?? [];
    segments.push(mapSegment(segmentRow));
    result.set(project_id, segments);
  }
  return result;
}

export interface ProjectFilters {
  status?: ProjectStatus;
  departmentId?: string;
  q?: string;
}

export function listProjects(database: CoreDatabase, filters: ProjectFilters = {}): ProjectSummary[] {
  const where: string[] = [];
  const values: string[] = [];
  if (filters.status) {
    where.push("p.status = ?");
    values.push(filters.status);
  }
  if (filters.departmentId) {
    where.push("p.department_id = ?");
    values.push(filters.departmentId);
  }
  if (filters.q) {
    where.push(`(p.title LIKE ? OR p.description LIKE ? OR EXISTS (
      SELECT 1 FROM project_segments ps JOIN segments s ON s.id = ps.segment_id
      WHERE ps.project_id = p.id AND (s.road_name LIKE ? OR s.from_label LIKE ? OR s.to_label LIKE ?)
    ))`);
    const query = `%${filters.q}%`;
    values.push(query, query, query, query, query);
  }
  const rows = database.prepare(`${projectSelect}
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY p.start_date ASC, p.id ASC LIMIT 100
  `).all(...values) as RawProject[];
  const segments = segmentMapForProjects(database, rows.map(({ id }) => id));
  return rows.map((row) => mapProject(row, segments.get(row.id) ?? []));
}

export function getProject(database: CoreDatabase, id: string): ProjectDetail {
  const row = database.prepare(`${projectSelect} WHERE p.id = ?`).get(id) as RawProject | undefined;
  if (!row) throw new ApiFailure(404, "NOT_FOUND", "Project not found.");
  const segments = segmentMapForProjects(database, [id]).get(id) ?? [];
  const events = database.prepare(`
    SELECT id, type, summary, reason, previous_start_date, new_start_date,
      previous_end_date, new_end_date, author_label, created_at
    FROM project_events WHERE project_id = ? ORDER BY created_at DESC, rowid DESC
  `).all(id) as Array<{
    id: string; type: EventType; summary: string; reason: string | null;
    previous_start_date: string | null; new_start_date: string | null;
    previous_end_date: string | null; new_end_date: string | null;
    author_label: string; created_at: string;
  }>;

  const mappedEvents: ProjectEvent[] = events.map((event) => ({
    id: event.id,
    type: event.type,
    summary: event.summary,
    reason: event.reason,
    previousStartDate: event.previous_start_date,
    newStartDate: event.new_start_date,
    previousEndDate: event.previous_end_date,
    newEndDate: event.new_end_date,
    authorLabel: event.author_label,
    createdAt: event.created_at,
  }));
  return { ...mapProject(row, segments), events: mappedEvents };
}

export function listDepartments(database: CoreDatabase): Department[] {
  const rows = database.prepare("SELECT id, name, contact_label FROM departments ORDER BY name, id")
    .all() as Array<{ id: string; name: string; contact_label: string | null }>;
  return rows.map((row) => ({ id: row.id, name: row.name, contactLabel: row.contact_label }));
}

export function listSegments(database: CoreDatabase): Segment[] {
  const rows = database.prepare(`
    SELECT id, road_name, from_label, to_label, aliases_json, geometry_json, center_lat, center_lng
    FROM segments ORDER BY road_name, from_label, id
  `).all() as RawSegment[];
  return rows.map(mapSegment);
}
