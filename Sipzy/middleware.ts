import { Address } from 'viem'
import { paymentMiddleware, Resource, Network } from 'x402-next'
import { NextRequest } from 'next/server'

const address = process.env.NEXT_PUBLIC_RECEIVER_ADDRESS as Address
const network = (process.env.NEXT_PUBLIC_NETWORK || 'solana-devnet') as Network
const facilitatorUrl = process.env.NEXT_PUBLIC_FACILITATOR_URL as Resource
const cdpClientKey = process.env.NEXT_PUBLIC_CDP_CLIENT_KEY as string

const x402PaymentMiddleware = paymentMiddleware(
  address,
  {
    // Original template routes
    '/content/cheap': {
      price: '$0.01',
      config: {
        description: 'Access to cheap content',
      },
      network,
    },
    '/content/expensive': {
      price: '$0.25',
      config: {
        description: 'Access to expensive content',
      },
      network,
    },
    // Sipzy Premium Watch Gate
    // Dynamic route pattern for /watch/[id]/premium
    '/watch/:id/premium': {
      price: '$0.01',
      config: {
        description: 'Premium access to exclusive creator content and chat',
      },
      network,
    },
  },
  {
    url: facilitatorUrl,
  },
  {
    cdpClientKey,
    appLogo: '/sipzy-logo.svg',
    appName: 'Sipzy',
    sessionTokenEndpoint: '/api/x402/session-token',
  },
)

export const middleware = (req: NextRequest) => {
  const delegate = x402PaymentMiddleware as unknown as (
    request: NextRequest,
  ) => ReturnType<typeof x402PaymentMiddleware>
  return delegate(req)
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (metadata files)
     * - api/actions (Solana Actions/Blinks API)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/actions).*)',
    '/', // Include the root path explicitly
  ],
}
