/**
 * Programmatic database migration — creates tables if they don't exist.
 * This replaces `drizzle-kit push` so we don't need devDependencies at runtime.
 */
import pg from "pg";

const { Pool } = pg;

export async function runMigrations() {
  const url =
    process.env.DATABASE_PRIVATE_URL ||
    process.env.DATABASE_URL ||
    process.env.DATABASE_PUBLIC_URL ||
    "";
  if (!url) return;

  const pool = new Pool({
    connectionString: url,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        display_name TEXT NOT NULL,
        email TEXT,
        wallet_address TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        balance REAL NOT NULL DEFAULT 1000,
        total_winnings REAL NOT NULL DEFAULT 0,
        total_bets INTEGER NOT NULL DEFAULT 0,
        correct_predictions INTEGER NOT NULL DEFAULT 0,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS markets (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        subcategory TEXT,
        yes_price REAL NOT NULL DEFAULT 0.5,
        no_price REAL NOT NULL DEFAULT 0.5,
        volume REAL NOT NULL DEFAULT 0,
        total_bets INTEGER NOT NULL DEFAULT 0,
        resolved BOOLEAN NOT NULL DEFAULT false,
        outcome BOOLEAN,
        closes_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        featured BOOLEAN NOT NULL DEFAULT false,
        icon TEXT,
        created_by TEXT,
        resolution_source TEXT,
        resolution_data TEXT,
        resolved_at TEXT,
        resolved_by TEXT
      );

      CREATE TABLE IF NOT EXISTS bets (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL,
        market_id VARCHAR NOT NULL,
        position TEXT NOT NULL,
        amount REAL NOT NULL,
        price REAL NOT NULL,
        created_at TEXT NOT NULL,
        settled BOOLEAN NOT NULL DEFAULT false,
        payout REAL
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL,
        type TEXT NOT NULL,
        tx_hash TEXT,
        amount REAL NOT NULL,
        description TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    console.log("[migrate] Tables verified/created successfully.");
  } catch (err) {
    console.error("[migrate] Migration failed:", err);
    throw err;
  } finally {
    await pool.end();
  }
}
