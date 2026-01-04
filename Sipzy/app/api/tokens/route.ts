import { NextRequest, NextResponse } from 'next/server'
import { tradingState } from '@/lib/trading-state'
import { getCurrentPrice, calculateMarketCap } from '@/lib/token-economics'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get('type') // 'CREATOR' | 'VIDEO' | null (all)
  const creatorId = searchParams.get('creatorId') // Filter by creator
  const sortBy = searchParams.get('sort') || 'volume' // volume, price, marketCap, newest
  const limit = parseInt(searchParams.get('limit') || '20')
  const page = parseInt(searchParams.get('page') || '1')
  
  // Get tokens
  let tokens = type 
    ? tradingState.getTokensByType(type as 'CREATOR' | 'VIDEO')
    : tradingState.getAllTokens()
  
  // Filter by creator if specified
  if (creatorId) {
    tokens = tokens.filter(t => t.creatorId === creatorId)
  }
  
  // Enrich with current price and market cap
  const enrichedTokens = tokens.map(token => {
    const currentPrice = getCurrentPrice(token.type, token.supply, token.params)
    const marketCap = calculateMarketCap(token.supply, currentPrice)
    
    return {
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
      supply: token.supply,
      currentPrice,
      marketCap,
      reserveSOL: token.reserveSOL,
      creatorEarnings: token.creatorEarnings,
      platformEarnings: token.platformEarnings,
      volume24h: token.volume24h,
      volumeAll: token.volumeAll,
      holders: token.holders,
      totalTrades: token.totalTrades,
      allTimeHigh: token.allTimeHigh,
      allTimeLow: token.allTimeLow,
      createdAt: token.createdAt,
      updatedAt: token.updatedAt,
      params: token.params,
      // Calculate price change (mock for demo)
      priceChange24h: Math.random() * 40 - 10, // -10% to +30%
    }
  })
  
  // Sort
  enrichedTokens.sort((a, b) => {
    switch (sortBy) {
      case 'volume':
        return b.volume24h - a.volume24h
      case 'price':
        return b.currentPrice - a.currentPrice
      case 'marketCap':
        return b.marketCap - a.marketCap
      case 'newest':
        return b.createdAt - a.createdAt
      case 'holders':
        return b.holders - a.holders
      default:
        return b.volume24h - a.volume24h
    }
  })
  
  // Paginate
  const startIndex = (page - 1) * limit
  const paginatedTokens = enrichedTokens.slice(startIndex, startIndex + limit)
  
  return NextResponse.json({
    tokens: paginatedTokens,
    pagination: {
      page,
      limit,
      total: enrichedTokens.length,
      pages: Math.ceil(enrichedTokens.length / limit),
    },
    stats: tradingState.getGlobalStats(),
  })
}

