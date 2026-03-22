import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  email: text("email"),
  walletAddress: text("wallet_address"), // Ethereum wallet (0x...) — null if not linked
  role: text("role").notNull().default("user"), // 'user' or 'admin'
  balance: real("balance").notNull().default(1000),
  totalWinnings: real("total_winnings").notNull().default(0),
  totalBets: integer("total_bets").notNull().default(0),
  correctPredictions: integer("correct_predictions").notNull().default(0),
  lastDailyBonus: text("last_daily_bonus"), // ISO timestamp of last daily claim
  referralCode: text("referral_code").unique(), // unique code for referring others
  referredBy: text("referred_by"), // referral code of the user who referred this user
  emailVerified: boolean("email_verified").notNull().default(false),
  createdAt: text("created_at"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Markets table
export const markets = pgTable("markets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // 'sports', 'academic', 'social', 'campus', 'politics', 'pro-sports', 'tech', 'crypto'
  subcategory: text("subcategory"),
  marketType: text("market_type").notNull().default("binary"), // 'binary', 'multi_outcome', 'time_bracket'
  yesPrice: real("yes_price").notNull().default(0.5),
  noPrice: real("no_price").notNull().default(0.5),
  volume: real("volume").notNull().default(0),
  totalBets: integer("total_bets").notNull().default(0),
  resolved: boolean("resolved").notNull().default(false),
  outcome: boolean("outcome"), // true = yes, false = no, null = unresolved
  closesAt: text("closes_at").notNull(),
  createdAt: text("created_at").notNull(),
  featured: boolean("featured").notNull().default(false),
  icon: text("icon"), // emoji for the market
  createdBy: text("created_by"), // admin user id who created
  resolutionSource: text("resolution_source"), // 'manual', 'api_stock', 'api_crypto', 'api_sports', 'api_news'
  resolutionData: text("resolution_data"), // JSON string with API config (e.g. ticker symbol, team id, etc.)
  resolvedAt: text("resolved_at"),
  resolvedBy: text("resolved_by"), // admin user id who resolved
  exclusiveMulti: boolean("exclusive_multi").notNull().default(true), // true = only one option can win (mutually exclusive), false = multiple options can resolve YES
  suggestedBy: text("suggested_by"), // display name of the user who suggested this market (null if not suggested or user opted out)
  lmsrB: real("lmsr_b").default(100), // LMSR liquidity parameter (only for exclusive multi markets)
});

export const insertMarketSchema = createInsertSchema(markets).omit({
  id: true,
  volume: true,
  totalBets: true,
  resolved: true,
  outcome: true,
  resolvedAt: true,
  resolvedBy: true,
});

export type InsertMarket = z.infer<typeof insertMarketSchema>;
export type Market = typeof markets.$inferSelect;

// Bets table
export const bets = pgTable("bets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  marketId: varchar("market_id").notNull(),
  position: text("position").notNull(), // 'yes' or 'no'
  amount: real("amount").notNull(),
  price: real("price").notNull(), // price at time of bet
  createdAt: text("created_at").notNull(),
  settled: boolean("settled").notNull().default(false),
  payout: real("payout"),
});

export const insertBetSchema = createInsertSchema(bets).omit({
  id: true,
  settled: true,
  payout: true,
});

export type InsertBet = z.infer<typeof insertBetSchema>;
export type Bet = typeof bets.$inferSelect;

// Transactions table (for KnightCoin ledger)
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(), // 'signup_bonus', 'bet_placed', 'bet_won', 'bet_lost', 'daily_bonus', 'referral', 'admin_grant', 'payout', 'deposit', 'withdrawal'
  txHash: text("tx_hash"), // Sepolia transaction hash (for on-chain deposits/withdrawals)
  amount: real("amount").notNull(),
  description: text("description").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// Market Requests table (user-submitted market ideas)
export const marketRequests = pgTable("market_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected'
  adminNote: text("admin_note"),
  createdAt: text("created_at").notNull(),
  reviewedAt: text("reviewed_at"),
  reviewedBy: text("reviewed_by"),
  showName: boolean("show_name").notNull().default(false), // user opt-in to show their name on the market
});

export const insertMarketRequestSchema = createInsertSchema(marketRequests).omit({
  id: true,
  status: true,
  adminNote: true,
  reviewedAt: true,
  reviewedBy: true,
});

export type InsertMarketRequest = z.infer<typeof insertMarketRequestSchema>;
export type MarketRequest = typeof marketRequests.$inferSelect;

// Market Options table (for multi-outcome and time-bracket markets)
export const marketOptions = pgTable("market_options", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  marketId: varchar("market_id").notNull(),
  label: text("label").notNull(),
  price: real("price").notNull().default(0.5),
  resolved: boolean("resolved").notNull().default(false),
  isWinner: boolean("is_winner").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  qValue: real("q_value").notNull().default(0), // LMSR state variable for this outcome
});

export const insertMarketOptionSchema = createInsertSchema(marketOptions).omit({
  id: true,
  resolved: true,
  isWinner: true,
});

export type InsertMarketOption = z.infer<typeof insertMarketOptionSchema>;
export type MarketOption = typeof marketOptions.$inferSelect;

// Chat Messages table (per-market chat)
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  marketId: varchar("market_id").notNull(),
  userId: varchar("user_id").notNull(),
  displayName: text("display_name").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// Mailbox Messages table (admin → user notifications)
export const mailboxMessages = pgTable("mailbox_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recipientId: varchar("recipient_id").notNull(), // user id, or '__all__' for broadcast
  senderId: varchar("sender_id").notNull(), // admin user id or '__system__'
  senderName: text("sender_name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  read: boolean("read").notNull().default(false),
  deletedAt: text("deleted_at"), // ISO timestamp when user soft-deleted; null = inbox; auto-purged after 3 days
  createdAt: text("created_at").notNull(),
});

export const insertMailboxMessageSchema = createInsertSchema(mailboxMessages).omit({
  id: true,
  read: true,
});

export type InsertMailboxMessage = z.infer<typeof insertMailboxMessageSchema>;
export type MailboxMessage = typeof mailboxMessages.$inferSelect;
