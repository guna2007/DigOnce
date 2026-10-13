import type { ScenarioProject, ScenarioSnapshot, ScenarioWarning, WarningKind } from "../contracts.js";
import { daysBetween, maxDate, minDate } from "./date.js";

const MOVABLE_OR_CURRENT = new Set(["planned", "active"]);
const RESURFACING_STATUSES = new Set(["planned", "active", "completed"]);

function warningId(segmentId: string, projectIds: [string, string], kind: WarningKind): string {
  const source = `${segmentId}|${projectIds.slice().sort().join("|")}|${kind}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `warn_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function sharedSegments(a: ScenarioProject, b: ScenarioProject): string[] {
  const right = new Set(b.segmentIds);
  return [...new Set(a.segmentIds.filter((id) => right.has(id)))].sort();
}

function overlapWarning(
  a: ScenarioProject,
  b: ScenarioProject,
  segmentId: string,
  roadName: string,
): ScenarioWarning | null {
  if (!MOVABLE_OR_CURRENT.has(a.status) || !MOVABLE_OR_CURRENT.has(b.status)) return null;
  const overlapStart = maxDate(a.startDate, b.startDate);
  const overlapEnd = minDate(a.endDate, b.endDate);
  if (daysBetween(overlapStart, overlapEnd) < 0) return null;
  const projectIds = [a.id, b.id].sort() as [string, string];
  return {
    id: warningId(segmentId, projectIds, "date_overlap"),
    kind: "date_overlap",
    segmentId,
    projectIds,
    explanation: `${a.title} and ${b.title} overlap on ${roadName} from ${overlapStart} through ${overlapEnd}.`,
    evidence: {
      overlapStart,
      overlapEnd,
      resurfacingEnd: null,
      excavationStart: null,
      daysAfterResurfacing: null,
    },
  };
}

function resurfacingWarning(
  a: ScenarioProject,
  b: ScenarioProject,
  segmentId: string,
  roadName: string,
): ScenarioWarning | null {
  const excavation = a.workType === "excavation" ? a : b.workType === "excavation" ? b : null;
  const resurfacing = a.workType === "resurfacing" ? a : b.workType === "resurfacing" ? b : null;
  if (!excavation || !resurfacing || !MOVABLE_OR_CURRENT.has(excavation.status)) return null;
  if (!RESURFACING_STATUSES.has(resurfacing.status)) return null;
  const resurfacingEnd = resurfacing.status === "completed" ? resurfacing.actualEndDate : resurfacing.endDate;
  if (!resurfacingEnd) return null;
  const daysAfterResurfacing = daysBetween(resurfacingEnd, excavation.startDate);
  if (daysAfterResurfacing < 1 || daysAfterResurfacing > 90) return null;
  const projectIds = [a.id, b.id].sort() as [string, string];
  return {
    id: warningId(segmentId, projectIds, "recent_resurfacing"),
    kind: "recent_resurfacing",
    segmentId,
    projectIds,
    explanation: `${excavation.title} starts ${daysAfterResurfacing} days after resurfacing ends on ${roadName} (${resurfacingEnd}).`,
    evidence: {
      overlapStart: null,
      overlapEnd: null,
      resurfacingEnd,
      excavationStart: excavation.startDate,
      daysAfterResurfacing,
    },
  };
}

export function findWarnings(snapshot: ScenarioSnapshot): ScenarioWarning[] {
  const segmentNames = new Map(snapshot.segments.map((segment) => [segment.id, segment.roadName]));
  const projects = snapshot.projects.filter((project) => project.status !== "cancelled");
  const warnings: ScenarioWarning[] = [];

  for (let i = 0; i < projects.length; i += 1) {
    const a = projects[i]!;
    for (let j = i + 1; j < projects.length; j += 1) {
      const b = projects[j]!;
      for (const segmentId of sharedSegments(a, b)) {
        const roadName = segmentNames.get(segmentId) ?? segmentId;
        const warning = overlapWarning(a, b, segmentId, roadName)
          ?? resurfacingWarning(a, b, segmentId, roadName);
        if (warning) warnings.push(warning);
      }
    }
  }

  return warnings.sort((left, right) => left.segmentId.localeCompare(right.segmentId)
    || left.projectIds.join("|").localeCompare(right.projectIds.join("|"))
    || left.kind.localeCompare(right.kind));
}
