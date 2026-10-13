import type { CoreDatabase } from "./database";

export const DEMO_SEGMENT_ID = "seg-market-1";
export const DEMO_PROJECT_ID = "prj-road";

export function getDemoDay(value = process.env.DEMO_DAY): string {
  const day = value ?? new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || new Date(`${day}T00:00:00.000Z`).toISOString().slice(0, 10) !== day) {
    throw new Error("DEMO_DAY must be a real calendar date in YYYY-MM-DD format.");
  }
  return day;
}

export function addCalendarDays(day: string, offset: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function seedDemoData(database: CoreDatabase, demoDay: string): void {
  if (getDemoDay(demoDay) !== demoDay) {
    throw new Error("A valid demo day is required.");
  }

  const now = new Date().toISOString();
  const roadStart = addCalendarDays(demoDay, 9);
  const roadEnd = addCalendarDays(demoDay, 14);
  const seed = database.transaction(() => {
    database.exec(`
      DELETE FROM reports;
      DELETE FROM project_events;
      DELETE FROM project_segments;
      DELETE FROM projects;
      DELETE FROM segments;
      DELETE FROM departments;
    `);

    database.prepare(`INSERT INTO departments (id, name, contact_label) VALUES (?, ?, ?)`)
      .run("roads", "Roads Department", "Roads desk");
    database.prepare(`INSERT INTO departments (id, name, contact_label) VALUES (?, ?, ?)`)
      .run("water", "Water Department", "Water desk");

    database.prepare(`
      INSERT INTO segments (
        id, road_name, from_label, to_label, aliases_json, geometry_json, center_lat, center_lng
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      DEMO_SEGMENT_ID,
      "Market Road",
      "Library",
      "Bus Stand",
      JSON.stringify(["Market Road", "Market Rd", "Library to Bus Stand"]),
      JSON.stringify({ type: "LineString", coordinates: [[77.5942, 12.9751], [77.6001, 12.9782]] }),
      12.97665,
      77.59715,
    );

    database.prepare(`
      INSERT INTO projects (
        id, title, description, work_type, department_id, status, impact,
        start_date, end_date, actual_end_date, earliest_start_date, latest_end_date,
        source_label, is_demo, version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, 1, 1, ?, ?)
    `).run(
      DEMO_PROJECT_ID,
      "Market Road resurfacing",
      "Resurface the Market Road stretch between the library and bus stand.",
      "resurfacing",
      "roads",
      "planned",
      "Expect temporary lane restrictions and local access delays.",
      roadStart,
      roadEnd,
      "Illustrative demo data",
      now,
      now,
    );
    database.prepare("INSERT INTO project_segments (project_id, segment_id) VALUES (?, ?)")
      .run(DEMO_PROJECT_ID, DEMO_SEGMENT_ID);
    database.prepare(`
      INSERT INTO project_events (
        id, project_id, type, summary, reason, previous_start_date, new_start_date,
        previous_end_date, new_end_date, author_label, created_at
      ) VALUES (?, ?, 'created', ?, NULL, NULL, ?, NULL, ?, ?, ?)
    `).run(
      "evt-road-created",
      DEMO_PROJECT_ID,
      "Illustrative demo resurfacing project added to the public works record.",
      roadStart,
      roadEnd,
      "OneDig demo seed",
      now,
    );
  });
  seed.immediate();
}
