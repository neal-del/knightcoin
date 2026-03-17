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

      CREATE TABLE IF NOT EXISTS market_requests (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        admin_note TEXT,
        created_at TEXT NOT NULL,
        reviewed_at TEXT,
        reviewed_by TEXT
      );

      CREATE TABLE IF NOT EXISTS market_options (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        market_id VARCHAR NOT NULL,
        label TEXT NOT NULL,
        price REAL NOT NULL DEFAULT 0.5,
        resolved BOOLEAN NOT NULL DEFAULT false,
        is_winner BOOLEAN NOT NULL DEFAULT false,
        sort_order INTEGER NOT NULL DEFAULT 0
      );
    `);

    // Add market_type column to markets if it doesn't exist
    await pool.query(`
      ALTER TABLE markets ADD COLUMN IF NOT EXISTS market_type TEXT NOT NULL DEFAULT 'binary';
    `);

    // Add last_daily_bonus column to users if it doesn't exist
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_daily_bonus TEXT;
    `);

    // Add referral columns to users if they don't exist
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
    `);

    // Email verification codes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_verification_codes (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL,
        code TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        used BOOLEAN NOT NULL DEFAULT false,
        created_at TEXT NOT NULL
      );
    `);

    // Sessions table — persists login sessions across server restarts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        token VARCHAR PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    // ── Allen admin account fix ──
    // Remove any old allen.wang admin account and insert new allenwsf@gmail.com admin
    // (The old allen.wang@menloschool.org may conflict with a regular user account)
    await pool.query(`
      DELETE FROM users WHERE username = 'allen.wang' AND role = 'admin';
    `);
    // Insert new Allen admin if not already present
    await pool.query(`
      INSERT INTO users (id, username, password, display_name, email, role, balance, total_winnings, total_bets, correct_predictions, referral_code, referred_by, email_verified, created_at)
      SELECT gen_random_uuid(), 'allen.admin', 'knightcoin2026', 'Allen Wang', 'allenwsf@gmail.com', 'admin', 10000, 0, 0, 0, 'ALLEN-ADMIN', NULL, true, NOW()::text
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'allenwsf@gmail.com');
    `);

    console.log("[migrate] Tables verified/created successfully.");
  } catch (err) {
    console.error("[migrate] Migration failed:", err);
    throw err;
  } finally {
    await pool.end();
  }
}
