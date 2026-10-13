import assert from "node:assert/strict";
import test from "node:test";
import { openDatabase } from "../../workspaces/core-app/src/server/db/database";
import { getDemoDay, seedDemoData } from "../../workspaces/core-app/src/server/db/demoData";
import { buildApp } from "../../workspaces/core-app/src/server/app";
import { migrateDatabase } from "../../workspaces/core-app/src/server/db/migrate";

test("public project, detail, segment and department routes return contract DTOs", async () => {
  const database = openDatabase(":memory:");
  migrateDatabase(database);
  seedDemoData(database, "2026-10-13");
  const app = buildApp(database);
  try {
    const list = await app.inject({ method: "GET", url: "/api/v1/projects" });
    assert.equal(list.statusCode, 200);
    const items = list.json().items as Array<Record<string, unknown>>;
    assert.equal(items.length, 1);
    assert.equal(items[0].id, "prj-road");
    assert.equal(items[0].isDemo, true);
    assert.equal(items[0].reportCount, 0);
    assert.ok(Array.isArray(items[0].segments));
    assert.equal("receiptToken" in items[0], false);
    assert.equal("description" in items[0], true);

    const detail = await app.inject({ method: "GET", url: "/api/v1/projects/prj-road" });
    assert.equal(detail.statusCode, 200);
    assert.equal(detail.json().events[0].type, "created");
    assert.equal("receiptToken" in detail.json(), false);
    assert.equal("reportDescription" in detail.json(), false);

    const segments = await app.inject({ method: "GET", url: "/api/v1/segments" });
    assert.equal(segments.statusCode, 200);
    assert.equal(segments.json().items[0].id, "seg-market-1");
    const departments = await app.inject({ method: "GET", url: "/api/v1/departments" });
    assert.equal(departments.statusCode, 200);
    assert.deepEqual(departments.json().items.map((item: { id: string }) => item.id), ["roads", "water"]);
  } finally {
    await app.close();
  }
});

test("public reads validate filters and return the standard 404 envelope", async () => {
  const database = openDatabase(":memory:");
  migrateDatabase(database);
  seedDemoData(database, getDemoDay("2026-10-13"));
  const app = buildApp(database);
  try {
    const malformed = await app.inject({ method: "GET", url: "/api/v1/projects?status=unknown" });
    assert.equal(malformed.statusCode, 400);
    assert.equal(malformed.json().error.code, "VALIDATION_ERROR");
    assert.equal(typeof malformed.json().error.requestId, "string");

    const unknownFilter = await app.inject({ method: "GET", url: "/api/v1/projects?sort=anything" });
    assert.equal(unknownFilter.statusCode, 400);
    assert.equal(unknownFilter.json().error.code, "VALIDATION_ERROR");

    const missing = await app.inject({ method: "GET", url: "/api/v1/projects/not-here" });
    assert.equal(missing.statusCode, 404);
    assert.equal(missing.json().error.code, "NOT_FOUND");
    assert.equal(typeof missing.json().error.requestId, "string");
  } finally {
    await app.close();
  }
});
