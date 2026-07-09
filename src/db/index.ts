import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Only use DATABASE_URL if it looks like a PostgreSQL connection string
// The start.sh may write DATABASE_URL=file:... which is SQLite, not PostgreSQL
const rawUrl = process.env.DATABASE_URL || "";
const databaseUrl = rawUrl.startsWith("postgresql://") || rawUrl.startsWith("postgres://")
  ? rawUrl
  : "postgresql://postgres:postgres@127.0.0.1:5432/app_db";

const globalForDb = globalThis as typeof globalThis & { __arenaNextJsPostgresqlPool?: Pool };

let pool: Pool;
let db: ReturnType<typeof drizzle>;

try {
  pool = globalForDb.__arenaNextJsPostgresqlPool ?? new Pool({
    connectionString: databaseUrl,
    max: 1,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 3000,
  });

  // Prevent unhandled pool errors from crashing the process
  pool.on("error", (err) => {
    console.error("[db] Pool error (suppressed):", err.message);
  });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__arenaNextJsPostgresqlPool = pool;
  }

  db = drizzle(pool);
} catch (e) {
  console.error("[db] Failed to initialize database connection (DB not available):", e);
  // Create a dummy pool that will fail gracefully on any query
  pool = new Pool({ connectionString: "postgresql://localhost:1/nonexistent", max: 0 });
  pool.on("error", () => {});
  db = drizzle(pool);
}

export { pool, db };