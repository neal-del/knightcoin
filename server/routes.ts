import type { Express } from "express";
import { createServer, type Server } from "http";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { initBlockchain, getBlockchainConfig, getOnChainBalance, verifyTransaction, isBlockchainEnabled } from "./blockchain";
import { Resend } from "resend";

// ═══════════════════════════════════════════
// EMAIL VERIFICATION (Resend)
// ═══════════════════════════════════════════

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// In-memory store for verification codes (also persisted to DB when available)
const verificationCodes: Map<string, { code: string; expiresAt: string }> = new Map();

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  if (!resend) {
    console.log(`[email] No RESEND_API_KEY set. Verification code for ${email}: ${code}`);
    return true; // Succeed silently in dev
  }
  try {
    await resend.emails.send({
      from: 'The Knight Market <onboarding@resend.dev>',
      to: [email],
      subject: 'Your Knight Market Verification Code',
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #06b6d4; margin-bottom: 8px;">The Knight Market</h2>
          <p style="color: #666; font-size: 14px;">Your email verification code is:</p>
          <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; text-align: center; margin: 16px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #111;">${code}</span>
          </div>
          <p style="color: #999; font-size: 12px;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error('[email] Failed to send verification email:', err);
    return false;
  }
}

// Categories allowed to be featured
const FEATURED_ALLOWED_CATEGORIES = ['campus', 'social', 'sports', 'pro-sports'];

// ═══════════════════════════════════════════
// SESSION MANAGEMENT
// In-memory fallback + PostgreSQL persistence
// ═══════════════════════════════════════════

const memSessions: Map<string, { userId: string; expiresAt: string }> = new Map();

// DB session helpers (only used when DATABASE_URL is set)
let dbPool: any = null;
async function getDbPool() {
  if (dbPool) return dbPool;
  const url = process.env.DATABASE_PRIVATE_URL || process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;
  if (!url) return null;
  const pg = await import("pg");
  dbPool = new pg.default.Pool({
    connectionString: url,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    max: 3,
  });
  return dbPool;
}

function parseCookies(req: any): Record<string, string> {
  const header = req.headers.cookie || "";
  const cookies: Record<string, string> = {};
  header.split(";").forEach((pair: string) => {
    const [key, ...rest] = pair.trim().split("=");
    if (key) cookies[key] = rest.join("=");
  });
  return cookies;
}

function getSessionToken(req: any): string | null {
  const cookies = parseCookies(req);
  return cookies["kc_session"] || null;
}

async function getCurrentUserId(req: any): Promise<string | null> {
  const token = getSessionToken(req);
  if (!token) return null;

  // Try in-memory first
  const mem = memSessions.get(token);
  if (mem) {
    if (new Date(mem.expiresAt) > new Date()) return mem.userId;
    memSessions.delete(token);
    return null;
  }

  // Try database
  const pool = await getDbPool();
  if (pool) {
    try {
      const { rows } = await pool.query(
        "SELECT user_id, expires_at FROM sessions WHERE token = $1",
        [token]
      );
      if (rows.length > 0 && new Date(rows[0].expires_at) > new Date()) {
        // Cache in memory for faster subsequent requests
        memSessions.set(token, { userId: rows[0].user_id, expiresAt: rows[0].expires_at });
        return rows[0].user_id;
      }
      // Expired — clean up
      if (rows.length > 0) {
        await pool.query("DELETE FROM sessions WHERE token = $1", [token]);
      }
    } catch (e) {
      // DB error — fall through
    }
  }

  return null;
}

async function createSession(res: any, userId: string, rememberMe: boolean = false) {
  const token = randomBytes(32).toString("hex");
  const durationMs = rememberMe
    ? 30 * 24 * 60 * 60 * 1000  // 30 days
    : 7 * 24 * 60 * 60 * 1000;  // 7 days (default)
  const expiresAt = new Date(Date.now() + durationMs).toISOString();

  // Store in memory
  memSessions.set(token, { userId, expiresAt });

  // Persist to DB if available
  const pool = await getDbPool();
  if (pool) {
    try {
      await pool.query(
        "INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (token) DO UPDATE SET user_id = $2, expires_at = $3",
        [token, userId, expiresAt, new Date().toISOString()]
      );
    } catch (e) {
      // DB write failed — in-memory session still works for this deploy
    }
  }

  const cookieOpts: any = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: durationMs,
  };

  res.cookie("kc_session", token, cookieOpts);
}

async function destroySession(req: any, res: any) {
  const token = getSessionToken(req);
  if (token) {
    memSessions.delete(token);
    const pool = await getDbPool();
    if (pool) {
      try { await pool.query("DELETE FROM sessions WHERE token = $1", [token]); } catch (e) {}
    }
  }
  res.clearCookie("kc_session", { path: "/" });
}

