import {
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
  ACTIONS_CORS_HEADERS,
  createPostResponse,
} from '@solana/actions'
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  clusterApiUrl,
} from '@solana/web3.js'
import { NextRequest, NextResponse } from 'next/server'

// Program ID - Update after deployment (using devnet program or System Program as fallback)
const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || '11111111111111111111111111111111'
)

// Bonding curve constants
const BASE_PRICE_LAMPORTS = 10_000_000 // 0.01 SOL
const SLOPE_LAMPORTS = 100_000 // 0.0001 SOL
const LAMPORTS_PER_SOL = 1_000_000_000

// Default creator wallet (treasury) - Update in production (using System Program as fallback)
const DEFAULT_CREATOR = new PublicKey(
  process.env.NEXT_PUBLIC_TREASURY_ADDRESS || '11111111111111111111111111111111'
)

// RPC connection
const connection = new Connection(
  process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl('devnet'),
  'confirmed'
)

/**
 * Derive pool PDA from YouTube ID
 */
function derivePoolPDA(youtubeId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('sipzy_pool'), Buffer.from(youtubeId)],
    PROGRAM_ID
  )
}

/**
 * Calculate price for buying tokens
 */
function calculateBuyCost(currentSupply: number, amount: number): number {
  const baseCost = amount * BASE_PRICE_LAMPORTS
  const startSupply = currentSupply
  const endSupply = currentSupply + amount
  
  const first = startSupply
  const last = endSupply - 1
  const sumIndices = amount > 0 ? (amount * (first + last)) / 2 : 0
  const slopeCost = sumIndices * SLOPE_LAMPORTS
  
  return baseCost + slopeCost
}

/**
 * GET handler - Returns the Action metadata for the Blink
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const youtubeId = searchParams.get('id') || 'dQw4w9WgXcQ'
  
  // Fetch current pool state to show real price
  let currentSupply = 0
  let currentPrice = BASE_PRICE_LAMPORTS / LAMPORTS_PER_SOL
  
  try {
    const [poolPDA] = derivePoolPDA(youtubeId)
    const accountInfo = await connection.getAccountInfo(poolPDA)
    
    if (accountInfo) {
      // Parse supply from account data (offset: 4 + youtubeId.length + 32 + 8)
      const data = accountInfo.data.slice(8)
      const youtubeIdLen = data.readUInt32LE(0)
      const offset = 4 + youtubeIdLen + 32 + 8
      currentSupply = Number(data.readBigUInt64LE(offset))
      currentPrice = (BASE_PRICE_LAMPORTS + currentSupply * SLOPE_LAMPORTS) / LAMPORTS_PER_SOL
    }
  } catch (error) {
    console.log('Pool not found, using defaults')
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
  
  const payload: ActionGetResponse = {
    type: 'action',
    icon: `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
    title: `🚀 Trade Sipzy Tokens`,
    description: `Buy creator tokens for this video! Current price: ${currentPrice.toFixed(4)} SOL per token. Supply: ${currentSupply} tokens. 10% fee goes to the creator.`,
    label: 'Buy Tokens',
    links: {
      actions: [
        {
          label: 'Buy 1 Token',
          href: `${baseUrl}/api/actions/trade?id=${youtubeId}&amount=1`,
          type: 'transaction',
        },
        {
          label: 'Buy 5 Tokens',
          href: `${baseUrl}/api/actions/trade?id=${youtubeId}&amount=5`,
          type: 'transaction',
        },
        {
          label: 'Buy 10 Tokens',
          href: `${baseUrl}/api/actions/trade?id=${youtubeId}&amount=10`,
          type: 'transaction',
        },
        {
          label: 'Custom Amount',
          href: `${baseUrl}/api/actions/trade?id=${youtubeId}&amount={amount}`,
          type: 'transaction',
          parameters: [
            {
              name: 'amount',
              label: 'Enter token amount',
              required: true,
              type: 'number',
            },
          ],
        },
      ],
    },
  }

  return NextResponse.json(payload, { headers: ACTIONS_CORS_HEADERS })
}

/**
 * POST handler - Creates the transaction for buying tokens
 */
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const youtubeId = searchParams.get('id') || 'dQw4w9WgXcQ'
  const amountStr = searchParams.get('amount') || '1'
  const amount = parseInt(amountStr)

  if (isNaN(amount) || amount <= 0) {
    return NextResponse.json(
      { error: 'Invalid amount' },
      { status: 400, headers: ACTIONS_CORS_HEADERS }
    )
  }

  try {
    const body: ActionPostRequest = await request.json()
    const account = new PublicKey(body.account)
    
    // Derive pool PDA
    const [poolPDA] = derivePoolPDA(youtubeId)
    
    // Check if pool exists
    const poolInfo = await connection.getAccountInfo(poolPDA)
    
    let transaction: Transaction
    
    if (!poolInfo) {
      // Pool doesn't exist - create initialize + buy transaction
      const initIx = buildInitializeInstruction(
        account,
        poolPDA,
        youtubeId,
        DEFAULT_CREATOR
      )
      
      const buyIx = buildBuyInstruction(
        account,
        poolPDA,
        DEFAULT_CREATOR,
        amount
      )
      
      transaction = new Transaction().add(initIx).add(buyIx)
    } else {
      // Pool exists - get creator wallet from pool state
      const data = poolInfo.data.slice(8)
      const youtubeIdLen = data.readUInt32LE(0)
      const creatorWalletBytes = data.slice(4 + youtubeIdLen, 4 + youtubeIdLen + 32)
      const creatorWallet = new PublicKey(creatorWalletBytes)
      
      // Get current supply for cost calculation
      const supplyOffset = 4 + youtubeIdLen + 32 + 8
      const currentSupply = Number(data.readBigUInt64LE(supplyOffset))
      
      const buyIx = buildBuyInstruction(
        account,
        poolPDA,
        creatorWallet,
        amount
      )
      
      transaction = new Transaction().add(buyIx)
    }
    
    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
    transaction.recentBlockhash = blockhash
    transaction.feePayer = account
    
    // Create response
    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        type: 'transaction',
        transaction,
        message: `Buying ${amount} Sipzy token${amount > 1 ? 's' : ''} for video ${youtubeId}`,
      },
    })

    return NextResponse.json(payload, { headers: ACTIONS_CORS_HEADERS })
  } catch (error: any) {
    console.error('Error creating transaction:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create transaction' },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    )
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, { headers: ACTIONS_CORS_HEADERS })
}

