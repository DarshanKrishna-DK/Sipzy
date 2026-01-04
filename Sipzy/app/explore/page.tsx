'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

interface Token {
  id: string
  type: 'CREATOR' | 'VIDEO'
  name: string
  symbol: string
  creatorName: string
  creatorImage: string | null
  videoTitle?: string
  videoThumbnail?: string
  supply: number
  currentPrice: number
  marketCap: number
  volume24h: number
  volumeAll: number
  holders: number
  totalTrades: number
  allTimeHigh: number
  allTimeLow: number
  createdAt: number
  priceChange24h: number
}

interface GlobalStats {
  totalTokens: number
  creatorTokens: number
  videoTokens: number
  totalVolume: number
  totalMarketCap: number
  totalTrades: number
}

type TabType = 'all' | 'creator' | 'video'
type SortType = 'volume' | 'price' | 'marketCap' | 'newest' | 'holders'

export default function ExplorePage() {
  const { connected } = useWallet()
  const [mounted, setMounted] = useState(false)
  const [tokens, setTokens] = useState<Token[]>([])
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [sortBy, setSortBy] = useState<SortType>('volume')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    fetchTokens()
  }, [mounted, activeTab, sortBy])

  const fetchTokens = async () => {
    setIsLoading(true)
    try {
      const typeParam = activeTab === 'all' ? '' : `type=${activeTab.toUpperCase()}`
      const res = await fetch(`/api/tokens?${typeParam}&sort=${sortBy}`)
      
      if (!res.ok) throw new Error('Failed to fetch tokens')
      
      const data = await res.json()
      setTokens(data.tokens || [])
      setStats(data.stats || null)
    } catch (err) {
      console.error('Fetch tokens error:', err)
      
      // In demo mode, seed with mock data if none exists
      if (DEMO_MODE) {
        setTokens([
          {
            id: 'creator-demo-1',
            type: 'CREATOR',
            name: 'TechVision Token',
            symbol: '$TECH',
            creatorName: 'TechVision Studios',
            creatorImage: 'https://api.dicebear.com/7.x/initials/svg?seed=TV&backgroundColor=6366f1',
            supply: 150,
            currentPrice: 0.00235,
            marketCap: 0.3525,
            volume24h: 0.125,
            volumeAll: 0.58,
            holders: 12,
            totalTrades: 45,
            allTimeHigh: 0.0035,
            allTimeLow: 0.001,
            createdAt: Date.now() - 86400000 * 3,
            priceChange24h: 15.5,
          },
          {
            id: 'video-demo-1',
            type: 'VIDEO',
            name: 'Building Web3 Apps',
            symbol: '$WEB3',
            creatorName: 'TechVision Studios',
            creatorImage: 'https://api.dicebear.com/7.x/initials/svg?seed=TV&backgroundColor=6366f1',
            videoTitle: 'Building Web3 Apps - Complete Guide',
            videoThumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
            supply: 250,
            currentPrice: 0.00085,
            marketCap: 0.2125,
            volume24h: 0.085,
            volumeAll: 0.32,
            holders: 28,
            totalTrades: 78,
            allTimeHigh: 0.0012,
            allTimeLow: 0.0001,
            createdAt: Date.now() - 86400000 * 2,
            priceChange24h: 22.3,
          },
          {
            id: 'creator-demo-2',
            type: 'CREATOR',
            name: 'CryptoNinja Token',
            symbol: '$NINJA',
            creatorName: 'CryptoNinja',
            creatorImage: 'https://api.dicebear.com/7.x/initials/svg?seed=CN&backgroundColor=ec4899',
            supply: 320,
            currentPrice: 0.00178,
            marketCap: 0.5696,
            volume24h: 0.245,
            volumeAll: 1.12,
            holders: 35,
            totalTrades: 112,
            allTimeHigh: 0.0025,
            allTimeLow: 0.001,
            createdAt: Date.now() - 86400000 * 5,
            priceChange24h: -5.2,
          },
          {
            id: 'video-demo-2',
            type: 'VIDEO',
            name: 'Solana Tutorial',
            symbol: '$SOL101',
            creatorName: 'CryptoNinja',
            creatorImage: 'https://api.dicebear.com/7.x/initials/svg?seed=CN&backgroundColor=ec4899',
            videoTitle: 'Solana Development 101',
            videoThumbnail: 'https://i.ytimg.com/vi/LXb3EKWsInQ/maxresdefault.jpg',
            supply: 180,
            currentPrice: 0.00055,
            marketCap: 0.099,
            volume24h: 0.045,
            volumeAll: 0.18,
            holders: 15,
            totalTrades: 42,
            allTimeHigh: 0.00075,
            allTimeLow: 0.0001,
            createdAt: Date.now() - 86400000,
            priceChange24h: 8.7,
          },
        ])
        setStats({
          totalTokens: 4,
          creatorTokens: 2,
          videoTokens: 2,
          totalVolume: 2.2,
          totalMarketCap: 1.2346,
          totalTrades: 277,
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const filteredTokens = tokens.filter(token => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      token.name.toLowerCase().includes(query) ||
      token.symbol.toLowerCase().includes(query) ||
      token.creatorName.toLowerCase().includes(query)
    )
  })

  const formatSol = (amount: number) => {
    if (amount < 0.0001) return '< 0.0001'
    if (amount < 1) return amount.toFixed(4)
    return amount.toFixed(2)
  }

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change.toFixed(1)}%`
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Demo Mode Banner */}
      {DEMO_MODE && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border-b border-amber-500/30 py-2 px-4 text-center">
          <span className="text-amber-400 text-sm font-medium">
            🎮 Demo Mode Active — All transactions are simulated
          </span>
        </div>
      )}

      {/* Header */}
      <header className={`fixed left-0 right-0 z-40 bg-black/80 backdrop-blur-xl border-b border-zinc-800 ${DEMO_MODE ? 'top-10' : 'top-0'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center font-bold text-black text-lg">
              S
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Sipzy
            </span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="px-4 py-2 text-zinc-400 hover:text-white transition"
            >
              Dashboard
            </Link>
            <WalletMultiButton className="!bg-zinc-800 !rounded-xl !h-10" />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className={`px-6 pb-16 ${DEMO_MODE ? 'pt-32' : 'pt-24'}`}>
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Explore Tokens</h1>
            <p className="text-zinc-400">Discover and trade creator and video tokens</p>
          </div>

          {/* Global Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                <p className="text-zinc-500 text-xs mb-1">Total Tokens</p>
                <p className="text-xl font-bold">{stats.totalTokens}</p>
              </div>
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                <p className="text-zinc-500 text-xs mb-1">Creator Tokens</p>
                <p className="text-xl font-bold text-purple-400">{stats.creatorTokens}</p>
              </div>
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                <p className="text-zinc-500 text-xs mb-1">Video Tokens</p>
                <p className="text-xl font-bold text-cyan-400">{stats.videoTokens}</p>
              </div>
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                <p className="text-zinc-500 text-xs mb-1">Total Volume</p>
                <p className="text-xl font-bold text-emerald-400">{formatSol(stats.totalVolume)} SOL</p>
              </div>
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                <p className="text-zinc-500 text-xs mb-1">Market Cap</p>
                <p className="text-xl font-bold">{formatSol(stats.totalMarketCap)} SOL</p>
              </div>
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                <p className="text-zinc-500 text-xs mb-1">Total Trades</p>
                <p className="text-xl font-bold">{stats.totalTrades}</p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            {/* Tabs */}
            <div className="flex bg-zinc-900 rounded-xl p-1 border border-zinc-800">
              {(['all', 'creator', 'video'] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    activeTab === tab
                      ? 'bg-zinc-700 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {tab === 'all' ? 'All Tokens' : tab === 'creator' ? 'Creator Tokens' : 'Video Tokens'}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search tokens..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600"
                />
              </div>
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortType)}
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-zinc-600"
            >
              <option value="volume">Volume (24h)</option>
              <option value="marketCap">Market Cap</option>
              <option value="price">Price</option>
              <option value="holders">Holders</option>
              <option value="newest">Newest</option>
            </select>
          </div>

          {/* Token List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
            </div>
          ) : filteredTokens.length === 0 ? (
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">No tokens found</h3>
              <p className="text-zinc-400 mb-6">
                {searchQuery 
                  ? 'Try a different search term'
                  : 'Be the first to create a token!'
                }
              </p>
              {!searchQuery && (
                <Link
                  href="/dashboard"
                  className="inline-flex px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl font-semibold text-black hover:opacity-90 transition"
                >
                  Create Token
                </Link>
              )}
            </div>
          ) : (
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
              {/* Table Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 border-b border-zinc-800 text-sm text-zinc-500 font-medium">
                <div className="col-span-4">Token</div>
                <div className="col-span-2 text-right">Price</div>
                <div className="col-span-2 text-right">24h Change</div>
                <div className="col-span-2 text-right">Market Cap</div>
                <div className="col-span-2 text-right">Volume (24h)</div>
              </div>

              {/* Token Rows */}
              <div className="divide-y divide-zinc-800">
                {filteredTokens.map((token) => (
                  <Link
                    key={token.id}
                    href={`/token/${token.id}`}
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 hover:bg-zinc-800/50 transition cursor-pointer"
                  >
                    {/* Token Info */}
                    <div className="col-span-4 flex items-center gap-3">
                      {token.type === 'VIDEO' && token.videoThumbnail ? (
                        <img
                          src={token.videoThumbnail}
                          alt={token.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : token.creatorImage ? (
                        <img
                          src={token.creatorImage}
                          alt={token.creatorName}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          token.type === 'CREATOR' 
                            ? 'bg-gradient-to-br from-purple-500 to-pink-500' 
                            : 'bg-gradient-to-br from-cyan-500 to-blue-500'
                        }`}>
                          <span className="text-lg">
                            {token.type === 'CREATOR' ? '👤' : '🎬'}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{token.symbol}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            token.type === 'CREATOR'
                              ? 'bg-purple-500/20 text-purple-400'
                              : 'bg-cyan-500/20 text-cyan-400'
                          }`}>
                            {token.type === 'CREATOR' ? 'Creator' : 'Video'}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-400 truncate max-w-[200px]">
                          {token.type === 'VIDEO' ? token.videoTitle : token.name}
                        </p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="col-span-2 flex items-center justify-end">
                      <span className="font-mono font-semibold text-white">
                        {formatSol(token.currentPrice)} SOL
                      </span>
                    </div>

                    {/* 24h Change */}
                    <div className="col-span-2 flex items-center justify-end">
                      <span className={`font-semibold ${
                        token.priceChange24h >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {formatChange(token.priceChange24h)}
                      </span>
                    </div>

                    {/* Market Cap */}
                    <div className="col-span-2 flex items-center justify-end">
                      <span className="text-zinc-300">
                        {formatSol(token.marketCap)} SOL
                      </span>
                    </div>

                    {/* Volume */}
                    <div className="col-span-2 flex items-center justify-end">
                      <span className="text-zinc-300">
                        {formatSol(token.volume24h)} SOL
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Info Cards */}
          <div className="grid md:grid-cols-2 gap-6 mt-12">
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl border border-purple-500/30 p-6">
              <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                <span className="text-2xl">👤</span> Creator Tokens
              </h3>
              <p className="text-zinc-400 mb-4">
                Invest in your favorite creators. Creator tokens follow a <strong className="text-white">linear bonding curve</strong> — 
                price increases steadily with each purchase.
              </p>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">•</span>
                  Creators receive 10% initial token allocation
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">•</span>
                  10% of all trades go to the creator
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">•</span>
                  Price adjusts based on subscriber count
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-2xl border border-cyan-500/30 p-6">
              <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                <span className="text-2xl">🎬</span> Video Tokens
              </h3>
              <p className="text-zinc-400 mb-4">
                Bet on viral content. Video tokens use an <strong className="text-white">exponential bonding curve</strong> — 
                early investors get the best prices!
              </p>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li className="flex items-center gap-2">
                  <span className="text-cyan-400">•</span>
                  0.5% price increase per token purchased
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyan-400">•</span>
                  20% of all trades go to the creator
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyan-400">•</span>
                  Higher risk, higher reward potential
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

