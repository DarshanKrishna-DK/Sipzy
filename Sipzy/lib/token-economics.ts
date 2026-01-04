/**
 * Token Economics Engine
 * 
 * Implements bonding curve mechanics for Sipzy tokens:
 * - Creator Tokens: Linear bonding curve
 * - Video Tokens: Exponential bonding curve
 * 
 * Includes channel balancing parameters and fee calculations.
 */

// Constants
export const LAMPORTS_PER_SOL = 1_000_000_000

// Base prices in SOL
export const CREATOR_BASE_PRICE = 0.001 // 0.001 SOL
export const VIDEO_BASE_PRICE = 0.0001  // 0.0001 SOL

// Slope for linear curve (SOL per token)
export const BASE_SLOPE = 0.0001

// Growth rate for exponential curve (0.5% per token)
export const VIDEO_GROWTH_RATE = 0.005

// Fee percentages
export const CREATOR_TOKEN_FEE = 0.10  // 10% to creator (updated from 5%)
export const VIDEO_TOKEN_FEE = 0.20    // 20% to creator
export const PLATFORM_FEE = 0.01       // 1% to platform

// Creator initial allocation
export const CREATOR_INITIAL_ALLOCATION = 0.10 // 10% of initial supply

// Max supply limits
export const MAX_CREATOR_TOKEN_SUPPLY = 1_000_000  // 1 million max for creator tokens
export const MAX_VIDEO_TOKEN_SUPPLY = 100_000     // 100k max for video tokens

// Token types
export type TokenType = 'CREATOR' | 'VIDEO'

// Subscriber tier thresholds
export interface SubscriberTier {
  name: string
  minSubscribers: number
  maxSubscribers: number
  basePriceMultiplier: number
  slopeMultiplier: number
}

export const SUBSCRIBER_TIERS: SubscriberTier[] = [
  { name: 'Emerging', minSubscribers: 0, maxSubscribers: 10000, basePriceMultiplier: 1.0, slopeMultiplier: 0.5 },
  { name: 'Growing', minSubscribers: 10000, maxSubscribers: 100000, basePriceMultiplier: 1.5, slopeMultiplier: 1.0 },
  { name: 'Established', minSubscribers: 100000, maxSubscribers: 1000000, basePriceMultiplier: 2.0, slopeMultiplier: 1.5 },
  { name: 'Major', minSubscribers: 1000000, maxSubscribers: Infinity, basePriceMultiplier: 3.0, slopeMultiplier: 2.0 },
]

/**
 * Get subscriber tier based on subscriber count
 */
export function getSubscriberTier(subscriberCount: number): SubscriberTier {
  for (const tier of SUBSCRIBER_TIERS) {
    if (subscriberCount >= tier.minSubscribers && subscriberCount < tier.maxSubscribers) {
      return tier
    }
  }
  return SUBSCRIBER_TIERS[SUBSCRIBER_TIERS.length - 1]
}

/**
 * Calculate adjusted base price for creator token based on subscribers
 */
export function getAdjustedBasePrice(subscriberCount: number): number {
  const tier = getSubscriberTier(subscriberCount)
  return CREATOR_BASE_PRICE * tier.basePriceMultiplier
}

/**
 * Calculate adjusted slope for creator token based on subscribers
 */
export function getAdjustedSlope(subscriberCount: number): number {
  const tier = getSubscriberTier(subscriberCount)
  // Additional adjustment based on log scale for smoother growth
  const logFactor = 1 + Math.log10(Math.max(subscriberCount, 1000) / 1000)
  return BASE_SLOPE * tier.slopeMultiplier * logFactor
}

/**
 * LINEAR BONDING CURVE (Creator Tokens)
 * Price = BasePrice + (Supply × Slope)
 */
export function calculateLinearPrice(supply: number, basePrice: number, slope: number): number {
  return basePrice + (supply * slope)
}

/**
 * Calculate cost to buy N tokens on linear curve
 * Integral of (basePrice + supply * slope) from currentSupply to currentSupply + amount
 */
