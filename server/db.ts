import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Fail fast at startup if DATABASE_URL is missing — much clearer than a
// cryptic "Connection refused" error on the first query.
if (!process.env.DATABASE_URL) {
  console.error(
    "\n[QueueCare] ERROR: DATABASE_URL environment variable is not set.\n" +
    "  1. Copy .env.example to .env\n" +
    "  2. Set DATABASE_URL to your PostgreSQL connection string\n" +
    "  3. Restart the server\n"
  );
  process.exit(1);
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Keep connection pool small for a college-level single-instance app
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// Log pool errors to prevent unhandled promise rejections crashing the process
pool.on("error", (err) => {
  console.error("[QueueCare] PostgreSQL pool error:", err.message);
});

export const db = drizzle(pool, { schema });
