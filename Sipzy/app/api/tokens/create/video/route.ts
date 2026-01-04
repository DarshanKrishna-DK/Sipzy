import { NextRequest, NextResponse } from 'next/server'
import { tradingState } from '@/lib/trading-state'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      creatorId,
      creatorName,
      creatorImage,
      subscriberCount,
      videoId,
      videoTitle,
      videoThumbnail,
      name,
      symbol,
    } = body
    
    // Validate required fields
    if (!creatorId || !creatorName || !videoId || !videoTitle || !name || !symbol) {
      return NextResponse.json(
        { error: 'Missing required fields: creatorId, creatorName, videoId, videoTitle, name, symbol' },
        { status: 400 }
      )
    }
    
    // Check if video already has a token
    const existingTokens = tradingState.getAllTokens()
    const existingVideoToken = existingTokens.find(t => t.type === 'VIDEO' && t.videoId === videoId)
    
    if (existingVideoToken) {
      return NextResponse.json(
        { error: 'Video already has a token', existingToken: existingVideoToken },
        { status: 400 }
      )
    }
    
    // Ensure creator user exists in trading state
    tradingState.getOrCreateUser(creatorId, creatorName)
    
    // Create the token
    const token = tradingState.createToken(
      'VIDEO',
      creatorId,
      creatorName,
      creatorImage || null,
      subscriberCount || 0,
      name,
      symbol,
      videoId,
      videoTitle,
      videoThumbnail
    )
    
    return NextResponse.json({
      success: true,
      token: {
        id: token.id,
        type: token.type,
        name: token.name,
        symbol: token.symbol,
        videoId: token.videoId,
        videoTitle: token.videoTitle,
        supply: token.supply,
        params: {
          basePrice: token.params.basePrice,
          growthRate: token.params.growthRate,
          creatorFeePercent: token.params.creatorFeePercent,
          platformFeePercent: token.params.platformFeePercent,
        },
        createdAt: token.createdAt,
      },
      message: `Created ${symbol} video token. Creator earns 20% of all trades!`,
    })
    
  } catch (error: any) {
    console.error('Create video token error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create token' },
      { status: 500 }
    )
  }
}