export function calculateLinearBuyCost(
  currentSupply: number,
  amount: number,
  basePrice: number,
  slope: number
): number {
  // Cost = basePrice * amount + slope * (sum of supply from currentSupply to currentSupply + amount - 1)
  // = basePrice * amount + slope * (amount * currentSupply + amount * (amount - 1) / 2)
  const baseCost = basePrice * amount
  const slopeCost = slope * (amount * currentSupply + (amount * (amount - 1)) / 2)
  return baseCost + slopeCost
}

/**
 * Calculate refund for selling N tokens on linear curve
 */
export function calculateLinearSellRefund(
  currentSupply: number,
  amount: number,
  basePrice: number,
  slope: number
): number {
  if (amount > currentSupply) {
    throw new Error('Cannot sell more than current supply')
  }
  // Refund = integral from (currentSupply - amount) to currentSupply
  const newSupply = currentSupply - amount
  const baseCost = basePrice * amount
  const slopeCost = slope * (amount * newSupply + (amount * (amount - 1)) / 2)
  return baseCost + slopeCost
}

/**
 * EXPONENTIAL BONDING CURVE (Video Tokens)
 * Price = BasePrice × (1 + GrowthRate)^Supply
 */
export function calculateExponentialPrice(supply: number, basePrice: number, growthRate: number): number {
  return basePrice * Math.pow(1 + growthRate, supply)
}

/**
 * Calculate cost to buy N tokens on exponential curve
 * Sum of prices from currentSupply to currentSupply + amount - 1
 */
export function calculateExponentialBuyCost(
  currentSupply: number,
  amount: number,
  basePrice: number,
  growthRate: number
): number {
  let totalCost = 0
  for (let i = 0; i < amount; i++) {
    totalCost += calculateExponentialPrice(currentSupply + i, basePrice, growthRate)
  }
  return totalCost
}

/**
 * Calculate refund for selling N tokens on exponential curve
 */
export function calculateExponentialSellRefund(
  currentSupply: number,
  amount: number,
  basePrice: number,
  growthRate: number
): number {
  if (amount > currentSupply) {
    throw new Error('Cannot sell more than current supply')
  }
  let totalRefund = 0
  for (let i = 0; i < amount; i++) {
    totalRefund += calculateExponentialPrice(currentSupply - i - 1, basePrice, growthRate)
  }
  return totalRefund
}

/**
 * Token creation parameters
 */
export interface TokenParams {
  tokenType: TokenType
  basePrice: number
  slope?: number        // For linear curve
  growthRate?: number   // For exponential curve
  creatorFeePercent: number
  platformFeePercent: number
}

/**
 * Get token parameters based on type and channel info
 */
export function getTokenParams(tokenType: TokenType, subscriberCount: number = 0): TokenParams {
  if (tokenType === 'CREATOR') {
    return {
      tokenType: 'CREATOR',
      basePrice: getAdjustedBasePrice(subscriberCount),
      slope: getAdjustedSlope(subscriberCount),
      creatorFeePercent: CREATOR_TOKEN_FEE,
      platformFeePercent: PLATFORM_FEE,
    }
  } else {
    return {
      tokenType: 'VIDEO',
      basePrice: VIDEO_BASE_PRICE,
      growthRate: VIDEO_GROWTH_RATE,
      creatorFeePercent: VIDEO_TOKEN_FEE,
      platformFeePercent: PLATFORM_FEE,
    }
  }
}

/**
 * Calculate current price for a token
 */
export function getCurrentPrice(
  tokenType: TokenType,
  supply: number,
  params: TokenParams
): number {
  if (tokenType === 'CREATOR') {
    return calculateLinearPrice(supply, params.basePrice, params.slope || BASE_SLOPE)
  } else {
    return calculateExponentialPrice(supply, params.basePrice, params.growthRate || VIDEO_GROWTH_RATE)
  }
}

/**
 * Calculate buy cost including fees
 */
export interface TradeCost {
  tokenCost: number      // Base cost of tokens
  creatorFee: number     // Fee to creator
  platformFee: number    // Fee to platform
  totalCost: number      // Total including all fees
  pricePerToken: number  // Average price per token
  newPrice: number       // Price after purchase
}

