import { analyzeScenario } from "@onedig/innovation/engine";
import { extractNotice } from "@onedig/innovation/intake";
import type { IntakeResult, ScenarioAnalysis, ScenarioProject, ScenarioSnapshot } from "@onedig/innovation/contracts";
import type { CoreDatabase } from "../db/database";
import { getProject, listDepartments, listProjects, listSegments } from "../services/projects";

function demoLocalDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function buildScenarioSnapshot(
  database: CoreDatabase,
  focusProjectId: string,
  asOfDate = demoLocalDate(),
): ScenarioSnapshot {
  const focus = getProject(database, focusProjectId);
  const focusSegmentIds = new Set(focus.segments.map(({ id }) => id));
  const peers = listProjects(database).filter((project) =>
    project.id === focus.id || project.segments.some(({ id }) => focusSegmentIds.has(id)),
  );
  const projects: ScenarioProject[] = peers.map((project) => ({
    id: project.id,
    title: project.title,
    version: project.version,
    workType: project.workType,
    status: project.status,
    segmentIds: project.segments.map(({ id }) => id),
    startDate: project.startDate,
    endDate: project.endDate,
    actualEndDate: project.actualEndDate,
    earliestStartDate: project.earliestStartDate,
    latestEndDate: project.latestEndDate,
  }));
  const segments = listSegments(database)
    .filter(({ id }) => focusSegmentIds.has(id))
    .map(({ id, roadName, fromLabel, toLabel }) => ({ id, roadName, fromLabel, toLabel }));
  return { asOfDate, focusProjectId, projects, segments };
}

export function analyzeCoreScenario(database: CoreDatabase, focusProjectId: string): ScenarioAnalysis {
  return analyzeScenario(buildScenarioSnapshot(database, focusProjectId));
}

export function extractCoreNotice(database: CoreDatabase, rawText: string): Promise<IntakeResult> {
  const configuredTimeout = Number(process.env.OPENAI_TIMEOUT_MS ?? "8000");
  const timeoutMs = Number.isInteger(configuredTimeout) && configuredTimeout >= 1 && configuredTimeout <= 120_000
    ? configuredTimeout
    : 8000;
  return extractNotice({ rawText, departments: listDepartments(database), segments: listSegments(database) }, {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL,
    timeoutMs,
  });
}
