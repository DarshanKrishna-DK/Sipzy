import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { DEMO_MODE, mockPendingVideos, simulateDelay } from '@/lib/mock-data'

// In-memory state for demo videos
let demoVideos = [...mockPendingVideos]

export async function GET(request: NextRequest) {
  // Demo mode
  if (DEMO_MODE) {
    await simulateDelay(300)
    
    const cookieStore = await cookies()
    const demoSession = cookieStore.get('demo_session')
    
    if (!demoSession) {
      return NextResponse.json({ error: 'Not a creator' }, { status: 401 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    
    let filteredVideos = demoVideos
    if (status) {
      filteredVideos = demoVideos.filter(v => v.status.toLowerCase() === status.toLowerCase())
    }
    
    return NextResponse.json({
      videos: filteredVideos,
      pagination: {
        page: 1,
        limit: 20,
        total: filteredVideos.length,
        pages: 1,
      },
    })
  }

  // Production mode
  try {
    const { getCurrentUser } = await import('@/lib/auth')
    const { prisma } = await import('@/lib/db')
    
    const user = await getCurrentUser()
    
    if (!user || !user.creator) {
      return NextResponse.json({ error: 'Not a creator' }, { status: 401 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    
    const where = {
      creatorId: user.creator.id,
      ...(status && { status: status.toUpperCase() as any }),
    }
    
    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.video.count({ where }),
    ])
    
    return NextResponse.json({
      videos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Creator videos error:', error)
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 })
  }
}

// Handle video approval/rejection in demo mode
export async function PATCH(request: NextRequest) {
  if (DEMO_MODE) {
    await simulateDelay(300)
    
    const { videoId, action } = await request.json()
    
    if (action === 'approve') {
      demoVideos = demoVideos.map(v => 
        v.id === videoId ? { ...v, status: 'approved' } : v
      )
    } else if (action === 'reject') {
      demoVideos = demoVideos.filter(v => v.id !== videoId)
    }
    
    return NextResponse.json({ success: true })
  }
  
  return NextResponse.json({ error: 'Use specific video endpoint' }, { status: 400 })
}
