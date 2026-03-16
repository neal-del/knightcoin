import { eq, desc, and, or, sql, gt } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  markets,
  bets,
  transactions,
  marketRequests,
  marketOptions,
  type User,
  type InsertUser,
  type Market,
  type InsertMarket,
  type Bet,
  type InsertBet,
  type Transaction,
  type InsertTransaction,
  type MarketRequest,
  type InsertMarketRequest,
  type MarketOption,
  type InsertMarketOption,
} from "@shared/schema";
import type { IStorage } from "./storage";

function getDb() {
  if (!db) throw new Error("Database not initialized");
  return db;
}

export class PgStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await getDb().select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await getDb()
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await getDb()
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user;
  }

  async getUserByWallet(walletAddress: string): Promise<User | undefined> {
    const addr = walletAddress.toLowerCase();
    const [user] = await getDb()
      .select()
      .from(users)
      .where(sql`lower(${users.walletAddress}) = ${addr}`);
    return user;
  }

  async createUser(
    insertUser: InsertUser & { email?: string; role?: string },
  ): Promise<User> {
    const [user] = await getDb()
      .insert(users)
      .values({
        username: insertUser.username,
        password: insertUser.password,
        displayName: insertUser.displayName,
        email: insertUser.email || null,
        role: insertUser.role || "user",
        balance: 1000,
        totalWinnings: 0,
        totalBets: 0,
        correctPredictions: 0,
        lastDailyBonus: null,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return user;
  }

  async updateUserBalance(id: string, amount: number): Promise<void> {
    await getDb()
      .update(users)
      .set({ balance: sql`balance + ${amount}` })
      .where(eq(users.id, id));
  }

  async updateUserStats(id: string, updates: Partial<User>): Promise<void> {
    await getDb().update(users).set(updates).where(eq(users.id, id));
  }

  async linkWallet(userId: string, walletAddress: string): Promise<void> {
    await getDb()
      .update(users)
      .set({ walletAddress: walletAddress.toLowerCase() })
      .where(eq(users.id, userId));
  }

  async unlinkWallet(userId: string): Promise<void> {
    await getDb()
      .update(users)
      .set({ walletAddress: null })
      .where(eq(users.id, userId));
  }

  async getLeaderboard(): Promise<User[]> {
    return getDb()
      .select()
      .from(users)
      .where(or(gt(users.totalBets, 0), eq(users.role, "admin")))
      .orderBy(desc(users.balance))
      .limit(20);
  }

  async getAllUsers(): Promise<User[]> {
    return getDb().select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserCount(): Promise<number> {
    const [result] = await getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(users);
    return result.count;
  }

  // Markets
  async getMarkets(): Promise<Market[]> {
    return getDb().select().from(markets).orderBy(desc(markets.volume));
  }

  async getMarket(id: string): Promise<Market | undefined> {
    const [market] = await getDb()
      .select()
      .from(markets)
      .where(eq(markets.id, id));
    return market;
  }

  async getMarketsByCategory(category: string): Promise<Market[]> {
    return getDb()
      .select()
      .from(markets)
      .where(eq(markets.category, category))
      .orderBy(desc(markets.volume));
  }

  async getFeaturedMarkets(): Promise<Market[]> {
    return getDb()
      .select()
      .from(markets)
      .where(and(eq(markets.featured, true), eq(markets.resolved, false)))
      .orderBy(desc(markets.volume));
  }

  async createMarket(insertMarket: InsertMarket): Promise<Market> {
    const [market] = await getDb()
      .insert(markets)
      .values({
        ...insertMarket,
        volume: 0,
        totalBets: 0,
        resolved: false,
        outcome: null,
        resolvedAt: null,
        resolvedBy: null,
      })
      .returning();
    return market;
  }

  async updateMarket(
    id: string,
    updates: Partial<Market>,
  ): Promise<Market | undefined> {
    const [market] = await getDb()
      .update(markets)
      .set(updates)
      .where(eq(markets.id, id))
      .returning();
    return market;
  }

  async deleteMarket(id: string): Promise<boolean> {
    const result = await getDb()
      .delete(markets)
      .where(eq(markets.id, id))
      .returning();
    return result.length > 0;
  }

  async updateMarketPrice(
    id: string,
    yesPrice: number,
    noPrice: number,
    volumeAdd: number,
  ): Promise<void> {
    await getDb()
      .update(markets)
      .set({
        yesPrice,
        noPrice,
        volume: sql`volume + ${volumeAdd}`,
        totalBets: sql`total_bets + 1`,
      })
      .where(eq(markets.id, id));
  }

  async resolveMarket(
    id: string,
    outcome: boolean,
    resolvedBy?: string,
  ): Promise<void> {
    await getDb()
      .update(markets)
      .set({
        resolved: true,
        outcome,
        resolvedAt: new Date().toISOString(),
        resolvedBy: resolvedBy || null,
      })
      .where(eq(markets.id, id));
  }

  async getActiveMarkets(): Promise<Market[]> {
    return getDb()
      .select()
      .from(markets)
      .where(eq(markets.resolved, false))
      .orderBy(desc(markets.volume));
  }

  async getResolvedMarkets(): Promise<Market[]> {
    return getDb()
      .select()
      .from(markets)
      .where(eq(markets.resolved, true))
      .orderBy(desc(markets.resolvedAt));
  }

  // Bets
  async getBetsByUser(userId: string): Promise<Bet[]> {
    return getDb()
      .select()
      .from(bets)
      .where(eq(bets.userId, userId))
      .orderBy(desc(bets.createdAt));
  }

  async getBetsByMarket(marketId: string): Promise<Bet[]> {
    return getDb()
      .select()
      .from(bets)
      .where(eq(bets.marketId, marketId));
  }

  async createBet(insertBet: InsertBet): Promise<Bet> {
    const [bet] = await getDb()
      .insert(bets)
      .values({
        ...insertBet,
        settled: false,
        payout: null,
      })
      .returning();
    return bet;
  }

  async settleBet(id: string, payout: number): Promise<void> {
    await getDb()
      .update(bets)
      .set({ settled: true, payout })
      .where(eq(bets.id, id));
  }

  async getUnsettledBetsByMarket(marketId: string): Promise<Bet[]> {
    return getDb()
      .select()
      .from(bets)
      .where(and(eq(bets.marketId, marketId), eq(bets.settled, false)));
  }

  async getAllBets(): Promise<Bet[]> {
    return getDb().select().from(bets).orderBy(desc(bets.createdAt));
  }

  // Transactions
  async getTransactionsByUser(userId: string): Promise<Transaction[]> {
    return getDb()
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
  }

  async createTransaction(insertTx: InsertTransaction): Promise<Transaction> {
    const [tx] = await getDb()
      .insert(transactions)
      .values(insertTx)
      .returning();
    return tx;
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return getDb()
      .select()
      .from(transactions)
      .orderBy(desc(transactions.createdAt));
  }

  // Market Requests
  async createMarketRequest(req: InsertMarketRequest): Promise<MarketRequest> {
    const [mr] = await getDb()
      .insert(marketRequests)
      .values({
        ...req,
        status: "pending",
        adminNote: null,
        reviewedAt: null,
        reviewedBy: null,
      })
      .returning();
    return mr;
  }

  async getMarketRequestsByUser(userId: string): Promise<MarketRequest[]> {
    return getDb()
      .select()
      .from(marketRequests)
      .where(eq(marketRequests.userId, userId))
      .orderBy(desc(marketRequests.createdAt));
  }

  async getAllMarketRequests(): Promise<MarketRequest[]> {
    return getDb()
      .select()
      .from(marketRequests)
      .orderBy(desc(marketRequests.createdAt));
  }

  async updateMarketRequest(
    id: string,
    updates: Partial<MarketRequest>,
  ): Promise<MarketRequest | undefined> {
    const [mr] = await getDb()
      .update(marketRequests)
      .set(updates)
      .where(eq(marketRequests.id, id))
      .returning();
    return mr;
  }

  // Market Options
  async getMarketOptions(marketId: string): Promise<MarketOption[]> {
    return getDb()
      .select()
      .from(marketOptions)
      .where(eq(marketOptions.marketId, marketId))
      .orderBy(marketOptions.sortOrder);
  }

  async getMarketOption(id: string): Promise<MarketOption | undefined> {
    const [opt] = await getDb()
      .select()
      .from(marketOptions)
      .where(eq(marketOptions.id, id));
    return opt;
  }

  async createMarketOption(opt: InsertMarketOption): Promise<MarketOption> {
    const [option] = await getDb()
      .insert(marketOptions)
      .values({
        ...opt,
        resolved: false,
        isWinner: false,
      })
      .returning();
    return option;
  }

  async updateMarketOption(
    id: string,
    updates: Partial<MarketOption>,
  ): Promise<MarketOption | undefined> {
    const [opt] = await getDb()
      .update(marketOptions)
      .set(updates)
      .where(eq(marketOptions.id, id))
      .returning();
    return opt;
  }

  async deleteMarketOptions(marketId: string): Promise<void> {
    await getDb()
      .delete(marketOptions)
      .where(eq(marketOptions.marketId, marketId));
  }
}
