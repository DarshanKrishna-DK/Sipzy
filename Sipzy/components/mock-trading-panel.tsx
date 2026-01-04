'use client'

import { FC, useState, useEffect } from 'react'

interface MockTradingPanelProps {
  videoId: string
  videoTitle?: string
}

// Simple mock trading state (stored in memory, resets on refresh)
// In production, this would be stored in a database
const getMockPoolState = (videoId: string) => {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(`mock_pool_${videoId}`)
  if (stored) return JSON.parse(stored)
  return {
    supply: 0,
    reserve: 0,
    trades: [],
    holders: new Set<string>(),
  }
}

const saveMockPoolState = (videoId: string, state: any) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(`mock_pool_${videoId}`, JSON.stringify({
    ...state,
    holders: Array.from(state.holders || []),
  }))
}

// Bonding curve: Price = 0.001 + (supply * 0.0001) SOL
const calculatePrice = (supply: number) => 0.001 + (supply * 0.0001)
const calculateBuyCost = (supply: number, amount: number) => {
  let cost = 0
  for (let i = 0; i < amount; i++) {
    cost += calculatePrice(supply + i)
  }
  return cost
}
const calculateSellReturn = (supply: number, amount: number) => {
  let returnAmt = 0
  for (let i = 0; i < amount; i++) {
    returnAmt += calculatePrice(supply - i - 1)
  }
  return returnAmt * 0.9 // 10% fee
}

export const MockTradingPanel: FC<MockTradingPanelProps> = ({ videoId, videoTitle }) => {
  const [mounted, setMounted] = useState(false)
  const [supply, setSupply] = useState(0)
  const [reserve, setReserve] = useState(0)
  const [userBalance, setUserBalance] = useState(0)
  const [userSol, setUserSol] = useState(10) // Start with 10 mock SOL
  const [buyAmount, setBuyAmount] = useState(1)
  const [sellAmount, setSellAmount] = useState(1)
  const [trades, setTrades] = useState<any[]>([])
  const [message, setMessage] = useState<string | null>(null)

  // Load state on mount
  useEffect(() => {
    setMounted(true)
    const state = getMockPoolState(videoId)
    if (state) {
      setSupply(state.supply || 0)
      setReserve(state.reserve || 0)
      setTrades(state.trades || [])
    }
    // Load user balance
    const userState = localStorage.getItem(`mock_user_${videoId}`)
    if (userState) {
      const parsed = JSON.parse(userState)
      setUserBalance(parsed.balance || 0)
      setUserSol(parsed.sol ?? 10)
    }
  }, [videoId])

  // Save user state
  const saveUserState = (balance: number, sol: number) => {
    localStorage.setItem(`mock_user_${videoId}`, JSON.stringify({ balance, sol }))
  }

  const currentPrice = calculatePrice(supply)
  const buyCost = calculateBuyCost(supply, buyAmount)
  const sellReturn = supply > 0 ? calculateSellReturn(supply, Math.min(sellAmount, userBalance)) : 0

  const handleBuy = () => {
    if (buyCost > userSol) {
      setMessage('Insufficient SOL balance!')
      setTimeout(() => setMessage(null), 3000)
      return
    }

    const newSupply = supply + buyAmount
    const newReserve = reserve + buyCost
    const newUserBalance = userBalance + buyAmount
    const newUserSol = userSol - buyCost

    const trade = {
      type: 'buy',
      amount: buyAmount,
      price: buyCost,
      timestamp: Date.now(),
    }

    setSupply(newSupply)
    setReserve(newReserve)
    setUserBalance(newUserBalance)
    setUserSol(newUserSol)
    setTrades([trade, ...trades].slice(0, 20))

    saveMockPoolState(videoId, {
      supply: newSupply,
      reserve: newReserve,
      trades: [trade, ...trades].slice(0, 20),
    })
    saveUserState(newUserBalance, newUserSol)

    setMessage(`Bought ${buyAmount} token${buyAmount > 1 ? 's' : ''} for ${buyCost.toFixed(4)} SOL!`)
    setTimeout(() => setMessage(null), 3000)
  }

  const handleSell = () => {
    const actualSellAmount = Math.min(sellAmount, userBalance)
    if (actualSellAmount <= 0) {
      setMessage('No tokens to sell!')
      setTimeout(() => setMessage(null), 3000)
      return
    }

    const returnAmount = calculateSellReturn(supply, actualSellAmount)
    const newSupply = supply - actualSellAmount
    const newReserve = reserve - returnAmount
    const newUserBalance = userBalance - actualSellAmount
    const newUserSol = userSol + returnAmount

    const trade = {
      type: 'sell',
      amount: actualSellAmount,
      price: returnAmount,
      timestamp: Date.now(),
    }

    setSupply(newSupply)
    setReserve(Math.max(0, newReserve))
    setUserBalance(newUserBalance)
    setUserSol(newUserSol)
    setTrades([trade, ...trades].slice(0, 20))

    saveMockPoolState(videoId, {
      supply: newSupply,
      reserve: Math.max(0, newReserve),
      trades: [trade, ...trades].slice(0, 20),
    })
    saveUserState(newUserBalance, newUserSol)

    setMessage(`Sold ${actualSellAmount} token${actualSellAmount > 1 ? 's' : ''} for ${returnAmount.toFixed(4)} SOL!`)
    setTimeout(() => setMessage(null), 3000)
  }

  if (!mounted) {
    return <div className="animate-pulse bg-zinc-900 rounded-2xl h-96" />
  }

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">Trade $STREAM</h3>
        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-semibold">
          DEMO
        </span>
      </div>

      {/* Your Balance */}
      <div className="bg-zinc-800 rounded-xl p-4 mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-zinc-400 text-sm">Your SOL</span>
          <span className="text-white font-semibold">{userSol.toFixed(4)} SOL</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-400 text-sm">Your Tokens</span>
          <span className="text-cyan-400 font-semibold">{userBalance} tokens</span>
        </div>
      </div>

      {/* Price Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-zinc-800 rounded-xl p-4">
          <p className="text-zinc-500 text-xs mb-1">Current Price</p>
          <p className="text-xl font-bold text-emerald-400">{currentPrice.toFixed(4)} SOL</p>
        </div>
        <div className="bg-zinc-800 rounded-xl p-4">
          <p className="text-zinc-500 text-xs mb-1">Total Supply</p>
          <p className="text-xl font-bold text-white">{supply}</p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 mb-4">
          <p className="text-emerald-400 text-sm text-center">{message}</p>
        </div>
      )}

      {/* Buy Section */}
      <div className="mb-4">
        <label className="text-zinc-400 text-sm mb-2 block">Buy Tokens</label>
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => setBuyAmount(Math.max(1, buyAmount - 1))}
            className="w-10 h-10 rounded-lg bg-zinc-800 text-white font-bold hover:bg-zinc-700"
          >
            -
          </button>
          <input
            type="number"
            value={buyAmount}
            onChange={(e) => setBuyAmount(Math.max(1, parseInt(e.target.value) || 1))}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-center text-white"
          />
          <button
            onClick={() => setBuyAmount(buyAmount + 1)}
            className="w-10 h-10 rounded-lg bg-zinc-800 text-white font-bold hover:bg-zinc-700"
          >
            +
          </button>
        </div>
        <p className="text-zinc-500 text-sm mb-2">
          Cost: <span className="text-emerald-400">{buyCost.toFixed(4)} SOL</span>
        </p>
        <button
          onClick={handleBuy}
          disabled={buyCost > userSol}
          className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:opacity-90 transition disabled:opacity-50"
        >
          Buy {buyAmount} Token{buyAmount > 1 ? 's' : ''}
        </button>
      </div>

      {/* Sell Section */}
      <div className="mb-6">
        <label className="text-zinc-400 text-sm mb-2 block">Sell Tokens</label>
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => setSellAmount(Math.max(1, sellAmount - 1))}
            className="w-10 h-10 rounded-lg bg-zinc-800 text-white font-bold hover:bg-zinc-700"
          >
            -
          </button>
          <input
            type="number"
            value={sellAmount}
            onChange={(e) => setSellAmount(Math.max(1, parseInt(e.target.value) || 1))}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-center text-white"
          />
          <button
            onClick={() => setSellAmount(sellAmount + 1)}
            className="w-10 h-10 rounded-lg bg-zinc-800 text-white font-bold hover:bg-zinc-700"
          >
            +
          </button>
        </div>
        <p className="text-zinc-500 text-sm mb-2">
          Return: <span className="text-pink-400">{sellReturn.toFixed(4)} SOL</span>
          <span className="text-zinc-600 ml-1">(10% fee)</span>
        </p>
        <button
          onClick={handleSell}
          disabled={userBalance <= 0}
          className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-pink-500 to-red-500 text-white hover:opacity-90 transition disabled:opacity-50"
        >
          Sell {Math.min(sellAmount, userBalance)} Token{sellAmount > 1 ? 's' : ''}
        </button>
      </div>

      {/* Bonding Curve Info */}
      <div className="p-3 bg-zinc-800/50 rounded-xl">
        <p className="text-xs text-zinc-500">
          <span className="text-cyan-400 font-mono">Price = 0.001 + (Supply × 0.0001) SOL</span>
          <br />
          10% fee on sells goes to creator
        </p>
      </div>
    </div>
  )
}

