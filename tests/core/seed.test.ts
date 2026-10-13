import assert from "node:assert/strict";
import test from "node:test";
import { openDatabase } from "../../workspaces/core-app/src/server/db/database";
import { addCalendarDays, DEMO_PROJECT_ID, DEMO_SEGMENT_ID, seedDemoData } from "../../workspaces/core-app/src/server/db/demoData";
import { migrateDatabase } from "../../workspaces/core-app/src/server/db/migrate";

test("two demo resets preserve canonical IDs and future schedule relationships", () => {
  const database = openDatabase(":memory:");
  const demoDay = "2026-10-13";
  try {
    migrateDatabase(database);
    seedDemoData(database, demoDay);
    const first = database.prepare(`
      SELECT id, start_date AS startDate, end_date AS endDate, is_demo AS isDemo, source_label AS sourceLabel
      FROM projects WHERE id = ?
    `).get(DEMO_PROJECT_ID) as {
      id: string; startDate: string; endDate: string; isDemo: number; sourceLabel: string;
    };
    const firstSegment = database.prepare("SELECT id FROM segments WHERE id = ?").get(DEMO_SEGMENT_ID);

    seedDemoData(database, demoDay);
    const second = database.prepare(`
      SELECT id, start_date AS startDate, end_date AS endDate, is_demo AS isDemo, source_label AS sourceLabel
      FROM projects WHERE id = ?
    `).get(DEMO_PROJECT_ID) as typeof first;
    const waterNoticeStart = addCalendarDays(demoDay, 17);
    const earlierSixDaySlotEnd = addCalendarDays(demoDay, 8);

    assert.deepEqual(second, first);
    assert.ok(firstSegment);
    assert.ok(first.startDate > demoDay);
    assert.equal(first.startDate, addCalendarDays(demoDay, 9));
    assert.equal(first.endDate, addCalendarDays(demoDay, 14));
    assert.ok(earlierSixDaySlotEnd < first.startDate);
    assert.ok(waterNoticeStart > first.endDate);
    assert.equal(first.isDemo, 1);
    assert.equal(first.sourceLabel, "Illustrative demo data");
  } finally {
    database.close();
  }
});
