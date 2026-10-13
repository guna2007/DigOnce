import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProjectDetail, ScenarioAnalysis } from "@onedig/innovation/contracts";
import { CoordinationStudio } from "@onedig/innovation/ui";
import { marketRoadSnapshot } from "../../workspaces/innovation/fixtures/marketRoad.js";
import { analyzeScenario } from "@onedig/innovation/engine";

const analysis = analyzeScenario(marketRoadSnapshot);
const savedProject = {} as ProjectDetail;
afterEach(cleanup);

describe("CoordinationStudio", () => {
  it("requires a public reason and renders refreshed data returned by callbacks", async () => {
    const refreshed: ScenarioAnalysis = { ...analysis, status: "no_change_needed", candidate: null, currentWarnings: [], warningsAfter: [] };
    const onApply = vi.fn(async () => savedProject);
    const onRefresh = vi.fn(async () => refreshed);
    render(<CoordinationStudio analysis={analysis} busy={false} onApply={onApply} onRefresh={onRefresh} />);
    expect(screen.getByText("Current schedule")).toBeTruthy();
    expect(screen.getByText("Proposed schedule")).toBeTruthy();
    const applyButton = screen.getByRole("button", { name: "Apply proposed dates" }) as HTMLButtonElement;
    expect(applyButton.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Public reason for the schedule change"), {
      target: { value: "Complete water work before road resurfacing begins." },
    });
    expect(applyButton.disabled).toBe(false);
    fireEvent.click(applyButton);
    await waitFor(() => expect(onApply).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByText("No change needed")).toBeTruthy());
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("does not render apply controls when no candidate exists and reports refresh errors", async () => {
    const noOption: ScenarioAnalysis = { ...analysis, status: "no_safe_option", candidate: null };
    const onRefresh = vi.fn(async () => { throw new Error("offline"); });
    render(<CoordinationStudio analysis={noOption} busy={false} onApply={vi.fn()} onRefresh={onRefresh} />);
    expect(screen.queryByRole("button", { name: "Apply proposed dates" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Refresh analysis" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Could not refresh"));
  });
});
