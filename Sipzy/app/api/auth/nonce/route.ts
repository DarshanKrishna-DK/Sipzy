import { NextRequest, NextResponse } from 'next/server'
import { DEMO_MODE, mockUser, simulateDelay } from '@/lib/mock-data'

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet')
  
  if (!wallet) {
    return NextResponse.json({ error: 'Wallet address required' }, { status: 400 })
  }

  // Demo mode - return mock nonce
  if (DEMO_MODE) {
    await simulateDelay(300)
    const nonce = `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const message = `Sign this message to authenticate with Sipzy.\n\nWallet: ${wallet}\nNonce: ${nonce}\n\nThis signature is free and does not cost any gas.`
    
    return NextResponse.json({ nonce, message })
  }

  // Production mode - use real database
  try {
    const { generateNonce, createAuthMessage } = await import('@/lib/auth')
    const nonce = await generateNonce(wallet)
    const message = createAuthMessage(wallet, nonce)
    
    return NextResponse.json({ nonce, message })
  } catch (error: any) {
    console.error('Error generating nonce:', error)
    return NextResponse.json(
      { error: 'Failed to generate nonce' },
      { status: 503 }
    )
  }
}