// Metrics component to show below video
export const MockTradingMetrics: FC<{ videoId: string }> = ({ videoId }) => {
  const [mounted, setMounted] = useState(false)
  const [supply, setSupply] = useState(0)
  const [reserve, setReserve] = useState(0)
  const [trades, setTrades] = useState<any[]>([])

  useEffect(() => {
    setMounted(true)
    const loadState = () => {
      const state = getMockPoolState(videoId)
      if (state) {
        setSupply(state.supply || 0)
        setReserve(state.reserve || 0)
        setTrades(state.trades || [])
      }
    }
    loadState()
    
    // Poll for updates
    const interval = setInterval(loadState, 1000)
    return () => clearInterval(interval)
  }, [videoId])

  if (!mounted) return null

  const currentPrice = calculatePrice(supply)
  const marketCap = supply * currentPrice
  const volume24h = trades
    .filter(t => Date.now() - t.timestamp < 24 * 60 * 60 * 1000)
    .reduce((sum, t) => sum + t.price, 0)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
      <div className="bg-zinc-800 rounded-xl p-4">
        <p className="text-zinc-500 text-xs mb-1">Price</p>
        <p className="text-lg font-bold text-emerald-400">{currentPrice.toFixed(4)} SOL</p>
      </div>
      <div className="bg-zinc-800 rounded-xl p-4">
        <p className="text-zinc-500 text-xs mb-1">Supply</p>
        <p className="text-lg font-bold text-white">{supply} tokens</p>
      </div>
      <div className="bg-zinc-800 rounded-xl p-4">
        <p className="text-zinc-500 text-xs mb-1">Market Cap</p>
        <p className="text-lg font-bold text-cyan-400">{marketCap.toFixed(4)} SOL</p>
      </div>
      <div className="bg-zinc-800 rounded-xl p-4">
        <p className="text-zinc-500 text-xs mb-1">Reserve</p>
        <p className="text-lg font-bold text-purple-400">{reserve.toFixed(4)} SOL</p>
      </div>
    </div>
  )
}

export default MockTradingPanel