export function calculateBuyCost(
  tokenType: TokenType,
  currentSupply: number,
  amount: number,
  params: TokenParams
): TradeCost {
  let tokenCost: number
  
  if (tokenType === 'CREATOR') {
    tokenCost = calculateLinearBuyCost(currentSupply, amount, params.basePrice, params.slope || BASE_SLOPE)
  } else {
    tokenCost = calculateExponentialBuyCost(currentSupply, amount, params.basePrice, params.growthRate || VIDEO_GROWTH_RATE)
  }
  
  const creatorFee = tokenCost * params.creatorFeePercent
  const platformFee = tokenCost * params.platformFeePercent
  const totalCost = tokenCost + creatorFee + platformFee
  const pricePerToken = totalCost / amount
  const newPrice = getCurrentPrice(tokenType, currentSupply + amount, params)
  
  return {
    tokenCost,
    creatorFee,
    platformFee,
    totalCost,
    pricePerToken,
    newPrice,
  }
}

/**
 * Calculate sell refund after fees
 */
export interface TradeRefund {
  grossRefund: number    // Refund before fees
  creatorFee: number     // Fee to creator
  platformFee: number    // Fee to platform
  netRefund: number      // Refund after fees
  pricePerToken: number  // Average price per token
  newPrice: number       // Price after sale
}

export function calculateSellRefund(
  tokenType: TokenType,
  currentSupply: number,
  amount: number,
  params: TokenParams
): TradeRefund {
  let grossRefund: number
  
  if (tokenType === 'CREATOR') {
    grossRefund = calculateLinearSellRefund(currentSupply, amount, params.basePrice, params.slope || BASE_SLOPE)
  } else {
    grossRefund = calculateExponentialSellRefund(currentSupply, amount, params.basePrice, params.growthRate || VIDEO_GROWTH_RATE)
  }
  
  const creatorFee = grossRefund * params.creatorFeePercent
  const platformFee = grossRefund * params.platformFeePercent
  const netRefund = grossRefund - creatorFee - platformFee
  const pricePerToken = netRefund / amount
  const newSupply = currentSupply - amount
  const newPrice = newSupply > 0 ? getCurrentPrice(tokenType, newSupply, params) : params.basePrice
  
  return {
    grossRefund,
    creatorFee,
    platformFee,
    netRefund,
    pricePerToken,
    newPrice,
  }
}

/**
 * Calculate market cap
 */
export function calculateMarketCap(supply: number, currentPrice: number): number {
  return supply * currentPrice
}

/**
 * Calculate creator's initial token allocation
 */
export function calculateCreatorAllocation(totalSupply: number): number {
  return Math.floor(totalSupply * CREATOR_INITIAL_ALLOCATION)
}

/**
 * Format SOL amount for display
 */
export function formatSol(amount: number, decimals: number = 6): string {
  return amount.toFixed(decimals)
}

/**
 * Format percentage for display
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * Generate price history data points for charts
 */
export function generatePriceHistory(
  tokenType: TokenType,
  params: TokenParams,
  currentSupply: number,
  dataPoints: number = 100
): { supply: number; price: number; timestamp: number }[] {
  const history: { supply: number; price: number; timestamp: number }[] = []
  const now = Date.now()
  const interval = (24 * 60 * 60 * 1000) / dataPoints // Spread over 24 hours
  
  // Generate historical data going backwards
  for (let i = dataPoints; i >= 0; i--) {
    // Simulate supply growth with some randomness
    const supplyAtPoint = Math.max(0, Math.floor(currentSupply * (1 - i / dataPoints) * (0.8 + Math.random() * 0.4)))
    const price = getCurrentPrice(tokenType, supplyAtPoint, params)
    
    history.push({
      supply: supplyAtPoint,
      price,
      timestamp: now - (i * interval),
    })
  }
  
  // Ensure the last point matches current state
  history[history.length - 1] = {
    supply: currentSupply,
    price: getCurrentPrice(tokenType, currentSupply, params),
    timestamp: now,
  }
  
  return history
}

