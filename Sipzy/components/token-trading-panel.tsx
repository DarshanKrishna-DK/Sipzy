'use client'

import { useState, useEffect } from 'react'

interface TokenParams {
  basePrice: number
  slope?: number
  growthRate?: number
  creatorFeePercent: number
  platformFeePercent: number
}

interface TradePreview {
  tokenCost?: number
  grossRefund?: number
  creatorFee: number
  platformFee: number
  totalCost?: number
  netRefund?: number
  pricePerToken: number
  newPrice: number
}

interface TokenTradingPanelProps {
  tokenId: string
  tokenSymbol: string
  tokenType: 'CREATOR' | 'VIDEO'
  params: TokenParams
  currentPrice: number
  currentSupply: number
  userTokenBalance: number
  userSolBalance: number
  onTrade?: (result: { success: boolean; newBalance: number; newSolBalance: number }) => void
}

export default function TokenTradingPanel({
  tokenId,
  tokenSymbol,
  tokenType,
  params,
  currentPrice,
  currentSupply,
  userTokenBalance,
  userSolBalance,
  onTrade,
}: TokenTradingPanelProps) {
  const [tradeAction, setTradeAction] = useState<'buy' | 'sell'>('buy')
  const [tradeAmount, setTradeAmount] = useState(10)
  const [isTrading, setIsTrading] = useState(false)
  const [tradePreview, setTradePreview] = useState<TradePreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchTradePreview()
  }, [tradeAction, tradeAmount, tokenId])

  const fetchTradePreview = async () => {
    if (tradeAmount <= 0) {
      setTradePreview(null)
      return
    }

    try {
      const res = await fetch(
        `/api/tokens/${tokenId}/trade?action=${tradeAction}&amount=${tradeAmount}`
      )

      if (res.ok) {
        const data = await res.json()
        setTradePreview(data)
      }
    } catch (err) {
      console.error('Preview error:', err)
    }
  }

  const executeTrade = async () => {
    if (tradeAmount <= 0) return

    setIsTrading(true)
    setError(null)

    try {
      const res = await fetch(`/api/tokens/${tokenId}/trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: tradeAction,
          amount: tradeAmount,
          userId: 'demo-investor',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Trade failed')
      }

      const actionWord = tradeAction === 'buy' ? 'Bought' : 'Sold'
      const costOrRefund = tradeAction === 'buy'
        ? `for ${formatSol(data.cost?.totalCost || 0)} SOL`
        : `for ${formatSol(data.refund?.netRefund || 0)} SOL`

      setSuccessMessage(`${actionWord} ${tradeAmount} ${tokenSymbol} ${costOrRefund}`)
      setTradeAmount(10)

      if (onTrade) {
        onTrade({
          success: true,
          newBalance: data.newBalance,
          newSolBalance: data.newSolBalance,
        })
      }

      // Refresh preview
      fetchTradePreview()
    } catch (err: any) {
      console.error('Trade error:', err)
      setError(err.message || 'Trade failed')
    } finally {
      setIsTrading(false)
    }
  }

  const formatSol = (amount: number) => {
    if (amount < 0.0001) return '< 0.0001'
    if (amount < 0.01) return amount.toFixed(6)
    if (amount < 1) return amount.toFixed(4)
    return amount.toFixed(2)
  }

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError(null)
        setSuccessMessage(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, successMessage])

  const insufficientTokens = tradeAction === 'sell' && userTokenBalance < tradeAmount
  const insufficientSol = tradeAction === 'buy' && tradePreview && userSolBalance < (tradePreview.totalCost || 0)
  const canTrade = !isTrading && tradeAmount > 0 && !insufficientTokens && !insufficientSol

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
      <h2 className="text-xl font-semibold mb-4">Trade {tokenSymbol}</h2>

      {/* Messages */}
      {successMessage && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Buy/Sell Toggle */}
      <div className="flex bg-zinc-800 rounded-xl p-1 mb-6">
        <button
          onClick={() => setTradeAction('buy')}
          className={`flex-1 py-2 rounded-lg font-semibold transition ${
            tradeAction === 'buy'
              ? 'bg-emerald-500 text-black'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setTradeAction('sell')}
          className={`flex-1 py-2 rounded-lg font-semibold transition ${
            tradeAction === 'sell'
              ? 'bg-red-500 text-white'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Sell
        </button>
      </div>

      {/* Amount Input */}
      <div className="mb-6">
        <label className="block text-sm text-zinc-400 mb-2">Amount (tokens)</label>
        <input
          type="number"
          value={tradeAmount}
          onChange={(e) => setTradeAmount(Math.max(1, parseInt(e.target.value) || 0))}
          min="1"
          className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-lg font-semibold focus:outline-none focus:border-zinc-500"
        />
        <div className="flex gap-2 mt-2">
          {[10, 25, 50, 100].map((amount) => (
            <button
              key={amount}
              onClick={() => setTradeAmount(amount)}
              className={`flex-1 py-1 rounded text-sm font-medium transition ${
                tradeAmount === amount
                  ? 'bg-zinc-700 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {amount}
            </button>
          ))}
        </div>
      </div>

      {/* Cost Breakdown */}
      {tradePreview && (
        <FeeBreakdown
          tradeAction={tradeAction}
          tokenType={tokenType}
          params={params}
          preview={tradePreview}
        />
      )}

      {/* User Balance */}
      <div className="bg-zinc-800/50 rounded-xl p-3 mb-4 text-sm">
        <div className="flex justify-between mb-1">
          <span className="text-zinc-400">Your SOL</span>
          <span className="text-white">{formatSol(userSolBalance)} SOL</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-400">Your {tokenSymbol}</span>
          <span className="text-white">{userTokenBalance} tokens</span>
        </div>
      </div>

      {/* Trade Button */}
      <button
        onClick={executeTrade}
        disabled={!canTrade}
        className={`w-full py-4 rounded-xl font-semibold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${
          tradeAction === 'buy'
            ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-black hover:opacity-90'
            : 'bg-gradient-to-r from-red-500 to-orange-500 text-white hover:opacity-90'
        }`}
      >
        {isTrading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full"></div>
            Processing...
          </span>
        ) : tradeAction === 'buy' ? (
          `Buy ${tradeAmount} ${tokenSymbol}`
        ) : (
          `Sell ${tradeAmount} ${tokenSymbol}`
        )}
      </button>

      {/* Validation Messages */}
      {insufficientTokens && (
        <p className="text-red-400 text-sm mt-2 text-center">
          Insufficient token balance
        </p>
      )}
      {insufficientSol && (
        <p className="text-red-400 text-sm mt-2 text-center">
          Insufficient SOL balance
        </p>
      )}

      {/* New Price After Trade */}
      {tradePreview && (
        <p className="text-xs text-zinc-500 mt-3 text-center">
          Price after trade: {formatSol(tradePreview.newPrice)} SOL
        </p>
      )}
    </div>
  )
}

