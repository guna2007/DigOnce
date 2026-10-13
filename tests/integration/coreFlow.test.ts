import assert from "node:assert/strict";
import test from "node:test";
import { openDatabase } from "../../workspaces/core-app/src/server/db/database";
import { seedDemoData } from "../../workspaces/core-app/src/server/db/demoData";
import { buildApp } from "../../workspaces/core-app/src/server/app";
import { migrateDatabase } from "../../workspaces/core-app/src/server/db/migrate";

test("disabled innovation adapters return authenticated 503 envelopes", async () => {
  process.env.OPERATOR_PASSWORD = "demo-only-password";
  process.env.OPERATOR_SECRET = "test-secret-that-is-at-least-32-characters-long";
  process.env.OPERATOR_LABEL = "Integration operator";
  delete process.env.APP_ORIGIN;
  const database = openDatabase(":memory:");
  migrateDatabase(database);
  seedDemoData(database, "2026-10-13");
  const app = buildApp(database);
  const origin = { origin: "http://localhost:5173" };
  try {
    const anonymous = await app.inject({
      method: "POST", url: "/api/v1/operator/coordination/analyze", headers: origin,
      payload: { focusProjectId: "prj-road" },
    });
    assert.equal(anonymous.statusCode, 401);
    assert.equal(anonymous.json().error.code, "UNAUTHENTICATED");

    const login = await app.inject({ method: "POST", url: "/api/v1/operator/session", headers: origin, payload: { password: "demo-only-password" } });
    const cookie = (login.headers["set-cookie"] as string).split(";")[0];
    const headers = { ...origin, cookie };
    for (const [url, payload] of [
      ["/api/v1/operator/coordination/analyze", { focusProjectId: "prj-road" }],
      ["/api/v1/operator/intake/extract", { rawText: "A fictional notice with enough text for the placeholder intake route validation." }],
    ] as const) {
      const response = await app.inject({ method: "POST", url, headers, payload });
      assert.equal(response.statusCode, 503);
      assert.equal(response.json().error.code, "INNOVATION_UNAVAILABLE");
      assert.equal(typeof response.json().error.requestId, "string");
    }
  } finally {
    await app.close();
    delete process.env.OPERATOR_PASSWORD;
    delete process.env.OPERATOR_SECRET;
    delete process.env.OPERATOR_LABEL;
  }
});
