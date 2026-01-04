/**
 * Trading State Manager
 * 
 * In-memory state manager for the demo trading system.
 * Manages tokens, user balances, trade history, and price history.
 */

import {
  TokenType,
  TokenParams,
  getTokenParams,
  getCurrentPrice,
  calculateBuyCost,
  calculateSellRefund,
  calculateMarketCap,
  calculateCreatorAllocation,
  generatePriceHistory,
  CREATOR_INITIAL_ALLOCATION,
  TradeCost,
  TradeRefund,
} from './token-economics'

// Token interface
export interface Token {
  id: string
  type: TokenType
  name: string
  symbol: string
  creatorId: string
  creatorName: string
  creatorImage: string | null
  videoId?: string        // Only for VIDEO tokens
  videoTitle?: string     // Only for VIDEO tokens
  videoThumbnail?: string // Only for VIDEO tokens
  subscriberCount: number
  params: TokenParams
  supply: number
  reserveSOL: number
  creatorEarnings: number
  platformEarnings: number
  holders: number
  totalTrades: number
  volume24h: number
  volumeAll: number
  allTimeHigh: number
  allTimeLow: number
  createdAt: number
  updatedAt: number
}

// User balance for a specific token
export interface UserTokenBalance {
  tokenId: string
  userId: string
  balance: number
  avgBuyPrice: number
  totalInvested: number
  updatedAt: number
}

// Trade transaction
export interface Trade {
  id: string
  tokenId: string
  userId: string
  type: 'BUY' | 'SELL'
  amount: number
  price: number
  totalCost: number
  creatorFee: number
  platformFee: number
  timestamp: number
}

// Price history point
export interface PricePoint {
  tokenId: string
  price: number
  supply: number
  timestamp: number
}

// Global state singleton
class TradingState {
  private tokens: Map<string, Token> = new Map()
  private userBalances: Map<string, UserTokenBalance> = new Map() // key: `${userId}:${tokenId}`
  private trades: Trade[] = []
  private priceHistory: Map<string, PricePoint[]> = new Map()
  
  // Demo users
  private users: Map<string, { id: string; name: string; solBalance: number }> = new Map()
  
  constructor() {
    // Initialize demo users
    this.users.set('demo-creator', {
      id: 'demo-creator',
      name: 'Demo Creator',
      solBalance: 100,
    })
    this.users.set('demo-investor', {
      id: 'demo-investor',
      name: 'Demo Investor',
      solBalance: 50,
    })
  }

  // === TOKEN MANAGEMENT ===

