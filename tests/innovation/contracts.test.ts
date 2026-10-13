import { describe, expect, it } from "vitest";
import type { ScenarioSnapshot } from "@onedig/innovation/contracts";
import { marketRoadSnapshot } from "../../workspaces/innovation/fixtures/marketRoad.js";

describe("innovation package contracts", () => {
  it("loads the illustrative Market Road snapshot through the typed fixture", () => {
    const snapshot: ScenarioSnapshot = marketRoadSnapshot;
    expect(snapshot.focusProjectId).toBe("prj-water");
    expect(snapshot.projects).toHaveLength(2);
  });
});
