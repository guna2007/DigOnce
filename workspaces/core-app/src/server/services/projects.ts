import type { CoreDatabase } from "../db/database";
import type {
  Department,
  CreateProject,
  EventType,
  GeoLineString,
  ProjectDetail,
  ProjectEvent,
  ProjectStatus,
  ProjectSummary,
  PublishUpdate,
  Reschedule,
  Segment,
  WorkType,
} from "../../shared/contracts";
import { ApiFailure } from "../errors";
import { randomUUID } from "node:crypto";

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

export type ProjectChanges = Partial<Omit<CreateProject, "startDate" | "endDate">> & {
  actualEndDate?: string | null;
};

function invalid(field: string, message: string): never {
  throw new ApiFailure(400, "VALIDATION_ERROR", message, { field });
}

function assertDateOnly(value: string, field: string): void {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    invalid(field, `${field} must be a real calendar date in YYYY-MM-DD format.`);
  }
}

function validateReason(reason: string, field = "reason"): void {
  const length = reason.trim().length;
  if (length < 10 || length > 500) invalid(field, `${field} must be between 10 and 500 characters.`);
}

function validateSegments(database: CoreDatabase, segmentIds: string[]): void {
  if (segmentIds.length < 1 || segmentIds.length > 20 || new Set(segmentIds).size !== segmentIds.length) {
    invalid("segmentIds", "Select between 1 and 20 unique road segments.");
  }
  const known = database.prepare(`SELECT id FROM segments WHERE id IN (${segmentIds.map(() => "?").join(", ")})`)
    .all(...segmentIds) as Array<{ id: string }>;
  if (known.length !== segmentIds.length) invalid("segmentIds", "Every selected road segment must exist.");
}

function assertVersion(database: CoreDatabase, projectId: string, version: number): RawProject {
  const row = database.prepare(`${projectSelect} WHERE p.id = ?`).get(projectId) as RawProject | undefined;
  if (!row) throw new ApiFailure(404, "NOT_FOUND", "Project not found.");
  if (row.version !== version) {
    throw new ApiFailure(409, "VERSION_CONFLICT", "The project changed. Refresh before saving.", { projectId });
  }
  return row;
}

