import {
  type User, type InsertUser,
  type Market, type InsertMarket,
  type Bet, type InsertBet,
  type Transaction, type InsertTransaction,
  type MarketRequest, type InsertMarketRequest,
  type MarketOption, type InsertMarketOption,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByWallet(walletAddress: string): Promise<User | undefined>;
  createUser(user: InsertUser & { email?: string; role?: string; referralCode?: string; referredBy?: string; emailVerified?: boolean; balance?: number }): Promise<User>;
  updateUserBalance(id: string, amount: number): Promise<void>;
  updateUserStats(id: string, updates: Partial<User>): Promise<void>;
  linkWallet(userId: string, walletAddress: string): Promise<void>;
  unlinkWallet(userId: string): Promise<void>;
  getLeaderboard(): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  getUserCount(): Promise<number>;
  
  // Markets
  getMarkets(): Promise<Market[]>;
  getMarket(id: string): Promise<Market | undefined>;
  getMarketsByCategory(category: string): Promise<Market[]>;
  getFeaturedMarkets(): Promise<Market[]>;
  createMarket(market: InsertMarket): Promise<Market>;
  updateMarket(id: string, updates: Partial<Market>): Promise<Market | undefined>;
  deleteMarket(id: string): Promise<boolean>;
  updateMarketPrice(id: string, yesPrice: number, noPrice: number, volumeAdd: number): Promise<void>;
  resolveMarket(id: string, outcome: boolean, resolvedBy?: string): Promise<void>;
  getActiveMarkets(): Promise<Market[]>;
  getResolvedMarkets(): Promise<Market[]>;
  
  // Bets
  getBetsByUser(userId: string): Promise<Bet[]>;
  getBetsByMarket(marketId: string): Promise<Bet[]>;
  createBet(bet: InsertBet): Promise<Bet>;
  settleBet(id: string, payout: number): Promise<void>;
  getUnsettledBetsByMarket(marketId: string): Promise<Bet[]>;
  getAllBets(): Promise<Bet[]>;
  
  // Transactions
  getTransactionsByUser(userId: string): Promise<Transaction[]>;
  createTransaction(tx: InsertTransaction): Promise<Transaction>;
  getAllTransactions(): Promise<Transaction[]>;

  // Market Requests
  createMarketRequest(req: InsertMarketRequest): Promise<MarketRequest>;
  getMarketRequestsByUser(userId: string): Promise<MarketRequest[]>;
  getAllMarketRequests(): Promise<MarketRequest[]>;
  updateMarketRequest(id: string, updates: Partial<MarketRequest>): Promise<MarketRequest | undefined>;

  // Market Options
  getMarketOptions(marketId: string): Promise<MarketOption[]>;
  getMarketOption(id: string): Promise<MarketOption | undefined>;
  createMarketOption(opt: InsertMarketOption): Promise<MarketOption>;
  updateMarketOption(id: string, updates: Partial<MarketOption>): Promise<MarketOption | undefined>;
  deleteMarketOptions(marketId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private markets: Map<string, Market>;
  private bets: Map<string, Bet>;
  private transactions: Map<string, Transaction>;
  private marketRequests: Map<string, MarketRequest>;
  private marketOptions: Map<string, MarketOption>;

  constructor() {
    this.users = new Map();
    this.markets = new Map();
    this.bets = new Map();
    this.transactions = new Map();
    this.marketRequests = new Map();
    this.marketOptions = new Map();
    this.seedData();
  }

  private seedData() {
    const now = new Date().toISOString();
    
    // Create admin user (Neal)
    const adminId = randomUUID();
    this.users.set(adminId, {
      id: adminId,
      username: "neal.goel",
      password: "knightcoin2026",
      displayName: "Neal Goel",
      email: "neal.goel@menloschool.org",
      walletAddress: null,
      role: "admin",
      balance: 10000,
      totalWinnings: 0,
      totalBets: 0,
      correctPredictions: 0,
      lastDailyBonus: null,
      referralCode: "NEAL-ADMIN",
      referredBy: null,
      emailVerified: true,
      createdAt: now,
    });

    // Create admin user (Allen)
    const allenId = randomUUID();
    this.users.set(allenId, {
      id: allenId,
      username: "allen.admin",
      password: "knightcoin2026",
      displayName: "Allen Wang",
      email: "allenwsf@gmail.com",
      walletAddress: null,
      role: "admin",
      balance: 10000,
      totalWinnings: 0,
      totalBets: 0,
      correctPredictions: 0,
      lastDailyBonus: null,
      referralCode: "ALLEN-ADMIN",
      referredBy: null,
      emailVerified: true,
      createdAt: now,
    });

    // Create demo user
    const demoId = randomUUID();
    this.users.set(demoId, {
      id: demoId,
      username: "knight",
      password: "menlo2026",
      displayName: "Demo Knight",
      email: null,
      walletAddress: null,
      role: "user",
      balance: 1000,
      totalWinnings: 0,
      totalBets: 0,
      correctPredictions: 0,
      lastDailyBonus: null,
      referralCode: "DEMO-KNIGHT",
      referredBy: null,
      emailVerified: true,
      createdAt: now,
    });

    // Seed sample markets (admin-curated, relevant to Menlo)
    const sampleMarkets: Omit<Market, "id">[] = [
      {
        title: "Will Menlo beat Sacred Heart in basketball this Friday?",
        description: "Menlo Knights vs Sacred Heart Prep — varsity basketball matchup. Market resolves YES if Menlo wins.",
        category: "sports",
        subcategory: "Basketball",
        marketType: "binary",
        yesPrice: 0.62,
        noPrice: 0.38,
        volume: 4520,
        totalBets: 38,
        resolved: false,
        outcome: null,
        closesAt: "2026-03-20T19:00:00Z",
        createdAt: now,
        featured: true,
        icon: "🏀",
        createdBy: adminId,
        resolutionSource: "manual",
        resolutionData: null,
        resolvedAt: null,
        resolvedBy: null,
      },
      {
        title: "Will Menlo's baseball team make CCS playoffs?",
        description: "Will the Menlo Knights baseball team qualify for the Central Coast Section playoffs this spring season?",
        category: "sports",
        subcategory: "Baseball",
        marketType: "binary",
        yesPrice: 0.71,
        noPrice: 0.29,
        volume: 2890,
        totalBets: 24,
        resolved: false,
        outcome: null,
        closesAt: "2026-05-15T23:59:00Z",
        createdAt: now,
        featured: false,
        icon: "⚾",
        createdBy: adminId,
        resolutionSource: "manual",
        resolutionData: null,
        resolvedAt: null,
        resolvedBy: null,
      },
      {
        title: "Will the AP Physics 2 class average be above 4?",
        description: "Based on the May 2026 AP Physics 2 exam, will the Menlo School average score be 4.0 or higher?",
        category: "academic",
        subcategory: "AP Exams",
        marketType: "binary",
        yesPrice: 0.35,
        noPrice: 0.65,
        volume: 1680,
        totalBets: 21,
        resolved: false,
        outcome: null,
        closesAt: "2026-07-01T00:00:00Z",
        createdAt: now,
        featured: false,
        icon: "⚛️",
        createdBy: adminId,
        resolutionSource: "manual",
        resolutionData: null,
        resolvedAt: null,
        resolvedBy: null,
      },
      {
        title: "Who wins the spring talent show — vocal or instrumental?",
        description: "Will the winner of the 2026 Menlo spring talent show be a vocal act (YES) or instrumental act (NO)?",
        category: "social",
        subcategory: "Talent Show",
        marketType: "binary",
        yesPrice: 0.55,
        noPrice: 0.45,
        volume: 1250,
        totalBets: 19,
        resolved: false,
        outcome: null,
        closesAt: "2026-04-10T23:59:00Z",
        createdAt: now,
        featured: false,
        icon: "🎤",
        createdBy: adminId,
        resolutionSource: "manual",
        resolutionData: null,
        resolvedAt: null,
        resolvedBy: null,
      },
      {
        title: "Will the new schedule proposal pass for next year?",
        description: "The admin has proposed a block schedule change for 2026-27. Will the final version be approved by the board?",
        category: "campus",
        subcategory: "Policy",
        marketType: "binary",
        yesPrice: 0.44,
        noPrice: 0.56,
        volume: 5100,
        totalBets: 52,
        resolved: false,
        outcome: null,
        closesAt: "2026-06-01T00:00:00Z",
        createdAt: now,
        featured: true,
        icon: "📋",
        createdBy: adminId,
        resolutionSource: "manual",
        resolutionData: null,
        resolvedAt: null,
        resolvedBy: null,
      },
      // Macro markets — with auto-resolution
      {
        title: "Will the Fed cut rates at the June 2026 meeting?",
        description: "Will the Federal Reserve announce a federal funds rate cut at the June 2026 FOMC meeting?",
        category: "politics",
        subcategory: "Federal Reserve",
        marketType: "binary",
        yesPrice: 0.67,
        noPrice: 0.33,
        volume: 18500,
        totalBets: 142,
        resolved: false,
        outcome: null,
        closesAt: "2026-06-17T18:00:00Z",
        createdAt: now,
        featured: false,
        icon: "🏛️",
        createdBy: adminId,
        resolutionSource: "api_news",
        resolutionData: JSON.stringify({ topic: "fed_rate_cut_june_2026" }),
        resolvedAt: null,
        resolvedBy: null,
      },
      {
        title: "Will Tesla stock close above $300 by end of Q2 2026?",
        description: "Will TSLA stock price close at or above $300 on the last trading day of Q2 2026 (June 30)?",
        category: "tech",
        subcategory: "Stocks",
        marketType: "binary",
        yesPrice: 0.52,
        noPrice: 0.48,
        volume: 12300,
        totalBets: 98,
        resolved: false,
        outcome: null,
        closesAt: "2026-06-30T20:00:00Z",
        createdAt: now,
        featured: false,
        icon: "📈",
        createdBy: adminId,
        resolutionSource: "api_stock",
        resolutionData: JSON.stringify({ ticker: "TSLA", targetPrice: 300, condition: "above" }),
        resolvedAt: null,
        resolvedBy: null,
      },
      {
        title: "Will the Warriors make the 2026 NBA playoffs?",
        description: "Will the Golden State Warriors qualify for the 2026 NBA Playoffs (play-in counts as YES)?",
        category: "pro-sports",
        subcategory: "NBA",
        marketType: "binary",
        yesPrice: 0.73,
        noPrice: 0.27,
        volume: 8900,
        totalBets: 76,
        resolved: false,
        outcome: null,
        closesAt: "2026-04-13T23:59:00Z",
        createdAt: now,
        featured: true,
        icon: "🏀",
        createdBy: adminId,
        resolutionSource: "api_sports",
        resolutionData: JSON.stringify({ league: "NBA", team: "Warriors", event: "playoffs_2026" }),
        resolvedAt: null,
        resolvedBy: null,
      },
      {
        title: "Will Bitcoin hit $150k before end of 2026?",
        description: "Will the price of Bitcoin (BTC/USD) reach $150,000 on any major exchange at any point during 2026?",
        category: "crypto",
        subcategory: "Bitcoin",
        marketType: "binary",
        yesPrice: 0.39,
        noPrice: 0.61,
        volume: 22100,
        totalBets: 167,
        resolved: false,
        outcome: null,
        closesAt: "2026-12-31T23:59:00Z",
        createdAt: now,
        featured: false,
        icon: "₿",
        createdBy: adminId,
        resolutionSource: "api_crypto",
        resolutionData: JSON.stringify({ symbol: "BTC", targetPrice: 150000, condition: "above" }),
        resolvedAt: null,
        resolvedBy: null,
      },
      {
        title: "Will OpenAI release GPT-5 before July 2026?",
        description: "Will OpenAI officially release (general availability, not limited preview) a model branded as GPT-5 before July 1, 2026?",
        category: "tech",
        subcategory: "AI",
        marketType: "binary",
        yesPrice: 0.43,
        noPrice: 0.57,
        volume: 15200,
        totalBets: 121,
        resolved: false,
        outcome: null,
        closesAt: "2026-07-01T00:00:00Z",
        createdAt: now,
        featured: false,
        icon: "🤖",
        createdBy: adminId,
        resolutionSource: "api_news",
        resolutionData: JSON.stringify({ topic: "openai_gpt5_release" }),
        resolvedAt: null,
        resolvedBy: null,
      },
      {
        title: "Will the 49ers win the NFC West in the 2026 season?",
        description: "Will the San Francisco 49ers finish first in the NFC West division for the 2026-27 NFL season?",
        category: "pro-sports",
        subcategory: "NFL",
        marketType: "binary",
        yesPrice: 0.31,
        noPrice: 0.69,
        volume: 7200,
        totalBets: 61,
        resolved: false,
        outcome: null,
        closesAt: "2027-01-10T23:59:00Z",
        createdAt: now,
        featured: false,
        icon: "🏈",
        createdBy: adminId,
        resolutionSource: "api_sports",
        resolutionData: JSON.stringify({ league: "NFL", team: "49ers", event: "nfc_west_2026" }),
        resolvedAt: null,
        resolvedBy: null,
      },
    ];

    sampleMarkets.forEach((m) => {
      const id = randomUUID();
      this.markets.set(id, { ...m, id } as Market);
    });
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.email === email);
  }

  async getUserByWallet(walletAddress: string): Promise<User | undefined> {
    const addr = walletAddress.toLowerCase();
    return Array.from(this.users.values()).find(
      (u) => u.walletAddress?.toLowerCase() === addr
    );
  }

  async createUser(insertUser: InsertUser & { email?: string; role?: string; referralCode?: string; referredBy?: string; emailVerified?: boolean; balance?: number }): Promise<User> {
    const id = randomUUID();
    const user: User = {
      id,
      username: insertUser.username,
      password: insertUser.password,
      displayName: insertUser.displayName,
      email: insertUser.email || null,
      walletAddress: null,
      role: insertUser.role || "user",
      balance: insertUser.balance ?? 1000,
      totalWinnings: 0,
      totalBets: 0,
      correctPredictions: 0,
      lastDailyBonus: null,
      referralCode: insertUser.referralCode || null,
      referredBy: insertUser.referredBy || null,
      emailVerified: insertUser.emailVerified ?? false,
      createdAt: new Date().toISOString(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserBalance(id: string, amount: number): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.balance += amount;
      this.users.set(id, user);
    }
  }

  async updateUserStats(id: string, updates: Partial<User>): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      Object.assign(user, updates);
      this.users.set(id, user);
    }
  }

  async linkWallet(userId: string, walletAddress: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.walletAddress = walletAddress.toLowerCase();
      this.users.set(userId, user);
    }
  }

  async unlinkWallet(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.walletAddress = null;
      this.users.set(userId, user);
    }
  }

  async getLeaderboard(): Promise<User[]> {
    return Array.from(this.users.values())
      .filter((u) => u.totalBets > 0 || u.role === "admin")
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 20);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values())
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }

  async getUserCount(): Promise<number> {
    return this.users.size;
  }

  // Markets
  async getMarkets(): Promise<Market[]> {
    return Array.from(this.markets.values()).sort(
      (a, b) => b.volume - a.volume
    );
  }

  async getMarket(id: string): Promise<Market | undefined> {
    return this.markets.get(id);
  }

  async getMarketsByCategory(category: string): Promise<Market[]> {
    return Array.from(this.markets.values())
      .filter((m) => m.category === category)
      .sort((a, b) => b.volume - a.volume);
  }

  async getFeaturedMarkets(): Promise<Market[]> {
    return Array.from(this.markets.values())
      .filter((m) => m.featured && !m.resolved)
      .sort((a, b) => b.volume - a.volume);
  }

  async createMarket(insertMarket: InsertMarket): Promise<Market> {
    const id = randomUUID();
    const market: Market = {
      id,
      ...insertMarket,
      volume: 0,
      totalBets: 0,
      resolved: false,
      outcome: null,
      resolvedAt: null,
      resolvedBy: null,
    };
    this.markets.set(id, market);
    return market;
  }

  async updateMarket(id: string, updates: Partial<Market>): Promise<Market | undefined> {
    const market = this.markets.get(id);
    if (market) {
      Object.assign(market, updates);
      this.markets.set(id, market);
      return market;
    }
    return undefined;
  }

  async deleteMarket(id: string): Promise<boolean> {
    return this.markets.delete(id);
  }

  async updateMarketPrice(id: string, yesPrice: number, noPrice: number, volumeAdd: number): Promise<void> {
    const market = this.markets.get(id);
    if (market) {
      market.yesPrice = yesPrice;
      market.noPrice = noPrice;
      market.volume += volumeAdd;
      market.totalBets += 1;
      this.markets.set(id, market);
    }
  }

  async resolveMarket(id: string, outcome: boolean, resolvedBy?: string): Promise<void> {
    const market = this.markets.get(id);
    if (market) {
      market.resolved = true;
      market.outcome = outcome;
      market.resolvedAt = new Date().toISOString();
      market.resolvedBy = resolvedBy || null;
      this.markets.set(id, market);
    }
  }

  async getActiveMarkets(): Promise<Market[]> {
    return Array.from(this.markets.values())
      .filter((m) => !m.resolved)
      .sort((a, b) => b.volume - a.volume);
  }

  async getResolvedMarkets(): Promise<Market[]> {
    return Array.from(this.markets.values())
      .filter((m) => m.resolved)
      .sort((a, b) => (b.resolvedAt || "").localeCompare(a.resolvedAt || ""));
  }

  // Bets
  async getBetsByUser(userId: string): Promise<Bet[]> {
    return Array.from(this.bets.values())
      .filter((b) => b.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getBetsByMarket(marketId: string): Promise<Bet[]> {
    return Array.from(this.bets.values()).filter(
      (b) => b.marketId === marketId
    );
  }

  async createBet(insertBet: InsertBet): Promise<Bet> {
    const id = randomUUID();
    const bet: Bet = {
      id,
      ...insertBet,
      settled: false,
      payout: null,
    };
    this.bets.set(id, bet);
    return bet;
  }

  async settleBet(id: string, payout: number): Promise<void> {
    const bet = this.bets.get(id);
    if (bet) {
      bet.settled = true;
      bet.payout = payout;
      this.bets.set(id, bet);
    }
  }

  async getUnsettledBetsByMarket(marketId: string): Promise<Bet[]> {
    return Array.from(this.bets.values()).filter(
      (b) => b.marketId === marketId && !b.settled
    );
  }

  async getAllBets(): Promise<Bet[]> {
    return Array.from(this.bets.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Transactions
  async getTransactionsByUser(userId: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter((t) => t.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createTransaction(insertTx: InsertTransaction): Promise<Transaction> {
    const id = randomUUID();
    const tx: Transaction = { id, ...insertTx };
    this.transactions.set(id, tx);
    return tx;
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Market Requests
  async createMarketRequest(req: InsertMarketRequest): Promise<MarketRequest> {
    const id = randomUUID();
    const mr: MarketRequest = {
      id,
      ...req,
      status: "pending",
      adminNote: null,
      reviewedAt: null,
      reviewedBy: null,
    };
    this.marketRequests.set(id, mr);
    return mr;
  }

  async getMarketRequestsByUser(userId: string): Promise<MarketRequest[]> {
    return Array.from(this.marketRequests.values())
      .filter((r) => r.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getAllMarketRequests(): Promise<MarketRequest[]> {
    return Array.from(this.marketRequests.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async updateMarketRequest(id: string, updates: Partial<MarketRequest>): Promise<MarketRequest | undefined> {
    const req = this.marketRequests.get(id);
    if (req) {
      Object.assign(req, updates);
      this.marketRequests.set(id, req);
      return req;
    }
    return undefined;
  }

  // Market Options
  async getMarketOptions(marketId: string): Promise<MarketOption[]> {
    return Array.from(this.marketOptions.values())
      .filter((o) => o.marketId === marketId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getMarketOption(id: string): Promise<MarketOption | undefined> {
    return this.marketOptions.get(id);
  }

  async createMarketOption(opt: InsertMarketOption): Promise<MarketOption> {
    const id = randomUUID();
    const option: MarketOption = {
      id,
      ...opt,
      resolved: false,
      isWinner: false,
    };
    this.marketOptions.set(id, option);
    return option;
  }

  async updateMarketOption(id: string, updates: Partial<MarketOption>): Promise<MarketOption | undefined> {
    const opt = this.marketOptions.get(id);
    if (opt) {
      Object.assign(opt, updates);
      this.marketOptions.set(id, opt);
      return opt;
    }
    return undefined;
  }

  async deleteMarketOptions(marketId: string): Promise<void> {
    for (const [id, opt] of this.marketOptions) {
      if (opt.marketId === marketId) {
        this.marketOptions.delete(id);
      }
    }
  }
}

import { PgStorage } from "./pg-storage";

const usePg = !!(process.env.DATABASE_PRIVATE_URL || process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL);
console.log(`[storage] Using ${usePg ? "PostgreSQL (PgStorage)" : "in-memory (MemStorage)"} storage`);

export const storage: IStorage = usePg ? new PgStorage() : new MemStorage();
