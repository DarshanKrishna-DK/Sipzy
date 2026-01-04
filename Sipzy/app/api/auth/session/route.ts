import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { DEMO_MODE, mockUser, mockCreator, simulateDelay } from '@/lib/mock-data'

export async function GET() {
  // Demo mode - check demo session
  if (DEMO_MODE) {
    await simulateDelay(200)
    
    const cookieStore = await cookies()
    const demoSession = cookieStore.get('demo_session')
    
    if (demoSession) {
      try {
        const session = JSON.parse(demoSession.value)
        if (session.exp > Date.now()) {
          return NextResponse.json({
            authenticated: true,
            user: {
              ...mockUser,
              walletAddress: session.walletAddress,
            }
          })
        }
      } catch (e) {
        // Invalid session
      }
    }
    
    return NextResponse.json({ authenticated: false })
  }

  // Production mode
  try {
    const { getCurrentUser } = await import('@/lib/auth')
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ authenticated: false })
    }
    
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      }
    })
  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json({ authenticated: false })
  }
}
