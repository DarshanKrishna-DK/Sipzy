import { Connection, PublicKey } from '@solana/web3.js'
import { Program, AnchorProvider, Idl, BN } from '@coral-xyz/anchor'
import idl from './idl/sipzy_vault.json'

// Program ID - Update this after deploying to devnet
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || 'SipzyVault111111111111111111111111111111111'
)

// Bonding curve constants (in lamports)
export const BASE_PRICE_LAMPORTS = 10_000_000 // 0.01 SOL
export const SLOPE_LAMPORTS = 100_000 // 0.0001 SOL
export const LAMPORTS_PER_SOL = 1_000_000_000

/**
 * Calculate token price based on current supply
 * Price = (Supply * 0.0001) + 0.01 SOL
 */
export function calculatePrice(supply: number): number {
  return BASE_PRICE_LAMPORTS + (supply * SLOPE_LAMPORTS)
}

/**
 * Calculate price in SOL
 */
export function calculatePriceInSol(supply: number): number {
  return calculatePrice(supply) / LAMPORTS_PER_SOL
}

/**
 * Calculate total cost for buying multiple tokens
 * Uses integral of linear function
 */
export function calculateBuyCost(currentSupply: number, amount: number): number {
  const baseCost = amount * BASE_PRICE_LAMPORTS
  const startSupply = currentSupply
  const endSupply = currentSupply + amount
  
  // Sum of arithmetic sequence: n * (first + last) / 2
  const first = startSupply
  const last = endSupply - 1
  const sumIndices = amount > 0 ? (amount * (first + last)) / 2 : 0
  const slopeCost = sumIndices * SLOPE_LAMPORTS
  
  return baseCost + slopeCost
}

/**
 * Calculate refund for selling tokens
 */
export function calculateSellRefund(currentSupply: number, amount: number): number {
  const grossRefund = calculateBuyCost(currentSupply - amount, amount)
  const creatorFee = Math.floor(grossRefund / 100)
  return grossRefund - creatorFee
}

/**
 * Derive pool PDA from YouTube ID
 */
export function derivePoolPDA(youtubeId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('sipzy_pool'), Buffer.from(youtubeId)],
    PROGRAM_ID
  )
}

/**
 * Get Anchor program instance
 */
export function getProgram(provider: AnchorProvider): Program {
  return new Program(idl as Idl, provider)
}

/**
 * Pool state interface
 */
export interface PoolState {
  youtubeId: string
  creatorWallet: PublicKey
  totalReserveSol: BN
  circulatingSupply: BN
  isClaimed: boolean
  bump: number
  authority: PublicKey
}

/**
 * Fetch pool state from chain
 */
export async function fetchPoolState(
  connection: Connection,
  youtubeId: string
): Promise<PoolState | null> {
  try {
    const [poolPDA] = derivePoolPDA(youtubeId)
    const accountInfo = await connection.getAccountInfo(poolPDA)
    
    if (!accountInfo) {
      return null
    }
    
    // Parse account data using Anchor's account discriminator
    // The first 8 bytes are the discriminator
    const data = accountInfo.data.slice(8)
    
    // Parse string (4 bytes length + content)
    const youtubeIdLen = data.readUInt32LE(0)
    const youtubeIdParsed = data.slice(4, 4 + youtubeIdLen).toString('utf8')
    let offset = 4 + youtubeIdLen
    
    // Parse pubkey (32 bytes)
    const creatorWallet = new PublicKey(data.slice(offset, offset + 32))
    offset += 32
    
    // Parse u64 (8 bytes)
    const totalReserveSol = new BN(data.slice(offset, offset + 8), 'le')
    offset += 8
    
    // Parse u64 (8 bytes)
    const circulatingSupply = new BN(data.slice(offset, offset + 8), 'le')
    offset += 8
    
    // Parse bool (1 byte)
    const isClaimed = data[offset] === 1
    offset += 1
    
    // Parse u8 (1 byte)
    const bump = data[offset]
    offset += 1
    
    // Parse pubkey (32 bytes)
    const authority = new PublicKey(data.slice(offset, offset + 32))
    
    return {
      youtubeId: youtubeIdParsed,
      creatorWallet,
      totalReserveSol,
      circulatingSupply,
      isClaimed,
      bump,
      authority,
    }
  } catch (error) {
    console.error('Error fetching pool state:', error)
    return null
  }
}

