/**
 * db/migrate.ts — apply pending SQL migrations from db/migrations/.
 * Run: npm run db:migrate
 */
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db, sqlite } from "./client";
import { MIGRATIONS_DIR } from "./paths";

migrate(db, { migrationsFolder: MIGRATIONS_DIR });
sqlite.close();
console.log("✅ migrations applied");
