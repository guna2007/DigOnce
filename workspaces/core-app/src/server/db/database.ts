import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export type CoreDatabase = Database.Database;

export function resolveDatabasePath(path = process.env.DATABASE_PATH ?? "./data/onedig.sqlite"): string {
  return resolve(path);
}

export function openDatabase(path = resolveDatabasePath()): CoreDatabase {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }

  const database = new Database(path);
  database.pragma("foreign_keys = ON");
  database.pragma("busy_timeout = 5000");
  return database;
}