function addEvent(
  database: CoreDatabase,
  event: ProjectEvent & { projectId: string },
): void {
  database.prepare(`
    INSERT INTO project_events (
      id, project_id, type, summary, reason, previous_start_date, new_start_date,
      previous_end_date, new_end_date, author_label, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    event.id, event.projectId, event.type, event.summary, event.reason,
    event.previousStartDate, event.newStartDate, event.previousEndDate, event.newEndDate,
    event.authorLabel, event.createdAt,
  );
}

function newId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

export function createProject(database: CoreDatabase, input: CreateProject, authorLabel: string): ProjectDetail {
  const title = input.title.trim();
  const description = input.description.trim();
  const impact = input.impact.trim();
  const sourceLabel = input.sourceLabel.trim();
  if (!title || title.length > 160) invalid("title", "Title is required and must be at most 160 characters.");
  if (!description || description.length > 2000) invalid("description", "Description is required and must be at most 2,000 characters.");
  if (!impact || impact.length > 500) invalid("impact", "Impact is required and must be at most 500 characters.");
  if (!sourceLabel || sourceLabel.length > 160) invalid("sourceLabel", "Source label is required and must be at most 160 characters.");
  if (!["excavation", "resurfacing", "other"].includes(input.workType)) invalid("workType", "Choose a supported work type.");
  if (!["planned", "active"].includes(input.status)) invalid("status", "New projects must be planned or active.");
  assertDateOnly(input.startDate, "startDate");
  assertDateOnly(input.endDate, "endDate");
  if (input.startDate > input.endDate) invalid("endDate", "End date must be on or after the start date.");

  const earliestStartDate = input.earliestStartDate ?? null;
  const latestEndDate = input.latestEndDate ?? null;
  if ((earliestStartDate === null) !== (latestEndDate === null)) {
    invalid("earliestStartDate", "Provide both schedule window bounds or leave both empty.");
  }
  if (earliestStartDate && latestEndDate) {
    assertDateOnly(earliestStartDate, "earliestStartDate");
    assertDateOnly(latestEndDate, "latestEndDate");
    if (input.status !== "planned") invalid("status", "Schedule flexibility can only be set for planned work.");
    if (earliestStartDate > input.startDate || input.endDate > latestEndDate) {
      invalid("earliestStartDate", "The schedule must fall within the declared flexibility window.");
    }
  }
  if (!database.prepare("SELECT 1 FROM departments WHERE id = ?").get(input.departmentId)) {
    invalid("departmentId", "Choose a known department.");
  }
  validateSegments(database, input.segmentIds);

  const id = newId("prj");
  const eventId = newId("evt");
  const now = new Date().toISOString();
  const create = database.transaction(() => {
    database.prepare(`
      INSERT INTO projects (
        id, title, description, work_type, department_id, status, impact,
        start_date, end_date, actual_end_date, earliest_start_date, latest_end_date,
        source_label, is_demo, version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, 0, 1, ?, ?)
    `).run(id, title, description, input.workType, input.departmentId, input.status,
      impact, input.startDate, input.endDate, earliestStartDate, latestEndDate, sourceLabel, now, now);
    const insertMembership = database.prepare("INSERT INTO project_segments (project_id, segment_id) VALUES (?, ?)");
    for (const segmentId of input.segmentIds) insertMembership.run(id, segmentId);
    addEvent(database, {
      id: eventId, projectId: id, type: "created", summary: "Project created.", reason: null,
      previousStartDate: null, newStartDate: input.startDate,
      previousEndDate: null, newEndDate: input.endDate, authorLabel, createdAt: now,
    });
  });
  create.immediate();
  return getProject(database, id);
}

export function editProject(
  database: CoreDatabase,
  id: string,
  version: number,
  reason: string,
  changes: ProjectChanges,
  authorLabel: string,
): ProjectDetail {
  validateReason(reason);
  const now = new Date().toISOString();
  const edit = database.transaction(() => {
    const current = assertVersion(database, id, version);
    const nextStatus = changes.status ?? current.status;
    const actualEndDate = changes.actualEndDate === undefined ? current.actual_end_date : changes.actualEndDate;
    const earliestStartDate = changes.earliestStartDate === undefined ? current.earliest_start_date : changes.earliestStartDate;
    const latestEndDate = changes.latestEndDate === undefined ? current.latest_end_date : changes.latestEndDate;
    const title = changes.title?.trim() ?? current.title;
    const description = changes.description?.trim() ?? current.description;
    const impact = changes.impact?.trim() ?? current.impact;
    const sourceLabel = changes.sourceLabel?.trim() ?? current.source_label;
    const workType = changes.workType ?? current.work_type;
    const departmentId = changes.departmentId ?? current.department_id;
    const segmentIds = changes.segmentIds ?? (segmentMapForProjects(database, [id]).get(id) ?? []).map(({ id: segmentId }) => segmentId);

    if (changes.title !== undefined && (!title || title.length > 160)) invalid("changes.title", "Title is required and must be at most 160 characters.");
    if (changes.description !== undefined && (!description || description.length > 2000)) invalid("changes.description", "Description is required and must be at most 2,000 characters.");
    if (changes.impact !== undefined && (!impact || impact.length > 500)) invalid("changes.impact", "Impact is required and must be at most 500 characters.");
    if (changes.sourceLabel !== undefined && (!sourceLabel || sourceLabel.length > 160)) invalid("changes.sourceLabel", "Source label is required and must be at most 160 characters.");
    if (!["excavation", "resurfacing", "other"].includes(workType)) invalid("changes.workType", "Choose a supported work type.");
    if (!["planned", "active", "paused", "completed", "cancelled"].includes(nextStatus)) invalid("changes.status", "Choose a supported status.");
    if (!database.prepare("SELECT 1 FROM departments WHERE id = ?").get(departmentId)) invalid("changes.departmentId", "Choose a known department.");
    if ((earliestStartDate === null) !== (latestEndDate === null)) invalid("changes.earliestStartDate", "Provide both schedule window bounds or clear both.");
    if (nextStatus !== "planned" && earliestStartDate !== null) invalid("changes.status", "Schedule flexibility can only be retained on planned work.");
    if (earliestStartDate) assertDateOnly(earliestStartDate, "changes.earliestStartDate");
    if (latestEndDate) assertDateOnly(latestEndDate, "changes.latestEndDate");
    if (earliestStartDate && (earliestStartDate > current.start_date || current.end_date > (latestEndDate ?? ""))) {
      invalid("changes.earliestStartDate", "The current schedule must fall within the flexibility window.");
    }
    if (nextStatus === "completed") {
      if (!actualEndDate) invalid("changes.actualEndDate", "Provide an actual end date when completing a project.");
      assertDateOnly(actualEndDate, "changes.actualEndDate");
    }
    if (actualEndDate && nextStatus !== "completed") invalid("changes.actualEndDate", "An actual end date is only valid for a completed project.");
    if (changes.segmentIds) validateSegments(database, segmentIds);

    database.prepare(`
      UPDATE projects SET title = ?, description = ?, work_type = ?, department_id = ?,
        status = ?, impact = ?, actual_end_date = ?, earliest_start_date = ?, latest_end_date = ?,
        source_label = ?, version = version + 1, updated_at = ? WHERE id = ? AND version = ?
    `).run(title, description, workType, departmentId, nextStatus, impact, actualEndDate,
      earliestStartDate, latestEndDate, sourceLabel, now, id, version);
    if (changes.segmentIds) {
      database.prepare("DELETE FROM project_segments WHERE project_id = ?").run(id);
      const insertMembership = database.prepare("INSERT INTO project_segments (project_id, segment_id) VALUES (?, ?)");
      for (const segmentId of segmentIds) insertMembership.run(id, segmentId);
    }
    addEvent(database, {
      id: newId("evt"), projectId: id, type: nextStatus === "completed" ? "completed" : "edit",
      summary: nextStatus === "completed" ? "Project marked complete." : "Project details updated.",
      reason, previousStartDate: current.start_date, newStartDate: current.start_date,
      previousEndDate: current.end_date, newEndDate: current.end_date, authorLabel, createdAt: now,
    });
  });
  edit.immediate();
  return getProject(database, id);
}

export function rescheduleProject(
  database: CoreDatabase,
  id: string,
  input: Reschedule,
  authorLabel: string,
): ProjectDetail {
  validateReason(input.reason);
  assertDateOnly(input.startDate, "startDate");
  assertDateOnly(input.endDate, "endDate");
  if (input.startDate > input.endDate) invalid("endDate", "End date must be on or after the start date.");
  const peerEntries = Object.entries(input.expectedPeerVersions ?? {});
  if (peerEntries.some(([, peerVersion]) => !Number.isInteger(peerVersion) || peerVersion < 1)) {
    invalid("expectedPeerVersions", "Peer versions must be positive integers.");
  }
  const now = new Date().toISOString();
  const save = database.transaction(() => {
    for (const [peerId, peerVersion] of peerEntries) {
      const peer = database.prepare("SELECT version FROM projects WHERE id = ?").get(peerId) as { version: number } | undefined;
      if (!peer || peer.version !== peerVersion) {
        throw new ApiFailure(409, "VERSION_CONFLICT", "The street schedule changed. Refresh before applying.", { projectId: peerId });
      }
    }
    const current = assertVersion(database, id, input.version);
    if (current.status !== "planned") invalid("status", "Only planned projects can be rescheduled.");
    if (current.earliest_start_date && input.startDate < current.earliest_start_date) invalid("startDate", "Start date is earlier than the approved schedule window.");
    if (current.latest_end_date && input.endDate > current.latest_end_date) invalid("endDate", "End date is later than the approved schedule window.");

    database.prepare(`UPDATE projects SET start_date = ?, end_date = ?, version = version + 1,
      updated_at = ? WHERE id = ? AND version = ?`).run(input.startDate, input.endDate, now, id, input.version);
    addEvent(database, {
      id: newId("evt"), projectId: id, type: "reschedule",
      summary: `Schedule changed to ${input.startDate} through ${input.endDate}.`, reason: input.reason,
      previousStartDate: current.start_date, newStartDate: input.startDate,
      previousEndDate: current.end_date, newEndDate: input.endDate, authorLabel, createdAt: now,
    });
  });
  save.immediate();
  return getProject(database, id);
}

export function publishProjectUpdate(
  database: CoreDatabase,
  id: string,
  input: PublishUpdate,
  authorLabel: string,
): ProjectEvent {
  const summary = input.summary.trim();
  if (summary.length < 5 || summary.length > 240) invalid("summary", "Summary must be between 5 and 240 characters.");
  if (input.type === "delay") {
    if (!input.reason) invalid("reason", "A reason is required for a delay update.");
    validateReason(input.reason);
    if (!input.revisedEndDate) invalid("revisedEndDate", "A revised end date is required for a delay update.");
    assertDateOnly(input.revisedEndDate, "revisedEndDate");
  } else {
    if (input.reason !== undefined) validateReason(input.reason);
    if (input.revisedEndDate !== undefined) invalid("revisedEndDate", "Only a delay update can change the end date.");
  }
  const now = new Date().toISOString();
  const eventId = newId("evt");
  const update = database.transaction(() => {
    const current = assertVersion(database, id, input.version);
    if (input.type === "delay") {
      const revisedEndDate = input.revisedEndDate as string;
      if (revisedEndDate <= current.end_date) invalid("revisedEndDate", "A delay date must be later than the current end date.");
      if (current.latest_end_date && revisedEndDate > current.latest_end_date) invalid("revisedEndDate", "The revised date is outside the approved schedule window.");
      database.prepare("UPDATE projects SET end_date = ?, version = version + 1, updated_at = ? WHERE id = ? AND version = ?")
        .run(revisedEndDate, now, id, input.version);
    } else {
      database.prepare("UPDATE projects SET version = version + 1, updated_at = ? WHERE id = ? AND version = ?")
        .run(now, id, input.version);
    }
    addEvent(database, {
      id: eventId, projectId: id, type: input.type, summary,
      reason: input.reason ?? null,
      previousStartDate: current.start_date, newStartDate: current.start_date,
      previousEndDate: current.end_date,
      newEndDate: input.type === "delay" ? input.revisedEndDate as string : current.end_date,
      authorLabel, createdAt: now,
    });
  });
  update.immediate();
  const event = database.prepare(`
    SELECT id, type, summary, reason, previous_start_date, new_start_date,
      previous_end_date, new_end_date, author_label, created_at
    FROM project_events WHERE id = ?
  `).get(eventId) as {
    id: string; type: EventType; summary: string; reason: string | null;
    previous_start_date: string | null; new_start_date: string | null;
    previous_end_date: string | null; new_end_date: string | null;
    author_label: string; created_at: string;
  };
  return {
    id: event.id, type: event.type, summary: event.summary, reason: event.reason,
    previousStartDate: event.previous_start_date, newStartDate: event.new_start_date,
    previousEndDate: event.previous_end_date, newEndDate: event.new_end_date,
    authorLabel: event.author_label, createdAt: event.created_at,
  };
}
