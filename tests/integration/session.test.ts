import assert from "node:assert/strict";
import test from "node:test";
import { openDatabase } from "../../workspaces/core-app/src/server/db/database";
import { buildApp } from "../../workspaces/core-app/src/server/app";
import { migrateDatabase } from "../../workspaces/core-app/src/server/db/migrate";
import { createSessionToken, readSessionToken } from "../../workspaces/core-app/src/server/auth/session";

const ORIGINAL_ENV = {
  password: process.env.OPERATOR_PASSWORD,
  secret: process.env.OPERATOR_SECRET,
  label: process.env.OPERATOR_LABEL,
  origin: process.env.APP_ORIGIN,
};

function configureOperator() {
  process.env.OPERATOR_PASSWORD = "demo-only-password";
  process.env.OPERATOR_SECRET = "test-secret-that-is-at-least-32-characters-long";
  process.env.OPERATOR_LABEL = "Market Road operator";
  delete process.env.APP_ORIGIN;
}

function restoreEnvironment() {
  for (const [key, value] of Object.entries({
    OPERATOR_PASSWORD: ORIGINAL_ENV.password,
    OPERATOR_SECRET: ORIGINAL_ENV.secret,
    OPERATOR_LABEL: ORIGINAL_ENV.label,
    APP_ORIGIN: ORIGINAL_ENV.origin,
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function makeApp() {
  const database = openDatabase(":memory:");
  migrateDatabase(database);
  return buildApp(database);
}

test("operator session hashes password checks and sets a signed HttpOnly cookie", async () => {
  configureOperator();
  const app = makeApp();
  const origin = { origin: "http://localhost:5173" };
  try {
    const anonymous = await app.inject({ method: "GET", url: "/api/v1/operator/session" });
    assert.deepEqual(anonymous.json(), { authenticated: false });

    const forbidden = await app.inject({ method: "POST", url: "/api/v1/operator/session", payload: { password: "demo-only-password" } });
    assert.equal(forbidden.statusCode, 403);
    assert.equal(forbidden.json().error.code, "FORBIDDEN_ORIGIN");

    const incorrect = await app.inject({
      method: "POST", url: "/api/v1/operator/session", headers: origin,
      payload: { password: "wrong-password" },
    });
    assert.equal(incorrect.statusCode, 401);
    assert.equal(incorrect.json().error.code, "UNAUTHENTICATED");

    const login = await app.inject({
      method: "POST", url: "/api/v1/operator/session", headers: origin,
      payload: { password: "demo-only-password" },
    });
    assert.equal(login.statusCode, 200);
    assert.deepEqual(login.json(), { authenticated: true, operatorLabel: "Market Road operator" });
    const setCookie = login.headers["set-cookie"];
    assert.equal(typeof setCookie, "string");
    assert.match(setCookie as string, /HttpOnly/i);
    assert.match(setCookie as string, /SameSite=Strict/i);
    const cookie = (setCookie as string).split(";")[0];
    const authorized = await app.inject({ method: "GET", url: "/api/v1/operator/session", headers: { cookie } });
    assert.deepEqual(authorized.json(), { authenticated: true });

    const logout = await app.inject({ method: "DELETE", url: "/api/v1/operator/session", headers: { ...origin, cookie } });
    assert.equal(logout.statusCode, 204);
    assert.match(logout.headers["set-cookie"] as string, /Max-Age=0/i);
    const loggedOut = await app.inject({ method: "GET", url: "/api/v1/operator/session" });
    assert.deepEqual(loggedOut.json(), { authenticated: false });
  } finally {
    await app.close();
    restoreEnvironment();
  }
});

test("signed sessions expire and login is rate limited", async () => {
  configureOperator();
  const token = createSessionToken(10_000);
  assert.ok(token);
  assert.ok(readSessionToken(token, 10_001));
  assert.equal(readSessionToken(token, 10_000 + 8 * 60 * 60 * 1000), null);

  const app = makeApp();
  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await app.inject({
        method: "POST", url: "/api/v1/operator/session",
        headers: { origin: "http://localhost:5173" }, payload: { password: "wrong-password" },
      });
      assert.equal(response.statusCode, 401);
    }
    const limited = await app.inject({
      method: "POST", url: "/api/v1/operator/session",
      headers: { origin: "http://localhost:5173" }, payload: { password: "wrong-password" },
    });
    assert.equal(limited.statusCode, 429);
    assert.equal(limited.json().error.code, "RATE_LIMITED");
  } finally {
    await app.close();
    restoreEnvironment();
  }
});
