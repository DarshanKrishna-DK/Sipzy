'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { BondingCurveChart } from '@/components/bonding-curve-chart'
import { 
  deriveCreatorPoolPDA, 
  fetchPoolState, 
  calculateBuyCost, 
  calculateSellRefund,
  LAMPORTS_PER_SOL,
} from '@/lib/program'

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

// Mock pool data for demo mode
const getMockPoolData = (channelId: string) => ({
  displayName: 'Demo Creator',
  totalSupply: { toNumber: () => 150 },
  basePrice: { toNumber: () => 10_000_000 },
  curveParam: { toNumber: () => 100_000 },
  reserveSol: { toNumber: () => 25_000_000 },
  address: 'DemoPoolXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
})

// Mock creator data for demo mode
const getMockCreatorData = (channelId: string) => ({
  channelName: 'TechVision Studios',
  channelImage: 'https://api.dicebear.com/7.x/initials/svg?seed=TV&backgroundColor=6366f1',
  subscriberCount: 125000,
})

interface PageParams {
  channelId: string
}

export default function CreatorPage({ params }: { params: Promise<PageParams> }) {
  const { channelId } = use(params)
  const { connection } = useConnection()
  const { publicKey, connected } = useWallet()
  
  const [poolData, setPoolData] = useState<any>(null)
  const [creatorData, setCreatorData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [tradeTab, setTradeTab] = useState<'buy' | 'sell'>('buy')
  const [amount, setAmount] = useState('')
  const [estimatedCost, setEstimatedCost] = useState(0)

  useEffect(() => {
    async function fetchPool() {
      try {
        // In demo mode, use mock data
        if (DEMO_MODE) {
          setPoolData(getMockPoolData(channelId))
          setCreatorData(getMockCreatorData(channelId))
          setIsLoading(false)
          return
        }

        // Production mode - fetch from Solana
        const [poolAddress] = deriveCreatorPoolPDA(channelId)
        const state = await fetchPoolState(connection, poolAddress)
        
        if (state) {
          setPoolData({
            ...state,
            address: poolAddress.toString(),
          })
        }
        
        // Fetch creator data from API
        const res = await fetch(`/api/search?q=${channelId}`)
        const data = await res.json()
        if (data.creator) {
          setCreatorData(data.creator)
        }
      } catch (error) {
        console.error('Failed to fetch pool:', error)
        
        // In case of error, use mock data in demo mode
        if (DEMO_MODE) {
          setPoolData(getMockPoolData(channelId))
          setCreatorData(getMockCreatorData(channelId))
        }
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchPool()
  }, [channelId, connection])

  useEffect(() => {
    if (!poolData || !amount) {
      setEstimatedCost(0)
      return
    }
    
    const qty = parseInt(amount) || 0
    if (qty <= 0) {
      setEstimatedCost(0)
      return
    }
    
    if (tradeTab === 'buy') {
      const { total } = calculateBuyCost(poolData, qty)
      setEstimatedCost(total)
    } else {
      const { net } = calculateSellRefund(poolData, qty)
      setEstimatedCost(net)
    }
  }, [amount, tradeTab, poolData])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  const currentSupply = poolData?.totalSupply?.toNumber() || 0
  const basePrice = poolData?.basePrice?.toNumber() || 10_000_000
  const slope = poolData?.curveParam?.toNumber() || 100_000
  const currentPrice = basePrice + (currentSupply * slope)

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Demo Mode Banner */}
      {DEMO_MODE && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border-b border-amber-500/30 py-2 px-4 text-center">
          <span className="text-amber-400 text-sm font-medium">
            🎮 Demo Mode — Simulated data, no real transactions
          </span>
        </div>
      )}

      {/* Header */}
      <header className={`fixed left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-zinc-800 ${DEMO_MODE ? 'top-10' : 'top-0'}`}>
        <div className="flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center font-bold text-black text-lg">
              S
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Sipzy
            </span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link href="/explore" className="text-zinc-400 hover:text-white transition">
              Explore
            </Link>
            <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm font-semibold">
              $CREATOR
            </span>
            <WalletMultiButton className="!bg-zinc-800 !rounded-xl !h-10" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className={`flex min-h-screen ${DEMO_MODE ? 'pt-[113px]' : 'pt-[73px]'}`}>
        {/* Creator Info Section */}
        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            {/* Creator Profile Card */}
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-3xl border border-purple-500/20 p-8 mb-8">
              <div className="flex items-start gap-6">
                {creatorData?.channelImage ? (
                  <img
                    src={creatorData.channelImage}
                    alt={creatorData.channelName}
                    className="w-24 h-24 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-4xl font-bold text-white">
                      {(creatorData?.channelName || poolData?.displayName || 'C').charAt(0)}
                    </span>
                  </div>
                )}
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-white">
                      {creatorData?.channelName || poolData?.displayName || 'Creator'}
                    </h1>
                    <span className="px-3 py-1 bg-purple-500/20 text-purple-400 text-sm rounded-full font-semibold">
                      $CREATOR
                    </span>
                  </div>
                  <p className="text-zinc-400 mb-4">
                    {creatorData?.subscriberCount 
                      ? `${creatorData.subscriberCount.toLocaleString()} subscribers`
                      : 'YouTube Creator'}
                  </p>
                  <div className="flex gap-3">
                    <a
                      href={`https://youtube.com/channel/${channelId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
                        <polygon fill="#fff" points="9.545,15.568 15.818,12 9.545,8.432"/>
                      </svg>
                      View Channel
                    </a>
                    <Link
                      href="/explore"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition"
                    >
                      View All Tokens →
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* About Creator Coins */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 mb-8">
              <h2 className="text-xl font-bold mb-4">About $CREATOR Coins</h2>
              <p className="text-zinc-400 mb-4">
                $CREATOR coins represent long-term equity in a creator's career. Unlike volatile event-based tokens,
                creator coins grow steadily using a linear bonding curve.
              </p>
              
              <div className="p-4 bg-zinc-800 rounded-xl">
                <p className="text-sm text-zinc-400">
                  <span className="text-purple-400 font-mono">Price = Base + (Supply × Slope)</span>
                  <br />
                  Predictable, steady growth. Perfect for supporting your favorite creators long-term.
                </p>
              </div>
            </div>

            {/* Stats Grid */}
            {poolData && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                  <p className="text-zinc-500 text-xs mb-1">Market Cap</p>
                  <p className="text-lg font-bold">
                    {((currentSupply * currentPrice) / LAMPORTS_PER_SOL).toFixed(4)} SOL
                  </p>
                </div>
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                  <p className="text-zinc-500 text-xs mb-1">Holders</p>
                  <p className="text-lg font-bold">{DEMO_MODE ? '12' : '-'}</p>
                </div>
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                  <p className="text-zinc-500 text-xs mb-1">Total Volume</p>
                  <p className="text-lg font-bold">{DEMO_MODE ? '0.58 SOL' : '-'}</p>
                </div>
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                  <p className="text-zinc-500 text-xs mb-1">Reserve</p>
                  <p className="text-lg font-bold">
                    {((poolData?.reserveSol?.toNumber() || 0) / LAMPORTS_PER_SOL).toFixed(4)} SOL
                  </p>
                </div>
              </div>
            )}

            {/* Info about new trading system */}
            {DEMO_MODE && (
              <div className="mt-8 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 rounded-2xl border border-emerald-500/20 p-6">
                <h3 className="text-lg font-bold text-emerald-400 mb-2">
                  🚀 Try the New Trading System!
                </h3>
                <p className="text-zinc-400 mb-4">
                  We've built a complete demo trading system. Visit the Explore page to see all tokens 
                  and experience the full buy/sell flow with bonding curve economics.
                </p>
                <Link
                  href="/explore"
                  className="inline-flex px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-semibold rounded-xl hover:opacity-90 transition"
                >
                  Explore & Trade Tokens
                </Link>
              </div>
            )}
          </div>
        </main>

        {/* Trading Sidebar */}
        <aside className="hidden lg:block w-[400px] flex-shrink-0">
          <div className={`fixed right-0 w-[400px] h-[calc(100vh-${DEMO_MODE ? '113px' : '73px'})] overflow-y-auto p-6 border-l border-zinc-800 ${DEMO_MODE ? 'top-[113px]' : 'top-[73px]'}`}>
            {!poolData ? (
              /* Pool Not Created */
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Coin Not Created</h3>
                <p className="text-zinc-400 text-sm">
                  This creator hasn't created their $CREATOR coin yet.
                </p>
              </div>
            ) : (
              /* Trading Panel */
              <>
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 mb-6">
                  <h2 className="text-lg font-bold text-purple-400 mb-4">
                    EQUITY CURVE
                  </h2>
                  
                  {/* Price & Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <p className="text-zinc-500 text-xs mb-1">Current Price</p>
                      <p className="text-2xl font-bold text-white">
                        {(currentPrice / LAMPORTS_PER_SOL).toFixed(4)} SOL
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-xs mb-1">Supply</p>
                      <p className="text-2xl font-bold text-white">
                        {currentSupply.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="mb-6">
                    <BondingCurveChart
                      type="creator"
                      currentSupply={currentSupply}
                      basePrice={basePrice}
                      curveParam={slope}
                      width={340}
                      height={160}
                    />
                  </div>

                  {/* Trade Tabs */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setTradeTab('buy')}
                      className={`flex-1 py-2.5 rounded-xl font-semibold transition ${
                        tradeTab === 'buy'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      Buy
                    </button>
                    <button
                      onClick={() => setTradeTab('sell')}
                      className={`flex-1 py-2.5 rounded-xl font-semibold transition ${
                        tradeTab === 'sell'
                          ? 'bg-red-500 text-white'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      Sell
                    </button>
                  </div>

                  {/* Amount Input */}
                  <div className="mb-4">
                    <label className="text-zinc-500 text-xs mb-2 block">
                      Amount (tokens)
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-lg focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  {/* Estimated Cost */}
                  <div className="p-4 bg-zinc-800 rounded-xl mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">
                        {tradeTab === 'buy' ? 'Total Cost' : 'You Receive'}
                      </span>
                      <span className="text-white font-semibold">
                        {(estimatedCost / LAMPORTS_PER_SOL).toFixed(4)} SOL
                      </span>
                    </div>
                    <div className="flex justify-between text-xs mt-2">
                      <span className="text-zinc-500">Creator Fee (10%)</span>
                      <span className="text-purple-400">
                        {((estimatedCost * 0.05) / LAMPORTS_PER_SOL).toFixed(6)} SOL
                      </span>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-zinc-500">Platform Fee (1%)</span>
                      <span className="text-zinc-500">
                        {((estimatedCost * 0.01) / LAMPORTS_PER_SOL).toFixed(6)} SOL
                      </span>
                    </div>
                  </div>

                  {/* Trade Button */}
                  {DEMO_MODE ? (
                    <Link
                      href="/explore"
                      className="block w-full py-3 rounded-xl font-semibold transition bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 text-center"
                    >
                      Trade on Explore Page →
                    </Link>
                  ) : !connected ? (
                    <WalletMultiButton className="!w-full !bg-gradient-to-r !from-purple-500 !to-pink-500 !rounded-xl !h-12 !font-semibold !justify-center" />
                  ) : (
                    <button
                      disabled={!amount || parseInt(amount) <= 0}
                      className={`w-full py-3 rounded-xl font-semibold transition ${
                        tradeTab === 'buy'
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90'
                          : 'bg-gradient-to-r from-red-500 to-orange-500 text-white hover:opacity-90'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {tradeTab === 'buy' ? 'Buy Tokens' : 'Sell Tokens'}
                    </button>
                  )}
                </div>

                {/* Demo mode hint */}
                {DEMO_MODE && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
                    <p className="text-amber-400 text-sm">
                      💡 For full trading functionality, visit the{' '}
                      <Link href="/explore" className="underline font-semibold">
                        Explore page
                      </Link>
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
