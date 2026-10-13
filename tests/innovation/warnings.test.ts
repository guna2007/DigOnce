import { describe, expect, it } from "vitest";
import type { ScenarioProject, ScenarioSnapshot } from "@onedig/innovation/contracts";
import { findWarnings } from "@onedig/innovation/engine";

const resurfacing: ScenarioProject = {
  id: "road", title: "Road resurfacing", version: 1, workType: "resurfacing", status: "planned",
  segmentIds: ["s1"], startDate: "2026-10-22", endDate: "2026-10-27", actualEndDate: null,
  earliestStartDate: null, latestEndDate: null,
};
const excavation: ScenarioProject = {
  id: "water", title: "Water main work", version: 2, workType: "excavation", status: "planned",
  segmentIds: ["s1"], startDate: "2026-10-28", endDate: "2026-11-02", actualEndDate: null,
  earliestStartDate: null, latestEndDate: null,
};
function snapshot(projects: ScenarioProject[]): ScenarioSnapshot {
  return { asOfDate: "2026-10-13", focusProjectId: "water", projects,
    segments: [{ id: "s1", roadName: "Market Road", fromLabel: "Library", toLabel: "Bus Stand" }] };
}

describe("evidence-backed schedule warnings", () => {
  it("uses inclusive overlap and takes precedence over resurfacing proximity", () => {
    const touching = { ...excavation, startDate: "2026-10-27" };
    const [warning] = findWarnings(snapshot([resurfacing, touching]));
    expect(warning?.kind).toBe("date_overlap");
    expect(warning?.evidence).toMatchObject({ overlapStart: "2026-10-27", overlapEnd: "2026-10-27" });
  });

  it.each([{ days: 1 }, { days: 90 }])("includes resurfacing boundary at $days days", ({ days }) => {
    const [warning] = findWarnings(snapshot([resurfacing, { ...excavation, startDate: days === 1 ? "2026-10-28" : "2027-01-25" }]));
    expect(warning?.kind).toBe("recent_resurfacing");
    expect(warning?.evidence.daysAfterResurfacing).toBe(days);
    expect(warning?.explanation).toContain("Market Road");
    expect(warning?.explanation).toContain("2026-10-27");
  });

  it("gives overlap precedence at day zero and ignores day 91, cancelled works, and unrelated segments", () => {
    expect(findWarnings(snapshot([resurfacing, { ...excavation, startDate: "2026-10-27" }]))[0]?.kind).toBe("date_overlap");
    expect(findWarnings(snapshot([resurfacing, { ...excavation, startDate: "2027-01-26" }]))).toHaveLength(0);
    expect(findWarnings(snapshot([resurfacing, { ...excavation, status: "cancelled" }]))).toHaveLength(0);
    expect(findWarnings(snapshot([resurfacing, { ...excavation, segmentIds: ["other"] }]))).toHaveLength(0);
  });

  it("uses actual completion date and produces one stable warning per pair and segment", () => {
    const completed = { ...resurfacing, status: "completed" as const, actualEndDate: "2026-10-29" };
    const laterExcavation = { ...excavation, startDate: "2026-10-30", endDate: "2026-11-04", segmentIds: ["s1", "s1"] };
    const first = findWarnings(snapshot([completed, laterExcavation]));
    const second = findWarnings(snapshot([completed, laterExcavation]));
    expect(first).toHaveLength(1);
    expect(first[0]?.evidence.resurfacingEnd).toBe("2026-10-29");
    expect(first[0]?.id).toBe(second[0]?.id);
  });
});
