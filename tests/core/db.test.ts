import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { openDatabase } from "../../workspaces/core-app/src/server/db/database";
import { migrateDatabase } from "../../workspaces/core-app/src/server/db/migrate";

test("migration creates all core tables and is safe to apply twice", () => {
  const database = openDatabase(":memory:");
  try {
    migrateDatabase(database);
    migrateDatabase(database);

    const tables = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as Array<{ name: string }>;
    assert.deepEqual(tables.map(({ name }) => name), [
      "departments", "project_events", "project_segments", "projects", "reports", "segments",
    ]);
    assert.equal(database.pragma("foreign_keys", { simple: true }), 1);
  } finally {
    database.close();
  }
});

test("foreign keys reject project rows with an unknown department", () => {
  const directory = mkdtempSync(join(tmpdir(), "onedig-db-test-"));
  const path = join(directory, "core.sqlite");
  const database = openDatabase(path);
  try {
    migrateDatabase(database);
    assert.throws(() => database.prepare(`
      INSERT INTO projects (
        id, title, description, work_type, department_id, status, impact,
        start_date, end_date, source_label, is_demo, created_at, updated_at
      ) VALUES ('orphan', 'Work', 'Description', 'other', 'missing', 'planned', 'Impact',
        '2026-10-14', '2026-10-14', 'Manual', 0, '2026-10-13T00:00:00.000Z', '2026-10-13T00:00:00.000Z')
    `).run(), /FOREIGN KEY constraint failed/);
  } finally {
    database.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
