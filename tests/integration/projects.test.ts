import assert from "node:assert/strict";
import test from "node:test";
import { openDatabase } from "../../workspaces/core-app/src/server/db/database";
import { seedDemoData } from "../../workspaces/core-app/src/server/db/demoData";
import { buildApp } from "../../workspaces/core-app/src/server/app";
import { migrateDatabase } from "../../workspaces/core-app/src/server/db/migrate";

const ORIGIN = "http://localhost:5173";

test("operator project creation, edits, reschedules and updates are atomic and public", async () => {
  process.env.OPERATOR_PASSWORD = "demo-only-password";
  process.env.OPERATOR_SECRET = "test-secret-that-is-at-least-32-characters-long";
  process.env.OPERATOR_LABEL = "Project officer";
  delete process.env.APP_ORIGIN;
  const database = openDatabase(":memory:");
  migrateDatabase(database);
  seedDemoData(database, "2026-10-13");
  const app = buildApp(database);
  try {
    const origin = { origin: ORIGIN };
    const anonymous = await app.inject({
      method: "POST", url: "/api/v1/operator/projects", headers: origin,
      payload: {
        title: "No access", description: "A complete request without a session.", workType: "other",
        departmentId: "water", impact: "Residents may notice this work.", status: "planned",
        startDate: "2026-10-30", endDate: "2026-10-30", segmentIds: ["seg-market-1"], sourceLabel: "Manual",
      },
    });
    assert.equal(anonymous.statusCode, 401);
    assert.equal(anonymous.json().error.code, "UNAUTHENTICATED");

    const login = await app.inject({ method: "POST", url: "/api/v1/operator/session", headers: origin, payload: { password: "demo-only-password" } });
    const cookie = (login.headers["set-cookie"] as string).split(";")[0];
    const operatorHeaders = { ...origin, cookie };

    const invalidWindow = await app.inject({
      method: "POST", url: "/api/v1/operator/projects", headers: operatorHeaders,
      payload: {
        title: "Water main replacement", description: "Replace the water main.", workType: "excavation",
        departmentId: "water", impact: "Expect limited access.", status: "planned",
        startDate: "2026-10-30", endDate: "2026-11-04", earliestStartDate: "2026-10-14",
        segmentIds: ["seg-market-1"], sourceLabel: "Illustrative synthetic notice",
      },
    });
    assert.equal(invalidWindow.statusCode, 400);
    assert.equal(invalidWindow.json().error.code, "VALIDATION_ERROR");

    const created = await app.inject({
      method: "POST", url: "/api/v1/operator/projects", headers: operatorHeaders,
      payload: {
        title: "Water main replacement", description: "Replace the water main on Market Road.", workType: "excavation",
        departmentId: "water", impact: "Expect temporary access restrictions.", status: "planned",
        startDate: "2026-10-30", endDate: "2026-11-04", earliestStartDate: "2026-10-14",
        latestEndDate: "2026-11-04", segmentIds: ["seg-market-1"], sourceLabel: "Illustrative synthetic notice",
      },
    });
    assert.equal(created.statusCode, 201);
    const initialProject = created.json();
    assert.equal(initialProject.isDemo, false);
    assert.equal(initialProject.version, 1);
    assert.equal(initialProject.events[0].type, "created");
    const projectId = initialProject.id as string;
    const publicRead = await app.inject({ method: "GET", url: `/api/v1/projects/${projectId}` });
    assert.equal(publicRead.statusCode, 200);
    assert.equal(publicRead.json().title, "Water main replacement");

    const staleFocus = await app.inject({
      method: "PATCH", url: `/api/v1/operator/projects/${projectId}`, headers: operatorHeaders,
      payload: { version: 99, reason: "Correcting the project details.", changes: { title: "Stale edit" } },
    });
    assert.equal(staleFocus.statusCode, 409);
    assert.equal(staleFocus.json().error.code, "VERSION_CONFLICT");

    const edit = await app.inject({
      method: "PATCH", url: `/api/v1/operator/projects/${projectId}`, headers: operatorHeaders,
      payload: { version: 1, reason: "Clarify the notice wording for residents.", changes: { title: "Market Road water main replacement" } },
    });
    assert.equal(edit.statusCode, 200);
    assert.equal(edit.json().version, 2);
    assert.equal(edit.json().events[0].type, "edit");

    database.prepare("UPDATE projects SET version = version + 1 WHERE id = 'prj-road'").run();
    const stalePeer = await app.inject({
      method: "POST", url: `/api/v1/operator/projects/${projectId}/reschedule`, headers: operatorHeaders,
      payload: {
        version: 2, startDate: "2026-10-16", endDate: "2026-10-21",
        reason: "Finish before the resurfacing crew arrives.", expectedPeerVersions: { "prj-road": 1 },
      },
    });
    assert.equal(stalePeer.statusCode, 409);
    assert.equal(stalePeer.json().error.details.projectId, "prj-road");
    const afterConflict = await app.inject({ method: "GET", url: `/api/v1/projects/${projectId}` });
    assert.equal(afterConflict.json().version, 2);
    assert.equal(afterConflict.json().startDate, "2026-10-30");
    assert.equal(afterConflict.json().events.length, 2);

    const savedSchedule = await app.inject({
      method: "POST", url: `/api/v1/operator/projects/${projectId}/reschedule`, headers: operatorHeaders,
      payload: {
        version: 2, startDate: "2026-10-16", endDate: "2026-10-21",
        reason: "Finish before the resurfacing crew arrives.", expectedPeerVersions: { "prj-road": 2 },
      },
    });
    assert.equal(savedSchedule.statusCode, 200);
    assert.equal(savedSchedule.json().version, 3);
    assert.equal(savedSchedule.json().events[0].type, "reschedule");
    assert.equal(savedSchedule.json().events[0].reason, "Finish before the resurfacing crew arrives.");

    const delay = await app.inject({
      method: "POST", url: `/api/v1/operator/projects/${projectId}/updates`, headers: operatorHeaders,
      payload: { version: 3, type: "delay", summary: "Water main work needs more time.", reason: "The crew found a damaged connection and must replace it.", revisedEndDate: "2026-10-23" },
    });
    assert.equal(delay.statusCode, 201);
    assert.equal(delay.json().type, "delay");
    const publicAfterDelay = await app.inject({ method: "GET", url: `/api/v1/projects/${projectId}` });
    assert.equal(publicAfterDelay.json().endDate, "2026-10-23");
    assert.equal(publicAfterDelay.json().events[0].reason, "The crew found a damaged connection and must replace it.");

    const completion = await app.inject({
      method: "PATCH", url: `/api/v1/operator/projects/${projectId}`, headers: operatorHeaders,
      payload: {
        version: 4, reason: "The replacement work has been completed and inspected.",
        changes: { status: "completed", actualEndDate: "2026-10-23", earliestStartDate: null, latestEndDate: null },
      },
    });
    assert.equal(completion.statusCode, 200);
    assert.equal(completion.json().status, "completed");
    assert.equal(completion.json().actualEndDate, "2026-10-23");
    assert.equal(completion.json().events[0].type, "completed");
  } finally {
    await app.close();
    delete process.env.OPERATOR_PASSWORD;
    delete process.env.OPERATOR_SECRET;
    delete process.env.OPERATOR_LABEL;
  }
});