// Fee Breakdown Component
interface FeeBreakdownProps {
  tradeAction: 'buy' | 'sell'
  tokenType: 'CREATOR' | 'VIDEO'
  params: TokenParams
  preview: TradePreview
}

function FeeBreakdown({ tradeAction, tokenType, params, preview }: FeeBreakdownProps) {
  const formatSol = (amount: number) => {
    if (amount < 0.0001) return '< 0.0001'
    if (amount < 0.01) return amount.toFixed(6)
    if (amount < 1) return amount.toFixed(4)
    return amount.toFixed(2)
  }

  return (
    <div className="bg-zinc-800 rounded-xl p-4 mb-6">
      <h3 className="text-sm text-zinc-400 mb-3">
        {tradeAction === 'buy' ? 'Cost Breakdown' : 'Refund Breakdown'}
      </h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-zinc-400">
            {tradeAction === 'buy' ? 'Token Cost' : 'Gross Refund'}
          </span>
          <span className="text-white">
            {formatSol(preview.tokenCost || preview.grossRefund || 0)} SOL
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-400">
            Creator Fee ({(params.creatorFeePercent * 100).toFixed(0)}%)
          </span>
          <span className={tokenType === 'CREATOR' ? 'text-purple-400' : 'text-cyan-400'}>
            {tradeAction === 'buy' ? '+' : '-'}
            {formatSol(preview.creatorFee)} SOL
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-400">
            Platform Fee ({(params.platformFeePercent * 100).toFixed(0)}%)
          </span>
          <span className="text-zinc-300">
            {tradeAction === 'buy' ? '+' : '-'}
            {formatSol(preview.platformFee)} SOL
          </span>
        </div>
        <div className="border-t border-zinc-700 pt-2 mt-2">
          <div className="flex justify-between font-semibold">
            <span className="text-white">
              {tradeAction === 'buy' ? 'Total Cost' : 'Net Refund'}
            </span>
            <span className={tradeAction === 'buy' ? 'text-emerald-400' : 'text-red-400'}>
              {formatSol(preview.totalCost || preview.netRefund || 0)} SOL
            </span>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-zinc-500">Price per token</span>
            <span className="text-zinc-400">{formatSol(preview.pricePerToken)} SOL</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Export Fee Breakdown for standalone use
export { FeeBreakdown }

