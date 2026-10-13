import type { ScenarioSnapshot } from "../src/contracts.js";

export const marketRoadSnapshot: ScenarioSnapshot = {
  asOfDate: "2026-10-13",
  focusProjectId: "prj-water",
  projects: [
    {
      id: "prj-road", title: "Market Road resurfacing", version: 1,
      workType: "resurfacing", status: "planned", segmentIds: ["seg-market-1"],
      startDate: "2026-10-22", endDate: "2026-10-27", actualEndDate: null,
      earliestStartDate: null, latestEndDate: null,
    },
    {
      id: "prj-water", title: "Water main replacement", version: 1,
      workType: "excavation", status: "planned", segmentIds: ["seg-market-1"],
      startDate: "2026-10-30", endDate: "2026-11-04", actualEndDate: null,
      earliestStartDate: "2026-10-14", latestEndDate: "2026-11-04",
    },
  ],
  segments: [{ id: "seg-market-1", roadName: "Market Road", fromLabel: "Library", toLabel: "Bus Stand" }],
};

export const marketRoadNotice = "Water Department: replace water main on Market Road, Library to Bus Stand, 30 Oct–4 Nov 2026.";
