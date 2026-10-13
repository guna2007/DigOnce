import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { openDatabase } from "../../workspaces/core-app/src/server/db/database";
import { seedDemoData } from "../../workspaces/core-app/src/server/db/demoData";
import { buildApp } from "../../workspaces/core-app/src/server/app";
import { migrateDatabase } from "../../workspaces/core-app/src/server/db/migrate";

test("resident receipt tracks the operator response while public project data exposes only a count", async () => {
  process.env.OPERATOR_PASSWORD = "demo-only-password";
  process.env.OPERATOR_SECRET = "test-secret-that-is-at-least-32-characters-long";
  process.env.OPERATOR_LABEL = "Report officer";
  delete process.env.APP_ORIGIN;
  const database = openDatabase(":memory:");
  migrateDatabase(database);
  seedDemoData(database, "2026-10-13");
  const app = buildApp(database);
  const origin = { origin: "http://localhost:5173" };
  try {
    const missingProject = await app.inject({
      method: "POST", url: "/api/v1/reports", headers: origin,
      payload: { projectId: "missing", category: "access", description: "The sidewalk is blocked today." },
    });
    assert.equal(missingProject.statusCode, 404);

    const created = await app.inject({
      method: "POST", url: "/api/v1/reports", headers: origin,
      payload: { projectId: "prj-road", category: "access", description: "The sidewalk is difficult to use near the work area." },
    });
    assert.equal(created.statusCode, 201);
    const receipt = created.json();
    assert.equal(receipt.status, "new");
    assert.equal(typeof receipt.receiptToken, "string");
    assert.ok(Buffer.from(receipt.receiptToken, "base64url").length >= 16);

    const stored = database.prepare("SELECT receipt_token_hash FROM reports WHERE id = ?").get(receipt.reportId) as { receipt_token_hash: string };
    assert.equal(stored.receipt_token_hash, createHash("sha256").update(receipt.receiptToken).digest("hex"));
    assert.notEqual(stored.receipt_token_hash, receipt.receiptToken);

    const tracked = await app.inject({ method: "POST", url: "/api/v1/reports/track", headers: origin, payload: { receiptToken: receipt.receiptToken } });
    assert.equal(tracked.statusCode, 200);
    assert.equal(tracked.json().status, "new");
    assert.equal("description" in tracked.json(), false);

    const invalidToken = await app.inject({ method: "POST", url: "/api/v1/reports/track", headers: origin, payload: { receiptToken: "A".repeat(43) } });
    assert.equal(invalidToken.statusCode, 404);
    assert.equal(invalidToken.json().error.message, "Receipt not found.");
    assert.equal(invalidToken.json().error.code, "NOT_FOUND");

    const publicProject = await app.inject({ method: "GET", url: "/api/v1/projects/prj-road" });
    assert.equal(publicProject.json().reportCount, 1);
    assert.equal(JSON.stringify(publicProject.json()).includes(receipt.receiptToken), false);
    assert.equal(JSON.stringify(publicProject.json()).includes("sidewalk is difficult"), false);

    const anonymousQueue = await app.inject({ method: "GET", url: "/api/v1/operator/reports" });
    assert.equal(anonymousQueue.statusCode, 401);
    const login = await app.inject({ method: "POST", url: "/api/v1/operator/session", headers: origin, payload: { password: "demo-only-password" } });
    const cookie = (login.headers["set-cookie"] as string).split(";")[0];
    const operatorHeaders = { ...origin, cookie };

    const queue = await app.inject({ method: "GET", url: "/api/v1/operator/reports?status=new", headers: { cookie } });
    assert.equal(queue.statusCode, 200);
    assert.equal(queue.json().items[0].description, "The sidewalk is difficult to use near the work area.");

    const skippedTransition = await app.inject({
      method: "PATCH", url: `/api/v1/operator/reports/${receipt.reportId}`, headers: operatorHeaders,
      payload: { status: "resolved", operatorResponse: "The crew has cleared the sidewalk.", },
    });
    assert.equal(skippedTransition.statusCode, 400);
    assert.equal(skippedTransition.json().error.code, "VALIDATION_ERROR");

    const inReview = await app.inject({
      method: "PATCH", url: `/api/v1/operator/reports/${receipt.reportId}`, headers: operatorHeaders,
      payload: { status: "in_review", operatorResponse: null },
    });
    assert.equal(inReview.statusCode, 200);
    assert.equal(inReview.json().status, "in_review");

    const resolved = await app.inject({
      method: "PATCH", url: `/api/v1/operator/reports/${receipt.reportId}`, headers: operatorHeaders,
      payload: { status: "resolved", operatorResponse: "The crew cleared the sidewalk and restored access." },
    });
    assert.equal(resolved.statusCode, 200);
    assert.equal(resolved.json().status, "resolved");
    const finalReceipt = await app.inject({ method: "POST", url: "/api/v1/reports/track", headers: origin, payload: { receiptToken: receipt.receiptToken } });
    assert.equal(finalReceipt.json().status, "resolved");
    assert.equal(finalReceipt.json().operatorResponse, "The crew cleared the sidewalk and restored access.");
  } finally {
    await app.close();
    delete process.env.OPERATOR_PASSWORD;
    delete process.env.OPERATOR_SECRET;
    delete process.env.OPERATOR_LABEL;
  }
});

test("report creation is rate limited", async () => {
  const database = openDatabase(":memory:");
  migrateDatabase(database);
  seedDemoData(database, "2026-10-13");
  const app = buildApp(database);
  try {
    let lastStatus = 0;
    for (let index = 0; index < 6; index += 1) {
      const response = await app.inject({
        method: "POST", url: "/api/v1/reports", headers: { origin: "http://localhost:5173" },
        payload: { projectId: "prj-road", category: "other", description: `Resident concern about access number ${index}.` },
      });
      lastStatus = response.statusCode;
      if (index < 5) assert.equal(response.statusCode, 201);
    }
    assert.equal(lastStatus, 429);
  } finally {
    await app.close();
  }
});
