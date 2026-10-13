import type { ScenarioAnalysis, ScenarioCandidate, ScenarioProject, ScenarioSnapshot } from "../contracts.js";
import { addDays, daysBetween, dateToEpochDay, maxDate } from "./date.js";
import { findWarnings } from "./warnings.js";

const LIMITATIONS = ["Advisory schedule only; contractor and utility feasibility require officer review."];

function emptyResult(
  snapshot: ScenarioSnapshot,
  focus: ScenarioProject,
  status: ScenarioAnalysis["status"],
  currentWarnings: ScenarioAnalysis["currentWarnings"],
  evaluatedStarts: number,
  extraLimitation?: string,
): ScenarioAnalysis {
  return {
    basis: "computed",
    asOfDate: snapshot.asOfDate,
    focusProjectId: focus.id,
    focusVersion: focus.version,
    status,
    currentWarnings,
    candidate: null,
    warningsAfter: [],
    evaluatedStarts,
    limitations: extraLimitation ? [...LIMITATIONS, extraLimitation] : [...LIMITATIONS],
  };
}

function focusWarnings(snapshot: ScenarioSnapshot): ScenarioAnalysis["currentWarnings"] {
  return findWarnings(snapshot).filter((warning) => warning.projectIds.includes(snapshot.focusProjectId));
}

function versionPreconditions(snapshot: ScenarioSnapshot, focus: ScenarioProject): Record<string, number> {
  const segmentIds = new Set(focus.segmentIds);
  return Object.fromEntries(snapshot.projects
    .filter((project) => project.id !== focus.id && project.segmentIds.some((id) => segmentIds.has(id)))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((project) => [project.id, project.version]));
}

function candidateSnapshot(snapshot: ScenarioSnapshot, focus: ScenarioProject, startDate: string, endDate: string): ScenarioSnapshot {
  return {
    ...snapshot,
    projects: snapshot.projects.map((project) => project.id === focus.id
      ? { ...project, startDate, endDate }
      : project),
  };
}

export function analyzeScenario(snapshot: ScenarioSnapshot): ScenarioAnalysis {
  const focus = snapshot.projects.find((project) => project.id === snapshot.focusProjectId);
  if (!focus) throw new Error(`Focus project ${snapshot.focusProjectId} is missing from the scenario snapshot`);

  const currentWarnings = focusWarnings(snapshot);
  if (currentWarnings.length === 0) return emptyResult(snapshot, focus, "no_change_needed", [], 0);
  if (focus.status !== "planned") {
    return emptyResult(snapshot, focus, "no_safe_option", currentWarnings, 0,
      "The focus work is not planned, so this analysis cannot propose a move.");
  }

  const { earliestStartDate, latestEndDate } = focus;
  if (!earliestStartDate || !latestEndDate) {
    return emptyResult(snapshot, focus, "no_safe_option", currentWarnings, 0,
      "An officer-supplied earliest start and latest end are required to evaluate alternatives.");
  }

  const duration = daysBetween(focus.startDate, focus.endDate) + 1;
  if (duration < 1 || dateToEpochDay(earliestStartDate) > dateToEpochDay(focus.startDate)
      || dateToEpochDay(focus.startDate) > dateToEpochDay(focus.endDate)
      || dateToEpochDay(focus.endDate) > dateToEpochDay(latestEndDate)) {
    return emptyResult(snapshot, focus, "no_safe_option", currentWarnings, 0,
      "The project dates do not fit the supplied flexibility window.");
  }

  const firstStart = maxDate(snapshot.asOfDate, earliestStartDate);
  const finalStart = addDays(latestEndDate, -duration + 1);
  const startCount = daysBetween(firstStart, finalStart) + 1;
  if (startCount <= 0) {
    return emptyResult(snapshot, focus, "no_safe_option", currentWarnings, 0,
      "No future start date can preserve the scheduled duration inside the supplied window.");
  }
  if (startCount > 31) {
    return emptyResult(snapshot, focus, "window_required", currentWarnings, 0,
      "The allowable window contains more than 31 possible start dates; narrow it before analysis.");
  }

  const alternatives: ScenarioCandidate[] = [];
  const peerVersions = versionPreconditions(snapshot, focus);
  for (let offset = 0; offset < startCount; offset += 1) {
    const startDate = addDays(firstStart, offset);
    const endDate = addDays(startDate, duration - 1);
    const warningsAfter = focusWarnings(candidateSnapshot(snapshot, focus, startDate, endDate));
    if (warningsAfter.length !== 0) continue;
    const daysShifted = daysBetween(focus.startDate, startDate);
    alternatives.push({
      id: `cand_${startDate.replaceAll("-", "")}`,
      startDate,
      endDate,
      daysShifted,
      warningCountBefore: currentWarnings.length,
      warningCountAfter: 0,
      resolvedWarningIds: currentWarnings.map((warning) => warning.id),
      expectedPeerVersions: peerVersions,
      rationale: `Move the work to ${startDate}–${endDate}; this removes all ${currentWarnings.length} schedule warning${currentWarnings.length === 1 ? "" : "s"} on its shared segments.`,
    });
  }

  alternatives.sort((a, b) => Math.abs(a.daysShifted) - Math.abs(b.daysShifted)
    || a.startDate.localeCompare(b.startDate));
  const candidate = alternatives[0];
  if (!candidate) {
    return emptyResult(snapshot, focus, "no_safe_option", currentWarnings, startCount,
      "No allowed start date removes every warning involving the focus project.");
  }

  return {
    basis: "computed",
    asOfDate: snapshot.asOfDate,
    focusProjectId: focus.id,
    focusVersion: focus.version,
    status: "recommendation_available",
    currentWarnings,
    candidate,
    warningsAfter: [],
    evaluatedStarts: startCount,
    limitations: [...LIMITATIONS],
  };
}
