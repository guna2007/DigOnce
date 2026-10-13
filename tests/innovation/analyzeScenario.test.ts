import { describe, expect, it } from "vitest";
import { analyzeScenario } from "@onedig/innovation/engine";
import { marketRoadSnapshot } from "../../workspaces/innovation/fixtures/marketRoad.js";

describe("feasible schedule analysis", () => {
  it("recommends the nearest zero-warning start while preserving inclusive duration", () => {
    const result = analyzeScenario(marketRoadSnapshot);
    expect(result.status).toBe("recommendation_available");
    expect(result.currentWarnings).toHaveLength(1);
    expect(result.candidate).toMatchObject({
      startDate: "2026-10-16", endDate: "2026-10-21", daysShifted: -14,
      warningCountBefore: 1, warningCountAfter: 0,
      expectedPeerVersions: { "prj-road": 1 },
    });
    expect(result.warningsAfter).toEqual([]);
    expect(result.evaluatedStarts).toBe(17);
  });

  it("recomputes from changed fixture dates and reports no change when clear", () => {
    const changed = {
      ...marketRoadSnapshot,
      projects: marketRoadSnapshot.projects.map((project) => project.id === "prj-water"
        ? { ...project, startDate: "2026-10-14", endDate: "2026-10-19" }
        : project),
    };
    expect(analyzeScenario(changed).currentWarnings).toHaveLength(0);
    expect(analyzeScenario(changed).status).toBe("no_change_needed");
  });

  it("requests a narrower window above 31 starts", () => {
    const wide = {
      ...marketRoadSnapshot,
      projects: marketRoadSnapshot.projects.map((project) => project.id === "prj-water"
        ? { ...project, earliestStartDate: "2026-10-14", latestEndDate: "2026-12-30" }
        : project),
    };
    const result = analyzeScenario(wide);
    expect(result.status).toBe("window_required");
    expect(result.candidate).toBeNull();
    expect(result.evaluatedStarts).toBe(0);
  });

  it.each([
    ["no window", { earliestStartDate: null, latestEndDate: null }],
    ["past-only window", { earliestStartDate: "2026-10-01", latestEndDate: "2026-10-05" }],
  ])("does not invent a recommendation for a %s", (_label, bounds) => {
    const snapshot = {
      ...marketRoadSnapshot,
      projects: marketRoadSnapshot.projects.map((project) => project.id === "prj-water"
        ? { ...project, ...bounds }
        : project),
    };
    expect(analyzeScenario(snapshot).candidate).toBeNull();
  });

  it("does not move an active focus project", () => {
    const active = {
      ...marketRoadSnapshot,
      projects: marketRoadSnapshot.projects.map((project) => project.id === "prj-water"
        ? { ...project, status: "active" as const }
        : project),
    };
    expect(analyzeScenario(active).status).toBe("no_safe_option");
    expect(analyzeScenario(active).candidate).toBeNull();
  });

  it("includes all same-segment peer versions in apply preconditions", () => {
    const multiPeer = {
      ...marketRoadSnapshot,
      projects: [...marketRoadSnapshot.projects, {
        ...marketRoadSnapshot.projects[0]!, id: "prj-other", title: "Other utility",
        workType: "other" as const, version: 8, startDate: "2026-10-10", endDate: "2026-10-12",
      }],
    };
    const result = analyzeScenario(multiPeer);
    expect(result.candidate?.expectedPeerVersions).toEqual({ "prj-other": 8, "prj-road": 1 });
  });
});
