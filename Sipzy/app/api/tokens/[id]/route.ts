import { NextRequest, NextResponse } from 'next/server'
import { tradingState } from '@/lib/trading-state'
import { getCurrentPrice, calculateMarketCap, calculateBuyCost, calculateSellRefund } from '@/lib/token-economics'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  // Debug: Log available tokens
  const allTokens = tradingState.getAllTokens()
  console.log(`[Token API] Looking for token: ${id}`)
  console.log(`[Token API] Available tokens: ${allTokens.map(t => t.id).join(', ')}`)
  
  const token = tradingState.getToken(id)
  
  if (!token) {
    console.log(`[Token API] Token not found: ${id}`)
    return NextResponse.json({ 
      error: 'Token not found', 
      requestedId: id,
      availableTokens: allTokens.length,
      availableIds: allTokens.slice(0, 5).map(t => t.id) // Show first 5 for debugging
    }, { status: 404 })
  }
  
  const currentPrice = getCurrentPrice(token.type, token.supply, token.params)
  const marketCap = calculateMarketCap(token.supply, currentPrice)
  const priceHistory = tradingState.getPriceHistory(id)
  const recentTrades = tradingState.getTokenTrades(id, 20)
  
  // Calculate price estimates for different amounts
  const buyEstimates = [1, 10, 50, 100].map(amount => {
    const cost = calculateBuyCost(token.type, token.supply, amount, token.params)
    return {
      amount,
      totalCost: cost.totalCost,
      pricePerToken: cost.pricePerToken,
      creatorFee: cost.creatorFee,
      platformFee: cost.platformFee,
    }
  })
  
  const sellEstimates = [1, 10, 50, 100].map(amount => {
    if (amount > token.supply) {
      return { amount, available: false }
    }
    const refund = calculateSellRefund(token.type, token.supply, amount, token.params)
    return {
      amount,
      available: true,
      netRefund: refund.netRefund,
      pricePerToken: refund.pricePerToken,
      creatorFee: refund.creatorFee,
      platformFee: refund.platformFee,
    }
  })
  
  return NextResponse.json({
    token: {
      id: token.id,
      type: token.type,
      name: token.name,
      symbol: token.symbol,
      creatorId: token.creatorId,
      creatorName: token.creatorName,
      creatorImage: token.creatorImage,
      videoId: token.videoId,
      videoTitle: token.videoTitle,
      videoThumbnail: token.videoThumbnail,
      subscriberCount: token.subscriberCount,
      supply: token.supply,
      currentPrice,
      marketCap,
      reserveSOL: token.reserveSOL,
      creatorEarnings: token.creatorEarnings,
      platformEarnings: token.platformEarnings,
      holders: token.holders,
      totalTrades: token.totalTrades,
      volume24h: token.volume24h,
      volumeAll: token.volumeAll,
      allTimeHigh: token.allTimeHigh,
      allTimeLow: token.allTimeLow,
      createdAt: token.createdAt,
      updatedAt: token.updatedAt,
      params: {
        basePrice: token.params.basePrice,
        slope: token.params.slope,
        growthRate: token.params.growthRate,
        creatorFeePercent: token.params.creatorFeePercent,
        platformFeePercent: token.params.platformFeePercent,
      },
    },
    priceHistory,
    recentTrades,
    buyEstimates,
    sellEstimates,
  })
}

