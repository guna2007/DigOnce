import { openDatabase } from "./database";
import { getDemoDay, seedDemoData } from "./demoData";
import { migrateDatabase } from "./migrate";

if (process.env.NODE_ENV === "production") {
  throw new Error("Demo reset is disabled when NODE_ENV=production.");
}
if (!process.argv.includes("--reset")) {
  throw new Error("Refusing to change the database without the explicit --reset flag.");
}

const database = openDatabase();
try {
  migrateDatabase(database);
  seedDemoData(database, getDemoDay());
  process.stdout.write(`Illustrative Market Road demo data reset for ${getDemoDay()}.\n`);
} finally {
  database.close();
}
