import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { tradingState } from '@/lib/trading-state'
import { getCurrentPrice, calculateMarketCap } from '@/lib/token-economics'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  let userId: string = searchParams.get('userId') || ''
  
  // Try to get from demo session if not provided
  if (!userId) {
    const cookieStore = await cookies()
    const demoSession = cookieStore.get('demo_session')
    
    if (demoSession) {
      try {
        const session = JSON.parse(demoSession.value)
        userId = session.userId || 'demo-investor'
      } catch {
        userId = 'demo-investor'
      }
    } else {
      userId = 'demo-investor'
    }
  }
  
  // Get user
  const user = tradingState.getOrCreateUser(userId, 'Demo User')
  
  // Get holdings
  const holdings = tradingState.getUserHoldings(userId)
  
  // Enrich holdings with current values
  const enrichedHoldings = holdings.map(holding => {
    const token = tradingState.getToken(holding.tokenId)
    if (!token) return null
    
    const currentPrice = getCurrentPrice(token.type, token.supply, token.params)
    const currentValue = holding.balance * currentPrice
    const profitLoss = currentValue - holding.totalInvested
    const profitLossPercent = holding.totalInvested > 0 
      ? (profitLoss / holding.totalInvested) * 100 
      : 0
    
    return {
      tokenId: token.id,
      tokenName: token.name,
      tokenSymbol: token.symbol,
      tokenType: token.type,
      creatorName: token.creatorName,
      videoTitle: token.videoTitle,
      balance: holding.balance,
      avgBuyPrice: holding.avgBuyPrice,
      currentPrice,
      totalInvested: holding.totalInvested,
      currentValue,
      profitLoss,
      profitLossPercent,
    }
  }).filter(Boolean)
  
  // Calculate totals
  const totalInvested = enrichedHoldings.reduce((sum, h) => sum + (h?.totalInvested || 0), 0)
  const totalValue = enrichedHoldings.reduce((sum, h) => sum + (h?.currentValue || 0), 0)
  const totalProfitLoss = totalValue - totalInvested
  const totalProfitLossPercent = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0
  
  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      solBalance: user.solBalance,
    },
    holdings: enrichedHoldings,
    summary: {
      totalInvested,
      totalValue,
      totalProfitLoss,
      totalProfitLossPercent,
      holdingCount: enrichedHoldings.length,
    },
  })
}

// Update SOL balance (for demo)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, solBalance } = body
    
    if (!userId || solBalance === undefined) {
      return NextResponse.json(
        { error: 'Required: userId, solBalance' },
        { status: 400 }
      )
    }
    
    tradingState.setUserSolBalance(userId, solBalance)
    
    return NextResponse.json({
      success: true,
      newBalance: tradingState.getUserSolBalance(userId),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

