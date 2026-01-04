import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { tradingState } from '@/lib/trading-state'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      creatorId,
      creatorName,
      creatorImage,
      subscriberCount,
      name,
      symbol,
    } = body
    
    // Validate required fields
    if (!creatorId || !creatorName || !name || !symbol) {
      return NextResponse.json(
        { error: 'Missing required fields: creatorId, creatorName, name, symbol' },
        { status: 400 }
      )
    }
    
    // Check if creator already has a token
    const existingTokens = tradingState.getTokensByCreator(creatorId)
    const existingCreatorToken = existingTokens.find(t => t.type === 'CREATOR')
    
    if (existingCreatorToken) {
      return NextResponse.json(
        { error: 'Creator already has a token', existingToken: existingCreatorToken },
        { status: 400 }
      )
    }
    
    // Ensure creator user exists in trading state
    tradingState.getOrCreateUser(creatorId, creatorName)
    
    // Create the token
    const token = tradingState.createToken(
      'CREATOR',
      creatorId,
      creatorName,
      creatorImage || null,
      subscriberCount || 0,
      name,
      symbol
    )
    
    // Get creator's initial holdings
    const creatorBalance = tradingState.getUserTokenBalance(creatorId, token.id)
    
    return NextResponse.json({
      success: true,
      token: {
        id: token.id,
        type: token.type,
        name: token.name,
        symbol: token.symbol,
        supply: token.supply,
        creatorAllocation: creatorBalance,
        params: {
          basePrice: token.params.basePrice,
          slope: token.params.slope,
          creatorFeePercent: token.params.creatorFeePercent,
          platformFeePercent: token.params.platformFeePercent,
        },
        createdAt: token.createdAt,
      },
      message: `Created ${symbol} token with ${creatorBalance} initial tokens allocated to creator (10%)`,
    })
    
  } catch (error: any) {
    console.error('Create creator token error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create token' },
      { status: 500 }
    )
  }
}

