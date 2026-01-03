import { ACTIONS_CORS_HEADERS } from '@solana/actions'
import { NextResponse } from 'next/server'

/**
 * Actions.json endpoint for Solana Actions discovery
 * This file tells wallets and clients what actions are available
 */
export async function GET() {
  const payload = {
    rules: [
      {
        pathPattern: '/api/actions/trade',
        apiPath: '/api/actions/trade',
      },
      {
        pathPattern: '/api/actions/trade/**',
        apiPath: '/api/actions/trade/**',
      },
    ],
  }

  return NextResponse.json(payload, { headers: ACTIONS_CORS_HEADERS })
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: ACTIONS_CORS_HEADERS })
}

