import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, test } from "../../workspaces/core-app/node_modules/@playwright/test/index.mjs";

const coreDirectory = resolve(process.cwd());
async function resetDemoDatabase(): Promise<void> {
  execSync("npm run seed:reset", {
    cwd: coreDirectory,
    env: process.env,
    stdio: "pipe",
  });
}

async function runCoreFlow(page: import("@playwright/test").Page, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.route("https://tiles.invalid/**", (route) => route.abort());
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Know what’s happening on your street." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Market Road resurfacing" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Works nearby" })).toBeVisible();
  await expect(page.getByText(/map tiles are unavailable right now/i)).toBeVisible();

  await page.getByRole("button", { name: "Market Road resurfacing" }).click();
  await expect(page.getByRole("heading", { name: "Market Road resurfacing" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Project timeline" })).toBeVisible();
  await page.getByRole("link", { name: "Operator" }).click();
  await page.getByLabel("Password").fill("onedig-test-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Keep the public record current." })).toBeVisible();

  const projectForm = page.locator(".operator-grid > .operator-panel").first().locator("form");
  await projectForm.getByLabel("Project title").fill("Water main replacement");
  await projectForm.getByLabel("Description").fill("Replace the water main on Market Road between the library and bus stand.");
  await projectForm.getByLabel("Department").selectOption("water");
  await projectForm.getByLabel("Start date").fill("2026-10-30");
  await projectForm.getByLabel("End date").fill("2026-11-04");
  await projectForm.getByLabel("Resident impact").fill("Expect temporary lane restrictions and reduced sidewalk access.");
  await projectForm.getByLabel("Earliest start").fill("2026-10-14");
  await projectForm.getByLabel("Latest end").fill("2026-11-04");
  await projectForm.getByRole("button", { name: "Create project" }).click();
  await expect(page.locator(".project-select select")).toContainText("Water main replacement · planned");

  const scheduleForm = page.locator(".schedule-form");
  await scheduleForm.getByLabel("Start date").fill("2026-10-16");
  await scheduleForm.getByLabel("End date").fill("2026-10-21");
  await scheduleForm.getByLabel("Public reason").fill("Finish before the resurfacing crew arrives.");
  await scheduleForm.getByRole("button", { name: "Save schedule" }).click();
  await expect(page.getByText("Schedule saved and visible on the resident record.")).toBeVisible();
  await page.getByRole("button", { name: "Open resident project record" }).click();
  await expect(page.locator(".schedule-dates")).toContainText("October 16, 2026");
  await expect(page.getByText("Finish before the resurfacing crew arrives.")).toBeVisible();

  await page.getByLabel("Concern type").selectOption("access");
  await page.getByLabel("What would you like the project team to know?").fill("The temporary walkway is difficult to use near the bus stop.");
  await page.getByRole("button", { name: "Submit concern" }).click();
  await expect(page.getByRole("heading", { name: "Your concern is on record." })).toBeVisible();
  await expect(page.getByText(/^[A-Za-z0-9_-]{40,}$/)).toBeVisible();

  await page.getByRole("link", { name: "Operator" }).click();
  await expect(page.getByRole("heading", { name: "Concern queue" })).toBeVisible();
  await expect(page.getByText("The temporary walkway is difficult to use near the bus stop.")).toBeVisible();
  await page.getByRole("button", { name: "Mark in review" }).click();
  const reportCard = page.locator(".operator-report-card").filter({ hasText: "The temporary walkway is difficult to use near the bus stop." });
  await reportCard.getByLabel("Response to resident").fill("The crew cleared the walkway and restored access beside the bus stop.");
  await reportCard.getByRole("button", { name: "Resolve and respond" }).click();
  await expect(reportCard.getByText("The crew cleared the walkway and restored access beside the bus stop.")).toBeVisible();

  await page.goBack();
  await expect(page.getByText("resolved", { exact: true })).toBeVisible();
  await expect(page.getByText("The crew cleared the walkway and restored access beside the bus stop.")).toBeVisible();
}

test.describe("standalone core flow with innovation disabled", () => {
  test.beforeEach(async () => resetDemoDatabase());

  test("desktop works when tiles fail, then completes project, update and receipt flows", async ({ page }) => {
    await runCoreFlow(page, 1440, 1000);
  });

  test("mobile keeps the list and completes the same core flow", async ({ page }) => {
    await runCoreFlow(page, 390, 844);
  });
});
