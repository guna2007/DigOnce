import { defineConfig } from "@playwright/test";

process.env.DATABASE_PATH ??= "./data/onedig.sqlite";
process.env.DEMO_DAY ??= "2026-10-13";
process.env.OPERATOR_PASSWORD ??= "onedig-test-password";
process.env.OPERATOR_SECRET ??= "onedig-test-session-secret-with-more-than-32-characters";
process.env.OPERATOR_LABEL ??= "OneDig test operator";
process.env.PORT ??= "3419";
process.env.APP_ORIGIN ??= "http://127.0.0.1:4179";

export default defineConfig({
  testDir: "../../tests/integration",
  testMatch: ["coreBrowser.spec.ts", "fullDemo.spec.ts"],
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 12_000 },
  reporter: "list",
  outputDir: "./test-results",
  use: {
    baseURL: "http://127.0.0.1:4179",
    channel: "msedge",
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev:e2e",
    url: "http://127.0.0.1:4179",
    reuseExistingServer: false,
    timeout: 30_000,
    env: {
      DATABASE_PATH: process.env.DATABASE_PATH,
      DEMO_DAY: process.env.DEMO_DAY,
      OPERATOR_PASSWORD: process.env.OPERATOR_PASSWORD,
      OPERATOR_SECRET: process.env.OPERATOR_SECRET,
      OPERATOR_LABEL: process.env.OPERATOR_LABEL,
      APP_ORIGIN: process.env.APP_ORIGIN,
      PORT: process.env.PORT,
      VITE_MAP_TILE_URL: "https://tiles.invalid/{z}/{x}/{y}.png",
    },
  },
});
