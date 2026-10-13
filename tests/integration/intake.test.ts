import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../../workspaces/core-app/src/server/app";
import { openDatabase } from "../../workspaces/core-app/src/server/db/database";
import { migrateDatabase } from "../../workspaces/core-app/src/server/db/migrate";
import { seedDemoData } from "../../workspaces/core-app/src/server/db/demoData";

const origin = { origin: "http://localhost:5173" };
const rawText = "Water Department notice: excavating Market Road from 2026-10-30 to 2026-11-04 to replace the main. Temporary access restrictions are expected for nearby shops.";

async function setup() {
  process.env.OPERATOR_PASSWORD = "demo-only-password";
  process.env.OPERATOR_SECRET = "test-secret-that-is-at-least-32-characters-long";
  const database = openDatabase(":memory:");
  migrateDatabase(database);
  seedDemoData(database, "2026-10-13");
  const app = buildApp(database);
  const login = await app.inject({ method: "POST", url: "/api/v1/operator/session", headers: origin, payload: { password: "demo-only-password" } });
  return { app, headers: { ...origin, cookie: (login.headers["set-cookie"] as string).split(";")[0] } };
}

test("no-key intake returns evidence-linked rules draft and writes only after officer confirmation", async () => {
  delete process.env.OPENAI_API_KEY;
  const { app, headers } = await setup();
  try {
    const before = await app.inject({ method: "GET", url: "/api/v1/projects" });
    const extracted = await app.inject({ method: "POST", url: "/api/v1/operator/intake/extract", headers, payload: { rawText } });
    assert.equal(extracted.statusCode, 200);
    const result = extracted.json();
    assert.equal(result.mode, "rules");
    assert.equal(result.draft.departmentId, "water");
    assert.equal(result.draft.workType, "excavation");
    assert.equal(result.draft.startDate, "2026-10-30");
    assert.deepEqual(result.draft.segmentIdCandidates, ["seg-market-1"]);
    assert.ok(result.evidence.length >= 4);
    for (const evidence of result.evidence) assert.ok(rawText.includes(evidence.quote));
    const afterExtract = await app.inject({ method: "GET", url: "/api/v1/projects" });
    assert.equal(afterExtract.json().items.length, before.json().items.length);

    const confirmed = await app.inject({
      method: "POST", url: "/api/v1/operator/projects", headers,
      payload: {
        title: "Market Road water main replacement", description: "Officer-reviewed project from the synthetic departmental notice.",
        workType: result.draft.workType, departmentId: result.draft.departmentId,
        impact: "Temporary access restrictions for nearby shops.", status: "planned",
        startDate: result.draft.startDate, endDate: result.draft.endDate,
        earliestStartDate: "2026-10-14", latestEndDate: "2026-11-04",
        segmentIds: [result.draft.segmentIdCandidates[0]], sourceLabel: "Illustrative notice, reviewed by officer",
      },
    });
    assert.equal(confirmed.statusCode, 201);
    const afterConfirm = await app.inject({ method: "GET", url: "/api/v1/projects" });
    assert.equal(afterConfirm.json().items.length, before.json().items.length + 1);
  } finally {
    await app.close();
    delete process.env.OPERATOR_PASSWORD; delete process.env.OPERATOR_SECRET;
  }
});

test("provider failure falls back honestly and unsupported notice stays manual", async () => {
  process.env.OPENAI_API_KEY = "test-key-never-sent";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("simulated provider outage"); };
  const { app, headers } = await setup();
  try {
    const fallback = await app.inject({ method: "POST", url: "/api/v1/operator/intake/extract", headers, payload: { rawText } });
    assert.equal(fallback.statusCode, 200);
    assert.equal(fallback.json().mode, "rules");
    assert.match(fallback.json().warnings.join(" "), /provider request failed/i);
    const unsupported = "This illustrative memo contains no recognized department, road alias, work type, or usable date range for the prototype catalog.";
    const manual = await app.inject({ method: "POST", url: "/api/v1/operator/intake/extract", headers, payload: { rawText: unsupported } });
    assert.equal(manual.json().mode, "manual");
    assert.deepEqual(manual.json().evidence, []);
  } finally {
    globalThis.fetch = originalFetch;
    await app.close();
    delete process.env.OPENAI_API_KEY; delete process.env.OPERATOR_PASSWORD; delete process.env.OPERATOR_SECRET;
  }
});
