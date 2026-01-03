'use client'

import { FC, useState } from 'react'
import Link from 'next/link'
import { YouTubePlayer } from '@/components/youtube-player'
import { TradingSidebar } from '@/components/trading-sidebar'

interface WatchPageClientProps {
  videoId: string
}

export const WatchPageClient: FC<WatchPageClientProps> = ({ videoId }) => {
  const [showShareModal, setShowShareModal] = useState(false)

  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/watch/${videoId}`
    : ''

  const blinkUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/actions/trade?id=${videoId}`
    : ''

  const handleShare = () => {
    setShowShareModal(true)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-zinc-800">
        <div className="flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center font-bold text-black text-lg shadow-lg shadow-emerald-500/20">
              S
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent group-hover:opacity-80 transition">
              Sipzy
            </span>
          </Link>
          
          <div className="flex items-center gap-4">
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share Blink
            </button>
            
            <Link
              href={`/watch/${videoId}/premium`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 transition text-sm font-semibold shadow-lg shadow-purple-500/20"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" />
                <path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z" />
              </svg>
              Premium Access
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex pt-[73px] min-h-screen">
        {/* Video Section */}
        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-5xl mx-auto">
            <YouTubePlayer videoId={videoId} />
            
            {/* Video Info */}
            <div className="mt-6 p-6 bg-zinc-900 rounded-2xl border border-zinc-800">
              <h1 className="text-2xl font-bold text-white mb-2">
                Creator Token Pool
              </h1>
              <p className="text-zinc-400 mb-4">
                Trade tokens for this content. Every purchase increases the token price, 
                and 1% of each trade goes directly to the creator.
              </p>
              
              <div className="flex flex-wrap gap-3">
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm border border-emerald-500/20">
                  Bonding Curve
                </span>
                <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-sm border border-cyan-500/20">
                  Instant Liquidity
                </span>
                <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-sm border border-purple-500/20">
                  Creator Revenue
                </span>
              </div>
            </div>

            {/* How It Works */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 bg-zinc-900 rounded-2xl border border-zinc-800">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                  <span className="text-emerald-400 text-xl">1</span>
                </div>
                <h3 className="font-semibold text-white mb-2">Connect Wallet</h3>
                <p className="text-sm text-zinc-400">Link your Solana wallet to start trading creator tokens.</p>
              </div>
              
              <div className="p-5 bg-zinc-900 rounded-2xl border border-zinc-800">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4">
                  <span className="text-cyan-400 text-xl">2</span>
                </div>
                <h3 className="font-semibold text-white mb-2">Buy Tokens</h3>
                <p className="text-sm text-zinc-400">Purchase tokens using SOL. Price increases with each buy.</p>
              </div>
              
              <div className="p-5 bg-zinc-900 rounded-2xl border border-zinc-800">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
                  <span className="text-purple-400 text-xl">3</span>
                </div>
                <h3 className="font-semibold text-white mb-2">Earn & Trade</h3>
                <p className="text-sm text-zinc-400">Sell tokens anytime for SOL. Early supporters benefit most.</p>
              </div>
            </div>
          </div>
        </main>

        {/* Trading Sidebar */}
        <aside className="hidden lg:block w-[380px] flex-shrink-0">
          <div className="fixed top-[73px] right-0 w-[380px] h-[calc(100vh-73px)]">
            <TradingSidebar youtubeId={videoId} />
          </div>
        </aside>
      </div>

      {/* Mobile Trading Drawer Trigger */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <button className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold shadow-2xl shadow-emerald-500/30 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          Open Trading
        </button>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-2xl p-6 max-w-md w-full mx-4 border border-zinc-800">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Share & Blink</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Watch Page URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 bg-zinc-800 rounded-lg px-4 py-2 text-white text-sm border border-zinc-700"
                  />
                  <button
                    onClick={() => copyToClipboard(shareUrl)}
                    className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition"
                  >
                    Copy
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Solana Blink URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={blinkUrl}
                    readOnly
                    className="flex-1 bg-zinc-800 rounded-lg px-4 py-2 text-white text-sm border border-zinc-700"
                  />
                  <button
                    onClick={() => copyToClipboard(blinkUrl)}
                    className="px-4 py-2 rounded-lg bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 transition"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  Share this URL on X/Twitter or Discord to enable trading directly from the link.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

