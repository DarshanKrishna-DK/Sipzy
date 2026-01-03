'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'

export default function Home() {
  const [videoUrl, setVideoUrl] = useState('')
  const router = useRouter()

  const extractVideoId = (url: string): string | null => {
    // Handle various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
    ]
    
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const videoId = extractVideoId(videoUrl)
    if (videoId) {
      router.push(`/watch/${videoId}`)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-[128px]" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[128px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[150px]" />

      {/* Header */}
      <header className="relative z-10 px-6 py-4">
        <nav className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center font-bold text-black text-xl shadow-lg shadow-emerald-500/30 animate-float">
              S
            </div>
            <span className="text-2xl font-bold gradient-text">Sipzy</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Link
              href="/content/cheap"
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition"
            >
              Demo Gate
            </Link>
            <WalletMultiButton className="!bg-gradient-to-r !from-emerald-500 !to-cyan-500 !rounded-xl !h-10 !px-4 !font-semibold !text-sm hover:!opacity-90 !transition" />
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 px-6 pt-20 pb-32">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-zinc-400">Built on Solana Devnet</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="text-white">Watch.</span>
            <span className="gradient-text"> Trade.</span>
            <br />
            <span className="text-white">Earn.</span>
          </h1>

          <p className="text-xl text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Sipzy transforms any YouTube video into a trading terminal. 
            Buy creator tokens with bonding curve economics. 
            Support creators. Get rewarded.
          </p>

          {/* URL Input */}
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-16">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl blur-xl opacity-30" />
              <div className="relative flex gap-3 p-3 bg-zinc-900 rounded-2xl border border-zinc-800">
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="Paste YouTube URL or video ID..."
                  className="flex-1 bg-zinc-800 rounded-xl px-5 py-4 text-white placeholder-zinc-500 border border-zinc-700 focus:border-emerald-500 focus:outline-none transition"
                />
                <button
                  type="submit"
                  className="px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-semibold hover:opacity-90 transition shadow-lg shadow-emerald-500/30"
                >
                  Launch →
                </button>
              </div>
            </div>
          </form>

          {/* Quick Links */}
          <div className="flex flex-wrap justify-center gap-4 mb-20">
            <Link
              href="/watch/dQw4w9WgXcQ"
              className="px-6 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition flex items-center gap-2"
            >
              <span>🎵</span> Try Demo Video
            </Link>
            <Link
              href="/api/actions/trade?id=dQw4w9WgXcQ"
              className="px-6 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition flex items-center gap-2"
            >
              <span>⚡</span> View Blink API
            </Link>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 card-hover">
              <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 mx-auto">
                <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Bonding Curve</h3>
              <p className="text-zinc-400 text-sm">
                Price increases with each purchase. Early supporters benefit from growth.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 card-hover">
              <div className="w-14 h-14 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4 mx-auto">
                <svg className="w-7 h-7 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Creator Revenue</h3>
              <p className="text-zinc-400 text-sm">
                1% of every trade goes directly to creators. Instant settlement on Solana.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 card-hover">
              <div className="w-14 h-14 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 mx-auto">
                <svg className="w-7 h-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Shareable Blinks</h3>
              <p className="text-zinc-400 text-sm">
                Trade tokens directly from X/Twitter or Discord using Solana Actions.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-800 px-6 py-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-zinc-500 text-sm">
            Powered by Solana × x402 Protocol
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <span>Devnet MVP</span>
            <span>•</span>
            <span>Built for the Creator Economy</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
