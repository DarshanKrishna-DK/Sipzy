import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { 
  DEMO_MODE, 
  mockCreator, 
  mockCreatorWithCoin,
  mockStats, 
  simulateDelay 
} from '@/lib/mock-data'

// In-memory state for demo mode
let demoCreatorState = { ...mockCreator }

export async function GET() {
  // Demo mode
  if (DEMO_MODE) {
    await simulateDelay(300)
    
    const cookieStore = await cookies()
    const demoSession = cookieStore.get('demo_session')
    
    if (!demoSession) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    return NextResponse.json({
      creator: {
        id: demoCreatorState.id,
        channelId: demoCreatorState.channelId,
        channelName: demoCreatorState.channelName,
        channelImage: demoCreatorState.channelImage,
        subscriberCount: demoCreatorState.subscriberCount,
        coinCreated: demoCreatorState.coinCreated,
        coinAddress: demoCreatorState.coinAddress,
        autoApproveVideos: demoCreatorState.autoApproveVideos,
      },
      stats: mockStats,
    })
  }

  // Production mode
  try {
    const { getCurrentUser } = await import('@/lib/auth')
    const { prisma } = await import('@/lib/db')
    
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    if (!user.creator) {
      return NextResponse.json({ error: 'Not a creator' }, { status: 404 })
    }
    
    // Get creator stats
    const videosCount = await prisma.video.count({
      where: { creatorId: user.creator.id },
    })
    
    const approvedVideos = await prisma.video.count({
      where: { creatorId: user.creator.id, status: 'APPROVED' },
    })
    
    const pendingVideos = await prisma.video.count({
      where: { creatorId: user.creator.id, status: 'PENDING' },
    })
    
    return NextResponse.json({
      creator: {
        id: user.creator.id,
        channelId: user.creator.channelId,
        channelName: user.creator.channelName,
        channelImage: user.creator.channelImage,
        subscriberCount: user.creator.subscriberCount,
        coinCreated: user.creator.coinCreated,
        coinAddress: user.creator.coinAddress,
        autoApproveVideos: user.creator.autoApproveVideos,
      },
      stats: {
        totalVideos: videosCount,
        approvedVideos,
        pendingVideos,
      },
    })
  } catch (error) {
    console.error('Creator profile error:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  // Demo mode
  if (DEMO_MODE) {
    await simulateDelay(400)
    
    const body = await request.json()
    const { coinCreated, coinAddress, autoApproveVideos } = body
    
    // Update in-memory state
    if (coinCreated !== undefined) demoCreatorState.coinCreated = coinCreated
    if (coinAddress) demoCreatorState.coinAddress = coinAddress
    if (autoApproveVideos !== undefined) demoCreatorState.autoApproveVideos = autoApproveVideos
    
    return NextResponse.json({ success: true, creator: demoCreatorState })
  }

  // Production mode
  try {
    const { getCurrentUser } = await import('@/lib/auth')
    const { prisma } = await import('@/lib/db')
    
    const user = await getCurrentUser()
    
    if (!user || !user.creator) {
      return NextResponse.json({ error: 'Not a creator' }, { status: 401 })
    }
    
    const body = await request.json()
    const { autoApproveVideos, coinAddress, metadataUri } = body
    
    const updated = await prisma.creator.update({
      where: { id: user.creator.id },
      data: {
        ...(autoApproveVideos !== undefined && { autoApproveVideos }),
        ...(coinAddress && { coinAddress, coinCreated: true }),
        ...(metadataUri && { metadataUri }),
      },
    })
    
    return NextResponse.json({ success: true, creator: updated })
  } catch (error) {
    console.error('Creator update error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}

// Reset demo state (useful for testing)
export async function DELETE() {
  if (DEMO_MODE) {
    demoCreatorState = { ...mockCreator }
    return NextResponse.json({ success: true, message: 'Demo state reset' })
  }
  return NextResponse.json({ error: 'Not in demo mode' }, { status: 400 })
}