// Admin middleware
async function requireAdmin(req: any, res: any, next: any) {
  const userId = await getCurrentUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const user = await storage.getUser(userId);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  (req as any).adminUser = user;
  next();
}

// Payout engine — settles all bets for a resolved market
async function settleMarketBets(marketId: string, outcome: boolean) {
  const unsettledBets = await storage.getUnsettledBetsByMarket(marketId);
  
  for (const bet of unsettledBets) {
    const won = (bet.position === "yes" && outcome === true) || 
                (bet.position === "no" && outcome === false);
    
    if (won) {
      // Payout = amount / price (since price was the cost per share, payout is 1.0 per share)
      const payout = bet.amount / bet.price;
      await storage.settleBet(bet.id, payout);
      await storage.updateUserBalance(bet.userId, payout);
      
      // Update user stats
      const user = await storage.getUser(bet.userId);
      if (user) {
        await storage.updateUserStats(bet.userId, {
          totalWinnings: user.totalWinnings + payout,
          correctPredictions: user.correctPredictions + 1,
        });
      }
      
      await storage.createTransaction({
        userId: bet.userId,
        type: "payout",
        amount: payout,
        description: `Won ${payout.toFixed(1)} KC on "${bet.position.toUpperCase()}" bet`,
        createdAt: new Date().toISOString(),
      });
    } else {
      // Lost — payout is 0
      await storage.settleBet(bet.id, 0);
      
      await storage.createTransaction({
        userId: bet.userId,
        type: "bet_lost",
        amount: 0,
        description: `Lost ${bet.amount.toFixed(1)} KC on "${bet.position.toUpperCase()}" bet`,
        createdAt: new Date().toISOString(),
      });
    }
  }
  
  return unsettledBets.length;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ═══════════════════════════════════════════
  // AUTH ROUTES
  // ═══════════════════════════════════════════

  // Step 1: Send verification code to a @menloschool.org email
  app.post("/api/auth/send-verification", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      // Enforce menloschool.org domain
      if (!email.toLowerCase().endsWith("@menloschool.org")) {
        return res.status(400).json({ error: "Only @menloschool.org emails are allowed" });
      }
      // Check if email already registered
      const existing = await storage.getUserByEmail(email.toLowerCase());
      if (existing) {
        return res.status(400).json({ error: "An account with this email already exists" });
      }
      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min
      verificationCodes.set(email.toLowerCase(), { code, expiresAt });

      // Also persist to DB if available
      const pool = await getDbPool();
      if (pool) {
        try {
          await pool.query(
            "INSERT INTO email_verification_codes (email, code, expires_at, created_at) VALUES ($1, $2, $3, $4)",
            [email.toLowerCase(), code, expiresAt, new Date().toISOString()]
          );
        } catch (e) { /* in-memory fallback still works */ }
      }

      const sent = await sendVerificationEmail(email, code);
      if (!sent) {
        return res.status(500).json({ error: "Failed to send verification email. Try again." });
      }
      res.json({ ok: true, message: "Verification code sent" });
    } catch (err) {
      res.status(500).json({ error: "Failed to send verification code" });
    }
  });

  // Step 2: Verify code and create account
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, code, username, password, displayName, rememberMe, referralCode } = req.body;
      if (!email || !code || !username || !password || !displayName) {
        return res.status(400).json({ error: "All fields are required" });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      if (!email.toLowerCase().endsWith("@menloschool.org")) {
        return res.status(400).json({ error: "Only @menloschool.org emails are allowed" });
      }

      // Verify the code
      const stored = verificationCodes.get(email.toLowerCase());
      if (!stored || stored.code !== code) {
        return res.status(400).json({ error: "Invalid verification code" });
      }
      if (new Date(stored.expiresAt) < new Date()) {
        verificationCodes.delete(email.toLowerCase());
        return res.status(400).json({ error: "Verification code expired. Request a new one." });
      }
      verificationCodes.delete(email.toLowerCase());

      // Check for existing username or email
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already taken" });
      }
      const existingEmail = await storage.getUserByEmail(email.toLowerCase());
      if (existingEmail) {
        return res.status(400).json({ error: "An account with this email already exists" });
      }

      // Process referral
      let referrerUser: any = null;
      let bonusBalance = 1000; // default signup bonus
      if (referralCode) {
        const allUsers = await storage.getAllUsers();
        referrerUser = allUsers.find(u => u.referralCode === referralCode);
        if (referrerUser) {
          bonusBalance = 1200; // 1000 + 200 referral bonus
        }
      }

      // Generate unique referral code for new user
      const userRefCode = username.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) + "-" + randomBytes(3).toString("hex").toUpperCase();

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        displayName,
        email: email.toLowerCase(),
        referralCode: userRefCode,
        referredBy: referralCode || null,
        emailVerified: true,
        balance: bonusBalance,
      });

      // Create signup bonus transaction
      await storage.createTransaction({
        userId: user.id,
        type: "signup_bonus",
        amount: 1000,
        description: "Welcome bonus: 1,000 KC",
        createdAt: new Date().toISOString(),
      });

      // If referred, create bonus transactions
      if (referrerUser) {
        // New user gets extra 200 KC
        await storage.createTransaction({
          userId: user.id,
          type: "referral",
          amount: 200,
          description: `Referral bonus: invited by ${referrerUser.displayName}`,
          createdAt: new Date().toISOString(),
        });
        // Referrer gets 500 KC
        await storage.updateUserBalance(referrerUser.id, 500);
        await storage.createTransaction({
          userId: referrerUser.id,
          type: "referral",
          amount: 500,
          description: `Referral reward: ${displayName} joined using your link`,
          createdAt: new Date().toISOString(),
        });
      }

      await createSession(res, user.id, !!rememberMe);
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (err) {
      console.error("Registration error:", err);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password, rememberMe } = req.body;
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      // Support both bcrypt hashed and legacy plaintext passwords
      const isValidPassword = user.password.startsWith("$2")
        ? await bcrypt.compare(password, user.password)
        : user.password === password;
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      await createSession(res, user.id, !!rememberMe);
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (err) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Admin login (by email)
  app.post("/api/auth/admin-login", async (req, res) => {
    try {
      const { email, password, rememberMe } = req.body;
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      if (user.role !== "admin") {
        // Don't reveal that the account exists but isn't admin
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const isValidPassword = user.password.startsWith("$2")
        ? await bcrypt.compare(password, user.password)
        : user.password === password;
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      await createSession(res, user.id, !!rememberMe);
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (err) {
      res.status(500).json({ error: "Admin login failed" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    await destroySession(req, res);
    res.json({ ok: true });
  });

  app.get("/api/auth/me", async (req, res) => {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const user = await storage.getUser(userId);
    if (!user) {
      await destroySession(req, res);
      return res.status(401).json({ error: "User not found" });
    }
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });

  // ═══════════════════════════════════════════
  // REFERRAL ROUTES
  // ═══════════════════════════════════════════

  app.get("/api/referral", async (req, res) => {
    const userId = await getCurrentUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const user = await storage.getUser(userId);
    if (!user) return res.status(401).json({ error: "User not found" });

    // Generate referral code if user doesn't have one yet
    if (!user.referralCode) {
      const code = user.username.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) + "-" + randomBytes(3).toString("hex").toUpperCase();
      await storage.updateUserStats(user.id, { referralCode: code } as any);
      return res.json({ referralCode: code });
    }
    res.json({ referralCode: user.referralCode });
  });

  // ═══════════════════════════════════════════
  // PUBLIC MARKET ROUTES
  // ═══════════════════════════════════════════

  app.get("/api/markets", async (_req, res) => {
    const markets = await storage.getMarkets();
    res.json(markets);
  });

  app.get("/api/markets/featured", async (_req, res) => {
    const markets = await storage.getFeaturedMarkets();
    res.json(markets);
  });

  app.get("/api/markets/category/:category", async (req, res) => {
    const markets = await storage.getMarketsByCategory(req.params.category);
    res.json(markets);
  });

  app.get("/api/markets/:id", async (req, res) => {
    const market = await storage.getMarket(req.params.id);
    if (!market) {
      return res.status(404).json({ error: "Market not found" });
    }
    res.json(market);
  });

  // ═══════════════════════════════════════════
  // BETTING ROUTES
  // ═══════════════════════════════════════════

  app.post("/api/bets", async (req, res) => {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const { marketId, position, amount } = req.body;
      if (!marketId || !position || !amount) {
        return res.status(400).json({ error: "marketId, position, and amount are required" });
      }
      if (amount <= 0) {
        return res.status(400).json({ error: "Amount must be positive" });
      }

      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ error: "User not found" });
      if (user.balance < amount) {
        return res.status(400).json({ error: "Insufficient KnightCoin balance" });
      }

      const market = await storage.getMarket(marketId);
      if (!market) return res.status(404).json({ error: "Market not found" });
      if (market.resolved) return res.status(400).json({ error: "Market already resolved" });

      const price = position === "yes" ? market.yesPrice : market.noPrice;

      // Create the bet
      const bet = await storage.createBet({
        userId,
        marketId,
        position,
        amount,
        price,
        createdAt: new Date().toISOString(),
      });

      // Deduct balance
      await storage.updateUserBalance(userId, -amount);

      // Update user stats
      await storage.updateUserStats(userId, { totalBets: user.totalBets + 1 });

      // Move market price based on bet (simple LMSR-like movement)
      const impact = Math.min(amount / 1000, 0.05); // max 5% move per bet
      let newYesPrice: number;
      let newNoPrice: number;
      if (position === "yes") {
        newYesPrice = Math.min(0.95, market.yesPrice + impact);
        newNoPrice = Math.max(0.05, 1 - newYesPrice);
      } else {
        newNoPrice = Math.min(0.95, market.noPrice + impact);
        newYesPrice = Math.max(0.05, 1 - newNoPrice);
      }
      await storage.updateMarketPrice(marketId, newYesPrice, newNoPrice, amount);

      // Log transaction
      await storage.createTransaction({
        userId,
        type: "bet_placed",
        amount: -amount,
        description: `Bet ${amount} KC on "${position.toUpperCase()}" for "${market.title}"`,
        createdAt: new Date().toISOString(),
      });

      res.json(bet);
    } catch (err) {
      res.status(500).json({ error: "Failed to place bet" });
    }
  });

  app.get("/api/bets/user", async (req, res) => {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const bets = await storage.getBetsByUser(userId);
    res.json(bets);
  });

  // ═══════════════════════════════════════════
  // WALLET ROUTES
  // ═══════════════════════════════════════════

  app.get("/api/wallet/transactions", async (req, res) => {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const txs = await storage.getTransactionsByUser(userId);
    res.json(txs);
  });

  app.post("/api/wallet/daily-bonus", async (req, res) => {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const user = await storage.getUser(userId);
    if (!user) return res.status(401).json({ error: "User not found" });

    // Check 24-hour cooldown
    if (user.lastDailyBonus) {
      const lastClaim = new Date(user.lastDailyBonus).getTime();
      const now = Date.now();
      const hoursElapsed = (now - lastClaim) / (1000 * 60 * 60);
      if (hoursElapsed < 24) {
        const nextClaimAt = new Date(lastClaim + 24 * 60 * 60 * 1000).toISOString();
        return res.status(429).json({
          error: "Already claimed today",
          nextClaimAt,
          hoursRemaining: +(24 - hoursElapsed).toFixed(1),
        });
      }
    }

    const bonus = 100;
    await storage.updateUserBalance(userId, bonus);
    await storage.updateUserStats(userId, { lastDailyBonus: new Date().toISOString() });
    await storage.createTransaction({
      userId,
      type: "daily_bonus",
      amount: bonus,
      description: "Daily login bonus: 100 KC",
      createdAt: new Date().toISOString(),
    });
    const updated = await storage.getUser(userId);
    const { password: _, ...safeUser } = updated!;
    res.json(safeUser);
  });

  // ═══════════════════════════════════════════
  // LEADERBOARD
  // ═══════════════════════════════════════════

  app.get("/api/leaderboard", async (_req, res) => {
    const leaderboard = await storage.getLeaderboard();
    const safe = leaderboard.map(({ password: _, ...u }) => u);
    res.json(safe);
  });

  // ═══════════════════════════════════════════
  // ADMIN ROUTES (all require admin auth)
  // ═══════════════════════════════════════════

  // --- Admin Stats ---
  app.get("/api/admin/stats", requireAdmin, async (_req, res) => {
    const [allUsers, allMarkets, allBets, allTx] = await Promise.all([
      storage.getAllUsers(),
      storage.getMarkets(),
      storage.getAllBets(),
      storage.getAllTransactions(),
    ]);

    const activeMarkets = allMarkets.filter((m) => !m.resolved);
    const resolvedMarkets = allMarkets.filter((m) => m.resolved);
    const totalVolume = allMarkets.reduce((sum, m) => sum + m.volume, 0);
    const totalKCInCirculation = allUsers.reduce((sum, u) => sum + u.balance, 0);

    res.json({
      totalUsers: allUsers.length,
      totalMarkets: allMarkets.length,
      activeMarkets: activeMarkets.length,
      resolvedMarkets: resolvedMarkets.length,
      totalBets: allBets.length,
      totalVolume,
      totalKCInCirculation,
      totalTransactions: allTx.length,
    });
  });

  // --- Admin: All Users ---
  app.get("/api/admin/users", requireAdmin, async (_req, res) => {
    const users = await storage.getAllUsers();
    const safe = users.map(({ password: _, ...u }) => u);
    res.json(safe);
  });

  // --- Admin: Grant/deduct KC from a user ---
  app.post("/api/admin/users/:id/adjust-balance", requireAdmin, async (req, res) => {
    const { amount, reason } = req.body;
    if (typeof amount !== "number" || !reason) {
      return res.status(400).json({ error: "amount (number) and reason (string) required" });
    }
    const user = await storage.getUser(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    await storage.updateUserBalance(user.id, amount);
    await storage.createTransaction({
      userId: user.id,
      type: "admin_grant",
      amount,
      description: `Admin: ${reason}`,
      createdAt: new Date().toISOString(),
    });

    const updated = await storage.getUser(user.id);
    const { password: _, ...safeUser } = updated!;
    res.json(safeUser);
  });

  // --- Admin: All Markets ---
  app.get("/api/admin/markets", requireAdmin, async (_req, res) => {
    const markets = await storage.getMarkets();
    res.json(markets);
  });

  // --- Admin: Create Market ---
  app.post("/api/admin/markets", requireAdmin, async (req, res) => {
    try {
      const { title, description, category, subcategory, closesAt, icon, featured, resolutionSource, resolutionData, yesPrice, noPrice, marketType, options } = req.body;
      if (!title || !description || !category || !closesAt) {
        return res.status(400).json({ error: "title, description, category, and closesAt are required" });
      }
      const adminUser = (req as any).adminUser;
      const mType = marketType || "binary";

      // For multi-outcome / time-bracket markets, require options
      if ((mType === "multi_outcome" || mType === "time_bracket") && (!options || !Array.isArray(options) || options.length < 2)) {
        return res.status(400).json({ error: "Multi-outcome and time-bracket markets require at least 2 options" });
      }

      // Only allow featuring markets in approved categories
      const isFeaturedAllowed = FEATURED_ALLOWED_CATEGORIES.includes(category);

      const market = await storage.createMarket({
        title,
        description,
        category,
        subcategory: subcategory || null,
        marketType: mType,
        yesPrice: yesPrice || 0.5,
        noPrice: noPrice || 0.5,
        closesAt,
        createdAt: new Date().toISOString(),
        featured: featured && isFeaturedAllowed ? true : false,
        icon: icon || "📊",
        createdBy: adminUser.id,
        resolutionSource: resolutionSource || "manual",
        resolutionData: resolutionData ? JSON.stringify(resolutionData) : null,
      });

      // Create options for multi-outcome / time-bracket markets
      if (mType !== "binary" && options && Array.isArray(options)) {
        const equalPrice = +(1 / options.length).toFixed(4);
        for (let i = 0; i < options.length; i++) {
          await storage.createMarketOption({
            marketId: market.id,
            label: options[i].label || options[i],
            price: options[i].price || equalPrice,
            sortOrder: i,
          });
        }
      }

      res.json(market);
    } catch (err) {
      res.status(500).json({ error: "Failed to create market" });
    }
  });

  // --- Admin: Update Market ---
  app.patch("/api/admin/markets/:id", requireAdmin, async (req, res) => {
    const market = await storage.getMarket(req.params.id);
    if (!market) return res.status(404).json({ error: "Market not found" });

    const allowed = ["title", "description", "category", "subcategory", "closesAt", "icon", "featured", "resolutionSource", "resolutionData", "yesPrice", "noPrice", "marketType"];
    const updates: any = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === "resolutionData" && typeof req.body[key] === "object") {
          updates[key] = JSON.stringify(req.body[key]);
        } else {
          updates[key] = req.body[key];
        }
      }
    }
    // Enforce featured restriction by category
    if (updates.featured === true) {
      const effectiveCategory = updates.category || market.category;
      if (!FEATURED_ALLOWED_CATEGORIES.includes(effectiveCategory)) {
        updates.featured = false;
      }
    }

    const updated = await storage.updateMarket(req.params.id, updates);
    res.json(updated);
  });

  // --- Admin: Delete Market ---
  app.delete("/api/admin/markets/:id", requireAdmin, async (req, res) => {
    const market = await storage.getMarket(req.params.id);
    if (!market) return res.status(404).json({ error: "Market not found" });
    
    // Refund all unsettled bets before deleting
    const unsettled = await storage.getUnsettledBetsByMarket(req.params.id);
    for (const bet of unsettled) {
      await storage.updateUserBalance(bet.userId, bet.amount);
      await storage.settleBet(bet.id, bet.amount); // refund = payout equals amount
      await storage.createTransaction({
        userId: bet.userId,
        type: "admin_grant",
        amount: bet.amount,
        description: `Refund: market "${market.title}" was deleted by admin`,
        createdAt: new Date().toISOString(),
      });
    }
    
    await storage.deleteMarket(req.params.id);
    res.json({ ok: true, refundedBets: unsettled.length });
  });

  // --- Admin: Resolve Market ---
  app.post("/api/admin/markets/:id/resolve", requireAdmin, async (req, res) => {
    const { outcome } = req.body;
    if (typeof outcome !== "boolean") {
      return res.status(400).json({ error: "outcome (boolean) is required" });
    }
    
    const market = await storage.getMarket(req.params.id);
    if (!market) return res.status(404).json({ error: "Market not found" });
    if (market.resolved) return res.status(400).json({ error: "Market already resolved" });

    const adminUser = (req as any).adminUser;
    await storage.resolveMarket(req.params.id, outcome, adminUser.id);
    
    // Run payout engine
    const settledCount = await settleMarketBets(req.params.id, outcome);
    
    const updated = await storage.getMarket(req.params.id);
    res.json({ market: updated, settledBets: settledCount });
  });

  // --- Admin: Unresolve Market (revert) ---
  app.post("/api/admin/markets/:id/unresolve", requireAdmin, async (req, res) => {
    const market = await storage.getMarket(req.params.id);
    if (!market) return res.status(404).json({ error: "Market not found" });
    if (!market.resolved) return res.status(400).json({ error: "Market is not resolved" });

    // Revert the market resolution
    await storage.updateMarket(req.params.id, {
      resolved: false,
      outcome: null,
      resolvedAt: null,
      resolvedBy: null,
    });

    const updated = await storage.getMarket(req.params.id);
    res.json(updated);
  });

  // --- Admin: All Bets ---
  app.get("/api/admin/bets", requireAdmin, async (_req, res) => {
    const bets = await storage.getAllBets();
    res.json(bets);
  });

  // --- Admin: Recent Transactions ---
  app.get("/api/admin/transactions", requireAdmin, async (_req, res) => {
    const txs = await storage.getAllTransactions();
    res.json(txs.slice(0, 100));
  });

  // --- Admin: Bulk Grant KC ---
  app.post("/api/admin/bulk-grant", requireAdmin, async (req, res) => {
    const { amount, reason } = req.body;
    if (typeof amount !== "number" || !reason) {
      return res.status(400).json({ error: "amount and reason required" });
    }
    const users = await storage.getAllUsers();
    let count = 0;
    for (const user of users) {
      if (user.role !== "admin") {
        await storage.updateUserBalance(user.id, amount);
        await storage.createTransaction({
          userId: user.id,
          type: "admin_grant",
          amount,
          description: `Admin grant: ${reason}`,
          createdAt: new Date().toISOString(),
        });
        count++;
      }
    }
    res.json({ ok: true, usersAffected: count });
  });

  // ═══════════════════════════════════════════
  // MARKET OPTIONS ROUTES
  // ═══════════════════════════════════════════

  app.get("/api/markets/:id/options", async (req, res) => {
    const market = await storage.getMarket(req.params.id);
    if (!market) return res.status(404).json({ error: "Market not found" });
    const options = await storage.getMarketOptions(req.params.id);
    res.json(options);
  });

  // ═══════════════════════════════════════════
  // MULTI-OUTCOME BETTING
  // ═══════════════════════════════════════════

  app.post("/api/bets/multi", async (req, res) => {
    const userId = await getCurrentUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    try {
      const { marketId, optionId, amount } = req.body;
      if (!marketId || !optionId || !amount) {
        return res.status(400).json({ error: "marketId, optionId, and amount are required" });
      }
      if (amount <= 0) return res.status(400).json({ error: "Amount must be positive" });

      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ error: "User not found" });
      if (user.balance < amount) {
        return res.status(400).json({ error: "Insufficient KnightCoin balance" });
      }

      const market = await storage.getMarket(marketId);
      if (!market) return res.status(404).json({ error: "Market not found" });
      if (market.resolved) return res.status(400).json({ error: "Market already resolved" });

      const option = await storage.getMarketOption(optionId);
      if (!option || option.marketId !== marketId) {
        return res.status(400).json({ error: "Invalid option for this market" });
      }

      // Create the bet — position stores the optionId
      const bet = await storage.createBet({
        userId,
        marketId,
        position: optionId,
        amount,
        price: option.price,
        createdAt: new Date().toISOString(),
      });

      // Deduct balance
      await storage.updateUserBalance(userId, -amount);
      await storage.updateUserStats(userId, { totalBets: user.totalBets + 1 });

      // Update option prices — selected goes up, others go down proportionally
      const allOptions = await storage.getMarketOptions(marketId);
      const impact = Math.min(amount / 1000, 0.05);
      const selectedIdx = allOptions.findIndex((o) => o.id === optionId);
      if (selectedIdx >= 0) {
        const newPrice = Math.min(0.95, allOptions[selectedIdx].price + impact);
        const remaining = 1 - newPrice;
        const othersTotal = allOptions.reduce((s, o, i) => i === selectedIdx ? s : s + o.price, 0);
        for (let i = 0; i < allOptions.length; i++) {
          if (i === selectedIdx) {
            await storage.updateMarketOption(allOptions[i].id, { price: +newPrice.toFixed(4) });
          } else {
            const ratio = othersTotal > 0 ? allOptions[i].price / othersTotal : 1 / (allOptions.length - 1);
            const adjusted = Math.max(0.01, +(remaining * ratio).toFixed(4));
            await storage.updateMarketOption(allOptions[i].id, { price: adjusted });
          }
        }
      }

      // Update market volume/totalBets
      await storage.updateMarketPrice(marketId, market.yesPrice, market.noPrice, amount);

      await storage.createTransaction({
        userId,
        type: "bet_placed",
        amount: -amount,
        description: `Bet ${amount} KC on "${option.label}" for "${market.title}"`,
        createdAt: new Date().toISOString(),
      });

      res.json(bet);
    } catch (err) {
      res.status(500).json({ error: "Failed to place bet" });
    }
  });

  // ═══════════════════════════════════════════
  // ADMIN: RESOLVE MULTI-OUTCOME MARKET
  // ═══════════════════════════════════════════

  app.post("/api/admin/markets/:id/resolve-option", requireAdmin, async (req, res) => {
    const { winnerOptionId } = req.body;
    if (!winnerOptionId) {
      return res.status(400).json({ error: "winnerOptionId is required" });
    }

    const market = await storage.getMarket(req.params.id);
    if (!market) return res.status(404).json({ error: "Market not found" });
    if (market.resolved) return res.status(400).json({ error: "Market already resolved" });

    const options = await storage.getMarketOptions(req.params.id);
    const winner = options.find((o) => o.id === winnerOptionId);
    if (!winner) return res.status(400).json({ error: "Invalid winner option" });

    const adminUser = (req as any).adminUser;

    // Mark all options resolved, winner flagged
    for (const opt of options) {
      await storage.updateMarketOption(opt.id, {
        resolved: true,
        isWinner: opt.id === winnerOptionId,
      });
    }

    // Mark market resolved (outcome = true just means resolved)
    await storage.resolveMarket(req.params.id, true, adminUser.id);

    // Settle bets — position stores optionId for multi-outcome bets
    const unsettledBets = await storage.getUnsettledBetsByMarket(req.params.id);
    for (const bet of unsettledBets) {
      const won = bet.position === winnerOptionId;
      if (won) {
        const payout = bet.amount / bet.price;
        await storage.settleBet(bet.id, payout);
        await storage.updateUserBalance(bet.userId, payout);
        const betUser = await storage.getUser(bet.userId);
        if (betUser) {
          await storage.updateUserStats(bet.userId, {
            totalWinnings: betUser.totalWinnings + payout,
            correctPredictions: betUser.correctPredictions + 1,
          });
        }
        await storage.createTransaction({
          userId: bet.userId,
          type: "payout",
          amount: payout,
          description: `Won ${payout.toFixed(1)} KC on "${winner.label}" bet`,
          createdAt: new Date().toISOString(),
        });
      } else {
        await storage.settleBet(bet.id, 0);
        await storage.createTransaction({
          userId: bet.userId,
          type: "bet_lost",
          amount: 0,
          description: `Lost ${bet.amount.toFixed(1)} KC — "${winner.label}" won`,
          createdAt: new Date().toISOString(),
        });
      }
    }

    const updated = await storage.getMarket(req.params.id);
    res.json({ market: updated, settledBets: unsettledBets.length });
  });

  // ═══════════════════════════════════════════
  // MARKET REQUEST ROUTES
  // ═══════════════════════════════════════════

  // User creates a market request
  app.post("/api/market-requests", async (req, res) => {
    const userId = await getCurrentUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    try {
      const { title, description, category } = req.body;
      if (!title || !description || !category) {
        return res.status(400).json({ error: "title, description, and category are required" });
      }
      const mr = await storage.createMarketRequest({
        userId,
        title,
        description,
        category,
        createdAt: new Date().toISOString(),
      });
      res.json(mr);
    } catch (err) {
      res.status(500).json({ error: "Failed to create market request" });
    }
  });

  // User gets their own requests
  app.get("/api/market-requests/mine", async (req, res) => {
    const userId = await getCurrentUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const requests = await storage.getMarketRequestsByUser(userId);
    res.json(requests);
  });

  // Admin: get all market requests
  app.get("/api/admin/market-requests", requireAdmin, async (_req, res) => {
    const requests = await storage.getAllMarketRequests();
    res.json(requests);
  });

  // Admin: approve request — also creates the market automatically
  app.post("/api/admin/market-requests/:id/approve", requireAdmin, async (req, res) => {
    const adminUser = (req as any).adminUser;
    const { adminNote, closesAt, icon, featured } = req.body;
    
    // Get the request first
    const allRequests = await storage.getAllMarketRequests();
    const marketReq = allRequests.find(r => r.id === req.params.id);
    if (!marketReq) return res.status(404).json({ error: "Request not found" });
    if (marketReq.status !== "pending") return res.status(400).json({ error: "Request already reviewed" });

    // Update request status
    const updated = await storage.updateMarketRequest(req.params.id, {
      status: "approved",
      adminNote: adminNote || null,
      reviewedAt: new Date().toISOString(),
      reviewedBy: adminUser.id,
    });

    // Auto-create market from the request
    const defaultCloses = closesAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days default
    const market = await storage.createMarket({
      title: marketReq.title,
      description: marketReq.description,
      category: marketReq.category,
      subcategory: null,
      marketType: "binary",
      yesPrice: 0.5,
      noPrice: 0.5,
      closesAt: defaultCloses,
      createdAt: new Date().toISOString(),
      featured: featured || false,
      icon: icon || "📊",
      createdBy: adminUser.id,
      resolutionSource: "manual",
      resolutionData: null,
    });

    res.json({ request: updated, market });
  });

  // Admin: reject request
  app.post("/api/admin/market-requests/:id/reject", requireAdmin, async (req, res) => {
    const adminUser = (req as any).adminUser;
    const { adminNote } = req.body;
    const updated = await storage.updateMarketRequest(req.params.id, {
      status: "rejected",
      adminNote: adminNote || null,
      reviewedAt: new Date().toISOString(),
      reviewedBy: adminUser.id,
    });
    if (!updated) return res.status(404).json({ error: "Request not found" });
    res.json(updated);
  });

  // ═══════════════════════════════════════════
  // BLOCKCHAIN / WALLET ROUTES
  // ═══════════════════════════════════════════

  // Initialize blockchain connection on server start
  initBlockchain();

  // Get blockchain config (contract address, chain info)
  app.get("/api/blockchain/config", async (_req, res) => {
    res.json(getBlockchainConfig());
  });

  // Link a MetaMask wallet to the current user's account
  app.post("/api/wallet/link", async (req, res) => {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const { walletAddress } = req.body;
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: "Invalid Ethereum wallet address" });
    }

    // Check if wallet is already linked to another account
    const existing = await storage.getUserByWallet(walletAddress);
    if (existing && existing.id !== userId) {
      return res.status(400).json({ error: "This wallet is already linked to another account" });
    }

    await storage.linkWallet(userId, walletAddress);
    const user = await storage.getUser(userId);
    const { password: _, ...safeUser } = user!;
    res.json(safeUser);
  });

  // Unlink wallet from current user
  app.post("/api/wallet/unlink", async (req, res) => {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    await storage.unlinkWallet(userId);
    const user = await storage.getUser(userId);
    const { password: _, ...safeUser } = user!;
    res.json(safeUser);
  });

  // Get on-chain KC balance for the current user's linked wallet
  app.get("/api/wallet/onchain-balance", async (req, res) => {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const user = await storage.getUser(userId);
    if (!user?.walletAddress) {
      return res.json({ balance: 0, walletLinked: false });
    }

    if (!isBlockchainEnabled()) {
      return res.json({ balance: 0, walletLinked: true, blockchainEnabled: false });
    }

    const balance = await getOnChainBalance(user.walletAddress);
    res.json({ balance, walletLinked: true, blockchainEnabled: true });
  });

  // Deposit: user sends KC on-chain, we verify and credit their off-chain balance
  app.post("/api/wallet/deposit", async (req, res) => {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const { txHash, amount } = req.body;
    if (!txHash || typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "txHash and positive amount required" });
    }

    if (!isBlockchainEnabled()) {
      return res.status(400).json({ error: "Blockchain features not configured" });
    }

    // Verify the transaction on-chain
    const verified = await verifyTransaction(txHash);
    if (!verified) {
      return res.status(400).json({ error: "Transaction not found or not confirmed" });
    }

    // Credit the user's off-chain balance
    await storage.updateUserBalance(userId, amount);
    await storage.createTransaction({
      userId,
      type: "deposit",
      amount,
      description: `Deposited ${amount} KC from wallet`,
      txHash,
      createdAt: new Date().toISOString(),
    });

    const user = await storage.getUser(userId);
    const { password: _, ...safeUser } = user!;
    res.json(safeUser);
  });

  // Withdrawal: deduct off-chain balance (on-chain transfer happens in browser via MetaMask)
  app.post("/api/wallet/withdraw", async (req, res) => {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const { amount, txHash } = req.body;
    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "Positive amount required" });
    }

    const user = await storage.getUser(userId);
    if (!user) return res.status(401).json({ error: "User not found" });
    if (!user.walletAddress) return res.status(400).json({ error: "No wallet linked" });
    if (user.balance < amount) {
      return res.status(400).json({ error: "Insufficient off-chain balance" });
    }

    // Deduct off-chain balance
    await storage.updateUserBalance(userId, -amount);
    await storage.createTransaction({
      userId,
      type: "withdrawal",
      amount: -amount,
      description: `Withdrew ${amount} KC to wallet`,
      txHash: txHash || null,
      createdAt: new Date().toISOString(),
    });

    const updated = await storage.getUser(userId);
    const { password: _, ...safeUser } = updated!;
    res.json(safeUser);
  });

  return httpServer;
}
