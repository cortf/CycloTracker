import { defineConfig } from "drizzle-kit";

// drizzle-kit reads the schema and emits SQL migrations to db/migrations/.
export default defineConfig({
  dialect: "sqlite",
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_PATH ?? "./data/cyclotracker.db",
  },
  strict: true,
  verbose: true,
});
