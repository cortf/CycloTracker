/**
 * db/client.ts — shared Drizzle client (better-sqlite3 driver).
 * Import { db } for typed queries; { sqlite } for raw pragmas/CLI-style access.
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { DB_PATH, ensureDbDir } from "./paths";
import * as schema from "./schema";

ensureDbDir();

export const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON"); // enforce the FKs declared in schema.ts

export const db = drizzle(sqlite, { schema });
export { schema };
