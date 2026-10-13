import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NoticeIntakePanel } from "@onedig/innovation/ui";
import type { Department, IntakeResult, Segment } from "@onedig/innovation/contracts";

const departments: Department[] = [{ id: "water", name: "Water Department", contactLabel: null }];
const segments: Segment[] = [{
  id: "seg-market-1", roadName: "Market Road", fromLabel: "Library", toLabel: "Bus Stand", aliases: ["Market Road"],
  geometry: { type: "LineString", coordinates: [[72.8, 19], [72.81, 19.01]] }, center: { lat: 19, lng: 72.8 },
}];
const draft: IntakeResult = {
  mode: "rules",
  draft: { title: "Water main replacement", description: "Replace the water main", workType: "excavation", departmentId: "water", impact: null, startDate: "2026-10-30", endDate: "2026-11-04", segmentIdCandidates: ["seg-market-1"] },
  evidence: [
    { field: "title", quote: "replace water main" }, { field: "startDate", quote: "30 Oct–4 Nov 2026" },
    { field: "segmentIds", quote: "Market Road" },
  ], warnings: ["Impact is not stated; operator input required."],
};
afterEach(cleanup);

describe("NoticeIntakePanel", () => {
  it("keeps unknown impact for operator entry and calls confirm only after review", async () => {
    const onExtract = vi.fn(async () => draft);
    const onConfirm = vi.fn(async (project) => ({ title: project.title } as never));
    render(<NoticeIntakePanel departments={departments} segments={segments} onExtract={onExtract} onConfirm={onConfirm} />);
    fireEvent.change(screen.getByLabelText("Pasted notice text"), { target: { value: "Water Department: replace water main on Market Road, 30 Oct–4 Nov 2026. Lane access will be affected during this public work." } });
    fireEvent.click(screen.getByRole("button", { name: "Extract draft" }));
    await waitFor(() => expect(screen.getByText("rules extraction")).toBeTruthy());
    expect(screen.getByText("30 Oct–4 Nov 2026")).toBeTruthy();
    const confirm = screen.getByRole("button", { name: "Confirm reviewed project" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Impact"), { target: { value: "One lane access affected" } });
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);
    await waitFor(() => expect(onConfirm).toHaveBeenCalledOnce());
    expect(onConfirm.mock.calls[0]?.[0]).toMatchObject({
      title: "Water main replacement", workType: "excavation", departmentId: "water",
      startDate: "2026-10-30", endDate: "2026-11-04", impact: "One lane access affected",
      segmentIds: ["seg-market-1"], earliestStartDate: null, latestEndDate: null, status: "planned",
    });
  });

  it("preserves manually entered fields when extraction or confirmation fails", async () => {
    const onExtract = vi.fn(async () => { throw new Error("offline"); });
    const onConfirm = vi.fn(async () => { throw new Error("offline"); });
    render(<NoticeIntakePanel departments={departments} segments={segments} onExtract={onExtract} onConfirm={onConfirm} />);
    fireEvent.change(screen.getByLabelText("Pasted notice text"), { target: { value: "A synthetic notice containing enough characters to exceed the fifty character minimum for extraction." } });
    fireEvent.change(screen.getByLabelText("Pasted notice text"), { target: { value: "A synthetic notice containing enough characters to exceed the fifty character minimum for extraction." } });
    fireEvent.click(screen.getByRole("button", { name: "Extract draft" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/still here/));
    expect((screen.getByLabelText("Pasted notice text") as HTMLTextAreaElement).value).toContain("synthetic notice");
    // A successful offline result opens the editor; a failed confirmation must retain its values.
    onExtract.mockResolvedValueOnce({ ...draft, draft: { ...draft.draft, impact: "lane access" } });
    fireEvent.click(screen.getByRole("button", { name: "Extract draft" }));
    await waitFor(() => expect(screen.getByText("rules extraction")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Confirm reviewed project" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/draft is still here/));
    expect((screen.getByLabelText("Impact") as HTMLInputElement).value).toBe("lane access");
  });
});
