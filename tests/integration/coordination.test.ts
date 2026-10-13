import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../../workspaces/core-app/src/server/app";
import { openDatabase } from "../../workspaces/core-app/src/server/db/database";
import { migrateDatabase } from "../../workspaces/core-app/src/server/db/migrate";
import { seedDemoData } from "../../workspaces/core-app/src/server/db/demoData";

const origin = { origin: "http://localhost:5173" };

async function operatorHeaders(app: ReturnType<typeof buildApp>) {
  const login = await app.inject({ method: "POST", url: "/api/v1/operator/session", headers: origin, payload: { password: "demo-only-password" } });
  assert.equal(login.statusCode, 200);
  return { ...origin, cookie: (login.headers["set-cookie"] as string).split(";")[0] };
}

function waterProject(window = true) {
  return {
    title: "Market Road water main replacement",
    description: "Replace the water main on Market Road before the street is reopened.",
    workType: "excavation",
    departmentId: "water",
    impact: "Temporary access restrictions while the trench is open.",
    status: "planned",
    startDate: "2026-10-30",
    endDate: "2026-11-04",
    ...(window ? { earliestStartDate: "2026-10-14", latestEndDate: "2026-11-04" } : {}),
    segmentIds: ["seg-market-1"],
    sourceLabel: "Illustrative synthetic notice reviewed by an officer",
  };
}

test("live Core snapshot produces a computed candidate that persists and clears the warning", async () => {
  process.env.OPERATOR_PASSWORD = "demo-only-password";
  process.env.OPERATOR_SECRET = "test-secret-that-is-at-least-32-characters-long";
  process.env.OPERATOR_LABEL = "Coordination officer";
  const database = openDatabase(":memory:");
  migrateDatabase(database);
  seedDemoData(database, "2026-10-13");
  const app = buildApp(database);
  try {
    const headers = await operatorHeaders(app);
    const beforeCreate = await app.inject({ method: "GET", url: "/api/v1/projects" });
    assert.equal(beforeCreate.json().items.length, 1);

    const created = await app.inject({ method: "POST", url: "/api/v1/operator/projects", headers, payload: waterProject() });
    assert.equal(created.statusCode, 201);
    const projectId = created.json().id as string;

    const analyzed = await app.inject({ method: "POST", url: "/api/v1/operator/coordination/analyze", headers, payload: { focusProjectId: projectId } });
    assert.equal(analyzed.statusCode, 200);
    const analysis = analyzed.json();
    assert.equal(analysis.basis, "computed");
    assert.equal(analysis.status, "recommendation_available");
    assert.equal(analysis.currentWarnings.length, 1);
    assert.equal(analysis.currentWarnings[0].kind, "recent_resurfacing");
    assert.equal(analysis.candidate.startDate, "2026-10-16");
    assert.equal(analysis.candidate.endDate, "2026-10-21");
    assert.deepEqual(analysis.candidate.expectedPeerVersions, { "prj-road": 1 });

    const saved = await app.inject({
      method: "POST", url: `/api/v1/operator/projects/${projectId}/reschedule`, headers,
      payload: {
        version: analysis.focusVersion,
        startDate: analysis.candidate.startDate,
        endDate: analysis.candidate.endDate,
        reason: "Complete the water work before resurfacing begins.",
        expectedPeerVersions: analysis.candidate.expectedPeerVersions,
      },
    });
    assert.equal(saved.statusCode, 200);
    assert.equal(saved.json().startDate, "2026-10-16");
    assert.equal(saved.json().events[0].type, "reschedule");
    assert.equal(saved.json().events[0].reason, "Complete the water work before resurfacing begins.");

    const refreshed = await app.inject({ method: "POST", url: "/api/v1/operator/coordination/analyze", headers, payload: { focusProjectId: projectId } });
    assert.equal(refreshed.json().status, "no_change_needed");
    assert.equal(refreshed.json().currentWarnings.length, 0);
    const publicRead = await app.inject({ method: "GET", url: `/api/v1/projects/${projectId}` });
    assert.equal(publicRead.json().startDate, "2026-10-16");
    assert.equal(publicRead.json().events[0].reason, "Complete the water work before resurfacing begins.");
  } finally {
    await app.close();
    delete process.env.OPERATOR_PASSWORD; delete process.env.OPERATOR_SECRET; delete process.env.OPERATOR_LABEL;
  }
});

test("stale peer protection rejects an analyzed candidate without a partial write", async () => {
  process.env.OPERATOR_PASSWORD = "demo-only-password";
  process.env.OPERATOR_SECRET = "test-secret-that-is-at-least-32-characters-long";
  const database = openDatabase(":memory:");
  migrateDatabase(database);
  seedDemoData(database, "2026-10-13");
  const app = buildApp(database);
  try {
    const headers = await operatorHeaders(app);
    const created = await app.inject({ method: "POST", url: "/api/v1/operator/projects", headers, payload: waterProject() });
    const projectId = created.json().id as string;
    const analyzed = await app.inject({ method: "POST", url: "/api/v1/operator/coordination/analyze", headers, payload: { focusProjectId: projectId } });
    const analysis = analyzed.json();
    database.prepare("UPDATE projects SET version = version + 1 WHERE id = ?").run("prj-road");

    const rejected = await app.inject({
      method: "POST", url: `/api/v1/operator/projects/${projectId}/reschedule`, headers,
      payload: { version: analysis.focusVersion, startDate: analysis.candidate.startDate, endDate: analysis.candidate.endDate, reason: "Apply the reviewed coordination recommendation.", expectedPeerVersions: analysis.candidate.expectedPeerVersions },
    });
    assert.equal(rejected.statusCode, 409);
    assert.equal(rejected.json().error.code, "VERSION_CONFLICT");
    const unchanged = await app.inject({ method: "GET", url: `/api/v1/projects/${projectId}` });
    assert.equal(unchanged.json().startDate, "2026-10-30");
    assert.equal(unchanged.json().version, 1);
    assert.equal(unchanged.json().events.length, 1);
  } finally {
    await app.close();
    delete process.env.OPERATOR_PASSWORD; delete process.env.OPERATOR_SECRET;
  }
});

test("missing flexibility and missing projects return honest non-success states", async () => {
  process.env.OPERATOR_PASSWORD = "demo-only-password";
  process.env.OPERATOR_SECRET = "test-secret-that-is-at-least-32-characters-long";
  const database = openDatabase(":memory:");
  migrateDatabase(database);
  seedDemoData(database, "2026-10-13");
  const app = buildApp(database);
  try {
    const headers = await operatorHeaders(app);
    const created = await app.inject({ method: "POST", url: "/api/v1/operator/projects", headers, payload: waterProject(false) });
    const analyzed = await app.inject({ method: "POST", url: "/api/v1/operator/coordination/analyze", headers, payload: { focusProjectId: created.json().id } });
    assert.equal(analyzed.json().status, "no_safe_option");
    assert.equal(analyzed.json().candidate, null);
    assert.match(analyzed.json().limitations.join(" "), /earliest start and latest end/i);
    const missing = await app.inject({ method: "POST", url: "/api/v1/operator/coordination/analyze", headers, payload: { focusProjectId: "missing" } });
    assert.equal(missing.statusCode, 404);
    assert.equal(missing.json().error.code, "NOT_FOUND");
  } finally {
    await app.close();
    delete process.env.OPERATOR_PASSWORD; delete process.env.OPERATOR_SECRET;
  }
});
