import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Absolute path to the SQLite file. Override with DATABASE_PATH. */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const DB_PATH =
  process.env.DATABASE_PATH ?? join(ROOT, "data", "cyclotracker.db");
export const MIGRATIONS_DIR = join(ROOT, "db", "migrations");

/** Ensure the parent directory exists before better-sqlite3 opens the file. */
export function ensureDbDir(): void {
  mkdirSync(dirname(DB_PATH), { recursive: true });
}
