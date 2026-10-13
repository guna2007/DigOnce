import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, test } from "../../workspaces/core-app/node_modules/@playwright/test/index.mjs";

const coreDirectory = resolve(process.cwd());
const notice = "Water Department notice: excavating Market Road from 2026-10-30 to 2026-11-04 to replace the main. Temporary access restrictions are expected for nearby shops.";

function resetDemoDatabase(): void {
  execSync("npm run seed:reset", { cwd: coreDirectory, env: process.env, stdio: "pipe" });
}

async function runIntegratedDemo(page: import("@playwright/test").Page, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.route("https://tiles.invalid/**", (route) => route.abort());
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Market Road resurfacing" })).toBeVisible();

  await page.getByRole("link", { name: "Operator" }).click();
  await page.getByLabel("Password").fill("onedig-test-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("button", { name: "Open notice intake" })).toBeVisible();
  await page.getByRole("button", { name: "Open notice intake" }).click();

  await expect(page.getByRole("heading", { name: "Review a notice draft" })).toBeVisible();
  await page.getByLabel("Pasted notice text").fill(notice);
  await page.getByRole("button", { name: "Extract draft" }).click();
  await expect(page.getByText("rules extraction")).toBeVisible();
  await expect(page.getByText("Source evidence").first()).toBeVisible();
  await page.getByLabel("Title").fill("Market Road water main replacement");
  await page.getByLabel("Description").fill("Replace the water main on Market Road before the resurfaced street is reopened.");
  await page.getByLabel("Impact").fill("Temporary access restrictions for nearby shops and the bus stop.");
  await page.getByLabel("Earliest start").fill("2026-10-14");
  await page.getByLabel("Latest end").fill("2026-11-04");
  await page.getByRole("button", { name: "Confirm reviewed project" }).click();
  await expect(page.getByText("Project persisted to the shared record.")).toBeVisible();

  await page.getByRole("button", { name: "Analyze this project" }).click();
  await expect(page.getByRole("heading", { name: "Dig Once Studio" })).toBeVisible();
  await expect(page.getByText("Recent resurfacing", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Current schedule" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Proposed schedule" })).toBeVisible();
  await expect(page.getByText("2026-10-16 – 2026-10-21")).toBeVisible();
  await page.getByLabel("Public reason for the schedule change").fill("Complete the water work before resurfacing begins.");
  await page.getByRole("button", { name: "Apply proposed dates" }).click();
  await expect(page.getByText("Schedule update saved. Analysis refreshed from the returned schedule.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "No change needed" })).toBeVisible();

  await page.getByRole("button", { name: "Open resident record" }).click();
  await expect(page.locator(".schedule-dates")).toContainText("October 16, 2026");
  await expect(page.getByText("Complete the water work before resurfacing begins.")).toBeVisible();
  await page.getByLabel("Concern type").selectOption("access");
  await page.getByLabel("What would you like the project team to know?").fill("The temporary walkway needs a clear route beside the bus stop.");
  await page.getByRole("button", { name: "Submit concern" }).click();
  await expect(page.getByRole("heading", { name: "Your concern is on record." })).toBeVisible();

  await page.getByRole("link", { name: "Operator" }).click();
  await expect(page.getByText("The temporary walkway needs a clear route beside the bus stop.")).toBeVisible();
  const report = page.locator(".operator-report-card").filter({ hasText: "The temporary walkway needs a clear route beside the bus stop." });
  await report.getByRole("button", { name: "Mark in review" }).click();
  await report.getByLabel("Response to resident").fill("The crew marked a clear accessible walkway beside the bus stop.");
  await report.getByRole("button", { name: "Resolve and respond" }).click();
  await expect(report.getByText("The crew marked a clear accessible walkway beside the bus stop.")).toBeVisible();
  await page.goBack();
  await expect(page.getByText("resolved", { exact: true })).toBeVisible();
  await expect(page.getByText("The crew marked a clear accessible walkway beside the bus stop.")).toBeVisible();
}

test.describe("integrated notice-to-public-record demo", () => {
  test.beforeEach(() => resetDemoDatabase());

  test("desktop completes the computed coordination and resident receipt story", async ({ page }) => {
    await runIntegratedDemo(page, 1440, 1000);
  });

  test("mobile completes the same persisted workflow", async ({ page }) => {
    await runIntegratedDemo(page, 390, 844);
  });
});
