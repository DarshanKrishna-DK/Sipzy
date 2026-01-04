import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { DEMO_MODE, simulateDelay } from '@/lib/mock-data'

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, signature, nonce } = await req.json()
    
    if (!walletAddress || !signature || !nonce) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Demo mode - always succeed
    if (DEMO_MODE) {
      await simulateDelay(400)
      
      // Set a demo session cookie
      const cookieStore = await cookies()
      cookieStore.set('demo_session', JSON.stringify({
        userId: 'demo-user-001',
        walletAddress,
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
      }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 // 7 days
      })
      
      return NextResponse.json({ 
        success: true, 
        message: 'Demo authentication successful' 
      })
    }

    // Production mode - verify signature
    const { verifySignature, createSession } = await import('@/lib/auth')
    
    const isValid = await verifySignature(walletAddress, signature, nonce)
    
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    
    await createSession(walletAddress)
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Verify error:', error)
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    )
  }
}
