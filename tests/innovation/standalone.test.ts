// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Department, Segment, ScenarioSnapshot } from "@onedig/innovation/contracts";
import { analyzeScenario } from "@onedig/innovation/engine";
import { extractNotice } from "@onedig/innovation/intake";
import { CoordinationStudio, NoticeIntakePanel } from "@onedig/innovation/ui";
import { marketRoadNotice, marketRoadSnapshot } from "../../workspaces/innovation/fixtures/marketRoad.js";

const departments: Department[] = [{ id: "water", name: "Water Department", contactLabel: "not sent" }];
const segments: Segment[] = [{
  id: "seg-market-1", roadName: "Market Road", fromLabel: "Library", toLabel: "Bus Stand",
  aliases: ["Market Road", "Library to Bus Stand"],
  geometry: { type: "LineString", coordinates: [[72.8, 19], [72.81, 19.01]] }, center: { lat: 19, lng: 72.8 },
}];

afterEach(() => vi.unstubAllGlobals());

describe("innovation standalone gate", () => {
  it("resolves all package subpath exports independently", () => {
    expect(typeof analyzeScenario).toBe("function");
    expect(typeof extractNotice).toBe("function");
    expect(typeof CoordinationStudio).toBe("function");
    expect(typeof NoticeIntakePanel).toBe("function");
    expect(marketRoadNotice).toContain("Market Road");
  });

  it("extracts the fresh fixture notice through labelled rules and computes the warning and safe version-checked candidate", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await extractNotice({ rawText: marketRoadNotice, departments, segments }, { timeoutMs: 1000 });
    expect(result.mode).toBe("rules");
    expect(result.evidence.every(({ quote }) => marketRoadNotice.includes(quote))).toBe(true);
    expect(result.draft).toMatchObject({ departmentId: "water", startDate: "2026-10-30", endDate: "2026-11-04", segmentIdCandidates: ["seg-market-1"] });
    expect(fetchMock).not.toHaveBeenCalled();

    const analysis = analyzeScenario(marketRoadSnapshot);
    expect(analysis.status).toBe("recommendation_available");
    expect(analysis.currentWarnings).toHaveLength(1);
    expect(analysis.candidate).toMatchObject({ startDate: "2026-10-16", endDate: "2026-10-21", warningCountAfter: 0, expectedPeerVersions: { "prj-road": 1 } });
    expect(analysis.warningsAfter).toEqual([]);
  });

  it("changes computed evidence when fixture dates change and refuses an impossible window", () => {
    const changed: ScenarioSnapshot = {
      ...marketRoadSnapshot,
      projects: marketRoadSnapshot.projects.map((project) => project.id === "prj-water"
        ? { ...project, startDate: "2026-11-05", endDate: "2026-11-10", latestEndDate: "2026-11-10" }
        : project),
    };
    const changedAnalysis = analyzeScenario(changed);
    expect(changedAnalysis.currentWarnings[0]?.evidence.excavationStart).toBe("2026-11-05");
    expect(changedAnalysis.currentWarnings[0]?.explanation).not.toBe(analyzeScenario(marketRoadSnapshot).currentWarnings[0]?.explanation);

    const impossible: ScenarioSnapshot = {
      ...marketRoadSnapshot,
      projects: marketRoadSnapshot.projects.map((project) => project.id === "prj-water"
        ? { ...project, earliestStartDate: "2026-11-01", latestEndDate: "2026-10-31" }
        : project),
    };
    const impossibleAnalysis = analyzeScenario(impossible);
    expect(impossibleAnalysis.status).toBe("no_safe_option");
    expect(impossibleAnalysis.candidate).toBeNull();
    expect(impossibleAnalysis.warningsAfter).toEqual([]);
  });

  it("keeps unsupported text in manual mode", async () => {
    const result = await extractNotice({
      rawText: "A public notice will be prepared after details are reviewed by the officer and published later.", departments, segments,
    }, { timeoutMs: 1000 });
    expect(result.mode).toBe("manual");
    expect(result.draft.startDate).toBeNull();
    expect(result.draft.departmentId).toBeNull();
    expect(result.draft.segmentIdCandidates).toEqual([]);
  });
});
