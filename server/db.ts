import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let pool: InstanceType<typeof Pool> | null = null;

// Railway provides several URL variables — try them in order of preference
const dbUrl =
  process.env.DATABASE_PRIVATE_URL ||
  process.env.DATABASE_URL ||
  process.env.DATABASE_PUBLIC_URL ||
  "";

if (dbUrl) {
  try {
    pool = new Pool({
      connectionString: dbUrl,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    });
    db = drizzle(pool, { schema });
    console.log("[db] PostgreSQL pool created successfully.");
  } catch (err) {
    console.error("[db] Failed to create PostgreSQL pool:", err);
    console.warn("[db] Falling back to in-memory storage.");
    db = null;
    pool = null;
  }
} else {
  console.warn(
    "[db] No DATABASE_URL set — PostgreSQL is unavailable. Falling back to in-memory storage.",
  );
}

export { db, pool };
