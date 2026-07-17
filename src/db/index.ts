import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Only use DATABASE_URL if it looks like a PostgreSQL connection string
// The start.sh may write DATABASE_URL=file:... which is SQLite, not PostgreSQL
const rawUrl = process.env.DATABASE_URL || "";

// در production حتماً DATABASE_URL باید PostgreSQL باشه
if (!rawUrl) {
  const msg = "FATAL: DATABASE_URL is required. Set DATABASE_URL=postgresql://... in .env";
  if (process.env.NODE_ENV === "production") throw new Error(msg);
  console.warn("[db] WARNING: DATABASE_URL not set. Using local fallback for development only.");
}

const databaseUrl = (rawUrl.startsWith("postgresql://") || rawUrl.startsWith("postgres://"))
  ? rawUrl
  : (process.env.NODE_ENV === "production"
    ? (() => { throw new Error("FATAL: DATABASE_URL must be a valid PostgreSQL connection string in production."); })()
    : "postgresql://postgres:postgres@127.0.0.1:5432/app_db");

const globalForDb = globalThis as typeof globalThis & { __arenaNextJsPostgresqlPool?: Pool };

let pool: Pool;
let db: ReturnType<typeof drizzle>;

try {
  pool = globalForDb.__arenaNextJsPostgresqlPool ?? new Pool({
    connectionString: databaseUrl,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
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