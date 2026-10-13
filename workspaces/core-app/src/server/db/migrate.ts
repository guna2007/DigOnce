import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { CoreDatabase } from "./database";

const schemaPath = fileURLToPath(new URL("./schema.sql", import.meta.url));

export function migrateDatabase(database: CoreDatabase): void {
  const schema = readFileSync(schemaPath, "utf8");
  database.exec("BEGIN IMMEDIATE");

  try {
    database.exec(schema);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}
