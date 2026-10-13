// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { extractNotice } from "@onedig/innovation/intake";
import type { Department, NoticeInput, Segment } from "@onedig/innovation/contracts";

const departments: Department[] = [{ id: "water", name: "Water Department", contactLabel: null }];
const segments: Segment[] = [{
  id: "seg-market-1", roadName: "Market Road", fromLabel: "Library", toLabel: "Bus Stand",
  aliases: ["Market Road", "Library to Bus Stand"],
  geometry: { type: "LineString", coordinates: [[72.8, 19], [72.81, 19.01]] }, center: { lat: 19, lng: 72.8 },
}];
const rawText = "Water Department: replace water main on Market Road, Library to Bus Stand, 30 Oct–4 Nov 2026. Work may affect one lane.";
const input: NoticeInput = { rawText, departments, segments };
const proposed = {
  title: { value: "Water main replacement", quote: "replace water main" },
  description: { value: "Replace the water main", quote: "replace water main" },
  workType: { value: "excavation", quote: "replace water main" },
  departmentId: { value: "water", quote: "Water Department" },
  startDate: { value: "2026-10-30", quote: "30 Oct–4 Nov 2026" },
  endDate: { value: "2026-11-04", quote: "30 Oct–4 Nov 2026" },
  impact: { value: "one lane", quote: "affect one lane" },
  segments: { value: ["seg-market-1"], quote: "Market Road, Library to Bus Stand" },
};

function response(output: unknown, status = "completed") {
  return { status, output_text: JSON.stringify(output) };
}

afterEach(() => vi.unstubAllGlobals());

describe("extractNotice", () => {
  it("sends only pasted text and minimal catalogs to the mocked Responses API and validates evidence", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => response(proposed) });
    vi.stubGlobal("fetch", fetchMock);
    const result = await extractNotice(input, { apiKey: "test-only-secret", model: "mock-model", timeoutMs: 1000 });

    expect(result.mode).toBe("ai");
    expect(result.draft).toMatchObject({ departmentId: "water", startDate: "2026-10-30", endDate: "2026-11-04", segmentIdCandidates: ["seg-market-1"] });
    expect(result.evidence.every((item) => rawText.includes(item.quote))).toBe(true);
    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/responses");
    expect(request.headers).toMatchObject({ Authorization: "Bearer test-only-secret" });
    const body = JSON.parse(String(request.body)) as { input: string };
    expect(JSON.parse(body.input)).toEqual({
      rawText,
      departments: [{ id: "water", name: "Water Department" }],
      segments: [{ id: "seg-market-1", aliases: ["Market Road", "Library to Bus Stand"] }],
    });
    expect(JSON.stringify(result)).not.toContain("test-only-secret");
  });

  it("rejects fabricated quotes and invalid dates, and nulls unknown departments", async () => {
    const bad = {
      ...proposed,
      title: { value: "Fictional title", quote: "not in the notice" },
      startDate: { value: "2026-02-30", quote: "30 Oct–4 Nov 2026" },
      departmentId: { value: "unknown", quote: "Water Department" },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => response(bad) }));
    const result = await extractNotice(input, { apiKey: "mock-key", timeoutMs: 1000 });
    expect(result.draft.title).toBeNull();
    expect(result.draft.startDate).toBeNull();
    expect(result.draft.departmentId).toBeNull();
    expect(result.warnings.join(" ")).toMatch(/exact source evidence|real date|known department/i);
  });

  it("returns a labelled rules draft when no key is supplied and never makes a request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await extractNotice(input, { timeoutMs: 1000 });
    expect(result.mode).toBe("rules");
    expect(result.draft.segmentIdCandidates).toEqual(["seg-market-1"]);
    expect(result.evidence.every((item) => rawText.includes(item.quote))).toBe(true);
    expect(result.warnings.join(" ")).toMatch(/AI extraction unavailable/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a labelled rules fallback on incomplete provider responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => response(proposed, "incomplete") }));
    const result = await extractNotice(input, { apiKey: "mock-key", timeoutMs: 1000 });
    expect(result.mode).toBe("rules");
    expect(result.warnings.join(" ")).toMatch(/AI extraction unavailable/i);
  });

  it("returns a labelled fallback after timeout or provider failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(Object.assign(new Error("timeout"), { name: "AbortError" })));
    const result = await extractNotice(input, { apiKey: "mock-key", timeoutMs: 1 });
    expect(result.mode).toBe("rules");
    expect(result.warnings.join(" ")).toMatch(/timed out/i);
  });

  it("returns an editable manual draft when no known alias or date is present", async () => {
    const result = await extractNotice({ rawText: "A public notice will be prepared after details are reviewed by the officer.", departments, segments }, { timeoutMs: 1000 });
    expect(result.mode).toBe("manual");
    expect(result.draft.startDate).toBeNull();
    expect(result.draft.segmentIdCandidates).toEqual([]);
  });
});