// Helper functions to build instructions

function buildInitializeInstruction(
  authority: PublicKey,
  pool: PublicKey,
  youtubeId: string,
  creatorWallet: PublicKey
) {
  // Discriminator for initialize_pool
  const discriminator = Buffer.from([0x85, 0x34, 0x17, 0x4c, 0x32, 0x54, 0x9b, 0x76])
  
  // Serialize youtube_id
  const youtubeIdBytes = Buffer.from(youtubeId, 'utf8')
  const youtubeIdLen = Buffer.alloc(4)
  youtubeIdLen.writeUInt32LE(youtubeIdBytes.length)
  
  // Serialize creator_wallet
  const creatorWalletBytes = creatorWallet.toBuffer()
  
  const data = Buffer.concat([discriminator, youtubeIdLen, youtubeIdBytes, creatorWalletBytes])
  
  return {
    programId: PROGRAM_ID,
    keys: [
      { pubkey: pool, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  }
}

function buildBuyInstruction(
  buyer: PublicKey,
  pool: PublicKey,
  creatorWallet: PublicKey,
  amount: number
) {
  // Discriminator for buy_tokens
  const discriminator = Buffer.from([0xf1, 0xe3, 0x52, 0x4a, 0x8b, 0x12, 0x7d, 0x93])
  
  // Serialize amount
  const amountBuf = Buffer.alloc(8)
  amountBuf.writeBigUInt64LE(BigInt(amount))
  
  const data = Buffer.concat([discriminator, amountBuf])
  
  return {
    programId: PROGRAM_ID,
    keys: [
      { pubkey: pool, isSigner: false, isWritable: true },
      { pubkey: buyer, isSigner: true, isWritable: true },
      { pubkey: creatorWallet, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  }
}

