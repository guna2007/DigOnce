// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { extractNotice } from "@onedig/innovation/intake";
import type { Department, NoticeInput, Segment } from "@onedig/innovation/contracts";

const departments: Department[] = [{ id: "water", name: "Water Department", contactLabel: null }];
const segments: Segment[] = [
  { id: "seg-market-1", roadName: "Market Road", fromLabel: "Library", toLabel: "Bus Stand", aliases: ["Market Road"], geometry: { type: "LineString", coordinates: [[72.8, 19], [72.81, 19.01]] }, center: { lat: 19, lng: 72.8 } },
  { id: "seg-old-market", roadName: "Old Market Road", fromLabel: "Depot", toLabel: "Clinic", aliases: ["Old Market Road"], geometry: { type: "LineString", coordinates: [[72.7, 19], [72.71, 19.01]] }, center: { lat: 19, lng: 72.7 } },
];
const notice = "Water Department: excavate Market Road, Library to Bus Stand, 30 Oct–4 Nov 2026. This is synthetic public notice text.";
const input: NoticeInput = { rawText: notice, departments, segments };
afterEach(() => vi.unstubAllGlobals());

describe("labelled offline fallback", () => {
  it("uses explicit dates, department, work type and aliases with exact source quotes when no key is configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await extractNotice(input, { timeoutMs: 1000 });
    expect(result.mode).toBe("rules");
    expect(result.draft).toMatchObject({ workType: "excavation", departmentId: "water", startDate: "2026-10-30", endDate: "2026-11-04", segmentIdCandidates: ["seg-market-1"] });
    expect(result.evidence.length).toBeGreaterThanOrEqual(5);
    expect(result.evidence.every(({ quote }) => notice.includes(quote))).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps distinct matched segment aliases reviewable with evidence for each candidate", async () => {
    const rawText = "Water Department will excavate Market Road and Old Market Road from 30 Oct–4 Nov 2026 for utility repairs.";
    const result = await extractNotice({ rawText, departments, segments }, { timeoutMs: 1000 });
    expect(result.mode).toBe("rules");
    expect(result.draft.segmentIdCandidates).toEqual(["seg-market-1", "seg-old-market"]);
    const segmentQuotes = result.evidence.filter(({ field }) => field === "segmentIds").map(({ quote }) => quote);
    expect(segmentQuotes).toEqual(["Market Road", "Old Market Road"]);
    expect(segmentQuotes.every((quote) => rawText.includes(quote))).toBe(true);
    expect(result.warnings.join(" ")).toMatch(/ambiguous/i);
  });

  it("uses manual mode when no reliable date, department, work type or alias can be parsed", async () => {
    const result = await extractNotice({ rawText: "A notice will be prepared after details are reviewed by officers and made available later.", departments, segments }, { timeoutMs: 1000 });
    expect(result.mode).toBe("manual");
    expect(result.draft).toEqual({ title: null, description: null, workType: null, departmentId: null, impact: null, startDate: null, endDate: null, segmentIdCandidates: [] });
    expect(result.evidence).toEqual([]);
  });
});
