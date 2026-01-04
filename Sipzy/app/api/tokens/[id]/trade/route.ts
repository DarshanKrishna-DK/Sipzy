import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { tradingState } from '@/lib/trading-state'
import { getCurrentPrice, calculateBuyCost, calculateSellRefund } from '@/lib/token-economics'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tokenId } = await params
  
  try {
    const body = await request.json()
    const { action, amount, userId } = body
    
    if (!action || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid request. Required: action (buy/sell), amount (positive number)' },
        { status: 400 }
      )
    }
    
    const token = tradingState.getToken(tokenId)
    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 })
    }
    
    // Get user ID from session or use provided one (demo mode)
    let effectiveUserId = userId
    
    if (!effectiveUserId) {
      // Try to get from demo session
      const cookieStore = await cookies()
      const demoSession = cookieStore.get('demo_session')
      
      if (demoSession) {
        try {
          const session = JSON.parse(demoSession.value)
          effectiveUserId = session.userId || 'demo-investor'
        } catch {
          effectiveUserId = 'demo-investor'
        }
      } else {
        effectiveUserId = 'demo-investor'
      }
    }
    
    // Ensure user exists
    tradingState.getOrCreateUser(effectiveUserId, 'Demo User')
    
    if (action === 'buy') {
      // Preview the cost first
      const costPreview = calculateBuyCost(token.type, token.supply, amount, token.params)
      
      // Execute buy
      const result = tradingState.buy(tokenId, effectiveUserId, amount)
      
      if (!result.success) {
        return NextResponse.json({ error: result.error, costPreview }, { status: 400 })
      }
      
      const newPrice = getCurrentPrice(token.type, token.supply, token.params)
      
      return NextResponse.json({
        success: true,
        trade: result.trade,
        cost: result.cost,
        newBalance: tradingState.getUserTokenBalance(effectiveUserId, tokenId),
        newSolBalance: tradingState.getUserSolBalance(effectiveUserId),
        newPrice,
        newSupply: token.supply,
      })
      
    } else if (action === 'sell') {
      // Preview the refund first
      const userBalance = tradingState.getUserTokenBalance(effectiveUserId, tokenId)
      
      if (userBalance < amount) {
        return NextResponse.json(
          { error: `Insufficient token balance. You have ${userBalance} tokens.` },
          { status: 400 }
        )
      }
      
      // Execute sell
      const result = tradingState.sell(tokenId, effectiveUserId, amount)
      
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      
      const newPrice = token.supply > 0 
        ? getCurrentPrice(token.type, token.supply, token.params)
        : token.params.basePrice
      
      return NextResponse.json({
        success: true,
        trade: result.trade,
        refund: result.refund,
        newBalance: tradingState.getUserTokenBalance(effectiveUserId, tokenId),
        newSolBalance: tradingState.getUserSolBalance(effectiveUserId),
        newPrice,
        newSupply: token.supply,
      })
      
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "buy" or "sell"' },
        { status: 400 }
      )
    }
    
  } catch (error: any) {
    console.error('Trade error:', error)
    return NextResponse.json(
      { error: error.message || 'Trade failed' },
      { status: 500 }
    )
  }
}

// Get trade preview without executing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tokenId } = await params
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action')
  const amount = parseInt(searchParams.get('amount') || '1')
  
  const token = tradingState.getToken(tokenId)
  if (!token) {
    return NextResponse.json({ error: 'Token not found' }, { status: 404 })
  }
  
  if (action === 'buy') {
    const cost = calculateBuyCost(token.type, token.supply, amount, token.params)
    return NextResponse.json({
      action: 'buy',
      amount,
      tokenCost: cost.tokenCost,
      creatorFee: cost.creatorFee,
      platformFee: cost.platformFee,
      totalCost: cost.totalCost,
      pricePerToken: cost.pricePerToken,
      newPrice: cost.newPrice,
      currentPrice: getCurrentPrice(token.type, token.supply, token.params),
    })
  } else if (action === 'sell') {
    if (amount > token.supply) {
      return NextResponse.json({ error: 'Amount exceeds supply' }, { status: 400 })
    }
    const refund = calculateSellRefund(token.type, token.supply, amount, token.params)
    return NextResponse.json({
      action: 'sell',
      amount,
      grossRefund: refund.grossRefund,
      creatorFee: refund.creatorFee,
      platformFee: refund.platformFee,
      netRefund: refund.netRefund,
      pricePerToken: refund.pricePerToken,
      newPrice: refund.newPrice,
      currentPrice: getCurrentPrice(token.type, token.supply, token.params),
    })
  }
  
  return NextResponse.json({ error: 'Specify action=buy or action=sell' }, { status: 400 })
}

