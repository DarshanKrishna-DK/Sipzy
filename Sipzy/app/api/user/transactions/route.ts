import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { tradingState } from '@/lib/trading-state'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  let userId = searchParams.get('userId')
  const limit = parseInt(searchParams.get('limit') || '50')
  
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
  
  // Get trades
  const trades = tradingState.getUserTrades(userId, limit)
  
  // Enrich with token info
  const enrichedTrades = trades.map(trade => {
    const token = tradingState.getToken(trade.tokenId)
    return {
      ...trade,
      tokenName: token?.name || 'Unknown',
      tokenSymbol: token?.symbol || '???',
      tokenType: token?.type || 'UNKNOWN',
    }
  })
  
  return NextResponse.json({
    userId,
    trades: enrichedTrades,
    total: trades.length,
  })
}