  /**
   * Create a new token (creator or video)
   */
  createToken(
    type: TokenType,
    creatorId: string,
    creatorName: string,
    creatorImage: string | null,
    subscriberCount: number,
    name: string,
    symbol: string,
    videoId?: string,
    videoTitle?: string,
    videoThumbnail?: string
  ): Token {
    const id = type === 'CREATOR' 
      ? `creator-${creatorId}-${Date.now()}`
      : `video-${videoId}-${Date.now()}`
    
    const params = getTokenParams(type, subscriberCount)
    const initialPrice = params.basePrice
    
    const token: Token = {
      id,
      type,
      name,
      symbol,
      creatorId,
      creatorName,
      creatorImage,
      videoId,
      videoTitle,
      videoThumbnail,
      subscriberCount,
      params,
      supply: 0,
      reserveSOL: 0,
      creatorEarnings: 0,
      platformEarnings: 0,
      holders: 0,
      totalTrades: 0,
      volume24h: 0,
      volumeAll: 0,
      allTimeHigh: initialPrice,
      allTimeLow: initialPrice,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    
    this.tokens.set(id, token)
    this.priceHistory.set(id, [{
      tokenId: id,
      price: initialPrice,
      supply: 0,
      timestamp: Date.now(),
    }])
    
    // If creator token, allocate 10% initial tokens to creator
    if (type === 'CREATOR') {
      const initialAllocation = 100 // Start with 100 tokens for creator
      this.mintInitialAllocation(id, creatorId, initialAllocation)
    }
    
    return token
  }

  /**
   * Mint initial allocation for creator
   */
  private mintInitialAllocation(tokenId: string, creatorId: string, amount: number): void {
    const token = this.tokens.get(tokenId)
    if (!token) return
    
    // Calculate cost at base price (creator gets these "free" as allocation)
    const params = token.params
    let totalValue = 0
    
    for (let i = 0; i < amount; i++) {
      totalValue += getCurrentPrice(token.type, i, params)
    }
    
    // Update token state
    token.supply = amount
    token.reserveSOL = totalValue
    token.holders = 1
    token.updatedAt = Date.now()
    
    // Update price tracking
    const newPrice = getCurrentPrice(token.type, amount, params)
    token.allTimeHigh = Math.max(token.allTimeHigh, newPrice)
    
    // Create balance for creator
    const balanceKey = `${creatorId}:${tokenId}`
    this.userBalances.set(balanceKey, {
      tokenId,
      userId: creatorId,
      balance: amount,
      avgBuyPrice: 0, // Free allocation
      totalInvested: 0,
      updatedAt: Date.now(),
    })
    
    // Add price point
    this.addPricePoint(tokenId, newPrice, amount)
  }

  /**
   * Get a token by ID
   */
  getToken(tokenId: string): Token | undefined {
    return this.tokens.get(tokenId)
  }

  /**
   * Get all tokens
   */
  getAllTokens(): Token[] {
    return Array.from(this.tokens.values())
  }

  /**
   * Get tokens by type
   */
  getTokensByType(type: TokenType): Token[] {
    return this.getAllTokens().filter(t => t.type === type)
  }

  /**
   * Get tokens by creator
   */
  getTokensByCreator(creatorId: string): Token[] {
    return this.getAllTokens().filter(t => t.creatorId === creatorId)
  }

  // === TRADING ===

  /**
   * Execute a buy order
   */
  buy(tokenId: string, userId: string, amount: number): { success: boolean; trade?: Trade; error?: string; cost?: TradeCost } {
    const token = this.tokens.get(tokenId)
    if (!token) {
      return { success: false, error: 'Token not found' }
    }
    
    const user = this.users.get(userId)
    if (!user) {
      return { success: false, error: 'User not found' }
    }
    
    // Calculate cost
    const cost = calculateBuyCost(token.type, token.supply, amount, token.params)
    
    if (user.solBalance < cost.totalCost) {
      return { success: false, error: 'Insufficient SOL balance', cost }
    }
    
    // Execute trade
    user.solBalance -= cost.totalCost
    
    // Update token state
    token.supply += amount
    token.reserveSOL += cost.tokenCost
    token.creatorEarnings += cost.creatorFee
    token.platformEarnings += cost.platformFee
    token.totalTrades += 1
    token.volume24h += cost.totalCost
    token.volumeAll += cost.totalCost
    token.updatedAt = Date.now()
    
    // Update price tracking
    const newPrice = getCurrentPrice(token.type, token.supply, token.params)
    token.allTimeHigh = Math.max(token.allTimeHigh, newPrice)
    token.allTimeLow = Math.min(token.allTimeLow, newPrice)
    
    // Update user balance
    const balanceKey = `${userId}:${tokenId}`
    const existingBalance = this.userBalances.get(balanceKey)
    
    if (existingBalance) {
      const newTotalInvested = existingBalance.totalInvested + cost.totalCost
      const newBalance = existingBalance.balance + amount
      existingBalance.balance = newBalance
      existingBalance.totalInvested = newTotalInvested
      existingBalance.avgBuyPrice = newTotalInvested / newBalance
      existingBalance.updatedAt = Date.now()
    } else {
      this.userBalances.set(balanceKey, {
        tokenId,
        userId,
        balance: amount,
        avgBuyPrice: cost.pricePerToken,
        totalInvested: cost.totalCost,
        updatedAt: Date.now(),
      })
      token.holders += 1
    }
    
    // Create trade record
    const trade: Trade = {
      id: `trade-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      tokenId,
      userId,
      type: 'BUY',
      amount,
      price: cost.pricePerToken,
      totalCost: cost.totalCost,
      creatorFee: cost.creatorFee,
      platformFee: cost.platformFee,
      timestamp: Date.now(),
    }
    
    this.trades.push(trade)
    this.addPricePoint(tokenId, newPrice, token.supply)
    
    return { success: true, trade, cost }
  }

  /**
   * Execute a sell order
   */
  sell(tokenId: string, userId: string, amount: number): { success: boolean; trade?: Trade; error?: string; refund?: TradeRefund } {
    const token = this.tokens.get(tokenId)
    if (!token) {
      return { success: false, error: 'Token not found' }
    }
    
    const user = this.users.get(userId)
    if (!user) {
      return { success: false, error: 'User not found' }
    }
    
    const balanceKey = `${userId}:${tokenId}`
    const balance = this.userBalances.get(balanceKey)
    
    if (!balance || balance.balance < amount) {
      return { success: false, error: 'Insufficient token balance' }
    }
    
    // Calculate refund
    const refund = calculateSellRefund(token.type, token.supply, amount, token.params)
    
    // Execute trade
    user.solBalance += refund.netRefund
    
    // Update token state
    token.supply -= amount
    token.reserveSOL -= refund.grossRefund
    token.creatorEarnings += refund.creatorFee
    token.platformEarnings += refund.platformFee
    token.totalTrades += 1
    token.volume24h += refund.grossRefund
    token.volumeAll += refund.grossRefund
    token.updatedAt = Date.now()
    
    // Update price tracking
    const newPrice = token.supply > 0 
      ? getCurrentPrice(token.type, token.supply, token.params)
      : token.params.basePrice
    token.allTimeLow = Math.min(token.allTimeLow, newPrice)
    
    // Update user balance
    balance.balance -= amount
    balance.updatedAt = Date.now()
    
    if (balance.balance === 0) {
      token.holders -= 1
    }
    
    // Create trade record
    const trade: Trade = {
      id: `trade-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      tokenId,
      userId,
      type: 'SELL',
      amount,
      price: refund.pricePerToken,
      totalCost: refund.netRefund,
      creatorFee: refund.creatorFee,
      platformFee: refund.platformFee,
      timestamp: Date.now(),
    }
    
    this.trades.push(trade)
    this.addPricePoint(tokenId, newPrice, token.supply)
    
    return { success: true, trade, refund }
  }

  // === USER MANAGEMENT ===

  /**
   * Get or create a user
   */
  getOrCreateUser(userId: string, name: string = 'User'): { id: string; name: string; solBalance: number } {
    let user = this.users.get(userId)
    if (!user) {
      user = {
        id: userId,
        name,
        solBalance: 10, // Default starting balance
      }
      this.users.set(userId, user)
    }
    return user
  }

  /**
   * Get user's SOL balance
   */
  getUserSolBalance(userId: string): number {
    return this.users.get(userId)?.solBalance ?? 0
  }

  /**
   * Set user's SOL balance (for demo)
   */
  setUserSolBalance(userId: string, balance: number): void {
    const user = this.users.get(userId)
    if (user) {
      user.solBalance = balance
    }
  }

  /**
   * Get user's token holdings
   */
  getUserHoldings(userId: string): UserTokenBalance[] {
    const holdings: UserTokenBalance[] = []
    this.userBalances.forEach((balance, key) => {
      if (key.startsWith(`${userId}:`)) {
        holdings.push(balance)
      }
    })
    return holdings
  }

  /**
   * Get user's balance for a specific token
   */
  getUserTokenBalance(userId: string, tokenId: string): number {
    const balanceKey = `${userId}:${tokenId}`
    return this.userBalances.get(balanceKey)?.balance ?? 0
  }

  // === TRADE HISTORY ===

  /**
   * Get trades for a token
   */
  getTokenTrades(tokenId: string, limit: number = 50): Trade[] {
    return this.trades
      .filter(t => t.tokenId === tokenId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  /**
   * Get trades for a user
   */
  getUserTrades(userId: string, limit: number = 50): Trade[] {
    return this.trades
      .filter(t => t.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  /**
   * Get all recent trades
   */
  getRecentTrades(limit: number = 50): Trade[] {
    return this.trades
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  // === PRICE HISTORY ===

  /**
   * Add a price point
   */
  private addPricePoint(tokenId: string, price: number, supply: number): void {
    const history = this.priceHistory.get(tokenId) || []
    history.push({
      tokenId,
      price,
      supply,
      timestamp: Date.now(),
    })
    
    // Keep only last 1000 points
    if (history.length > 1000) {
      history.shift()
    }
    
    this.priceHistory.set(tokenId, history)
  }

  /**
   * Get price history for a token
   */
  getPriceHistory(tokenId: string): PricePoint[] {
    const token = this.tokens.get(tokenId)
    const existingHistory = this.priceHistory.get(tokenId) || []
    
    // If we have little history, generate mock data
    if (existingHistory.length < 10 && token) {
      const mockHistory = generatePriceHistory(
        token.type,
        token.params,
        token.supply,
        100
      )
      return mockHistory.map(h => ({
        tokenId,
        price: h.price,
        supply: h.supply,
        timestamp: h.timestamp,
      }))
    }
    
    return existingHistory
  }

  // === STATISTICS ===

  /**
   * Get token statistics
   */
  getTokenStats(tokenId: string) {
    const token = this.tokens.get(tokenId)
    if (!token) return null
    
    const currentPrice = getCurrentPrice(token.type, token.supply, token.params)
    const marketCap = calculateMarketCap(token.supply, currentPrice)
    
    return {
      ...token,
      currentPrice,
      marketCap,
    }
  }

  /**
   * Get global statistics
   */
  getGlobalStats() {
    const tokens = this.getAllTokens()
    let totalVolume = 0
    let totalMarketCap = 0
    let totalTrades = 0
    
    tokens.forEach(token => {
      const currentPrice = getCurrentPrice(token.type, token.supply, token.params)
      totalVolume += token.volumeAll
      totalMarketCap += calculateMarketCap(token.supply, currentPrice)
      totalTrades += token.totalTrades
    })
    
    return {
      totalTokens: tokens.length,
      creatorTokens: tokens.filter(t => t.type === 'CREATOR').length,
      videoTokens: tokens.filter(t => t.type === 'VIDEO').length,
      totalVolume,
      totalMarketCap,
      totalTrades,
    }
  }

  // === DEMO HELPERS ===

  /**
   * Reset state (for demo)
   */
  reset(): void {
    this.tokens.clear()
    this.userBalances.clear()
    this.trades = []
    this.priceHistory.clear()
    
    // Re-initialize demo users
    this.users.set('demo-creator', {
      id: 'demo-creator',
      name: 'Demo Creator',
      solBalance: 100,
    })
    this.users.set('demo-investor', {
      id: 'demo-investor',
      name: 'Demo Investor',
      solBalance: 50,
    })
  }

  /**
   * Seed with demo data
   */
  seedDemoData(): void {
    // Create a demo creator token
    this.createToken(
      'CREATOR',
      'demo-creator',
      'TechVision Studios',
      'https://api.dicebear.com/7.x/initials/svg?seed=TV',
      125000,
      'TechVision Token',
      '$TECH'
    )
    
    // Simulate some trades
    const creatorToken = this.getTokensByType('CREATOR')[0]
    if (creatorToken) {
      // Investor buys some tokens
      this.buy(creatorToken.id, 'demo-investor', 50)
      this.buy(creatorToken.id, 'demo-investor', 30)
      
      // Create a video token
      this.createToken(
        'VIDEO',
        'demo-creator',
        'TechVision Studios',
        'https://api.dicebear.com/7.x/initials/svg?seed=TV',
        125000,
        'Building Web3 Apps',
        '$WEB3',
        'dQw4w9WgXcQ',
        'Building Web3 Apps - Complete Guide',
        'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg'
      )
      
      const videoToken = this.getTokensByType('VIDEO')[0]
      if (videoToken) {
        this.buy(videoToken.id, 'demo-investor', 100)
        this.buy(videoToken.id, 'demo-investor', 50)
      }
    }
  }
}

// Use global to persist state across hot reloads in development
// This is necessary because Next.js API routes can reinitialize modules
declare global {
  var __sipzy_trading_state: TradingState | undefined
  var __sipzy_seeded: boolean | undefined
}

// Export singleton instance - use global in development to persist across hot reloads
export const tradingState = global.__sipzy_trading_state || new TradingState()

// Store in global for persistence
if (process.env.NODE_ENV !== 'production') {
  global.__sipzy_trading_state = tradingState
}

// Initialize with demo data on first import (both server and client)
function ensureSeeded() {
  const isServer = typeof window === 'undefined'
  
  if (isServer) {
    // Server-side - check global flag
    if (!global.__sipzy_seeded) {
      console.log('[TradingState] Seeding demo data on server...')
      global.__sipzy_seeded = true
      tradingState.seedDemoData()
      console.log(`[TradingState] Seeded ${tradingState.getAllTokens().length} tokens`)
    }
  } else {
    // Client-side - check window flag
    if (!(window as any).__sipzy_seeded) {
      console.log('[TradingState] Seeding demo data on client...')
      ;(window as any).__sipzy_seeded = true
      tradingState.seedDemoData()
    }
  }
}

// Run seeding immediately
ensureSeeded()

