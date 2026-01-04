'use client'

interface FeeBreakdownProps {
  tradeAction: 'buy' | 'sell'
  tokenType: 'CREATOR' | 'VIDEO'
  tokenCost?: number
  grossRefund?: number
  creatorFee: number
  platformFee: number
  totalCost?: number
  netRefund?: number
  pricePerToken: number
  creatorFeePercent: number
  platformFeePercent: number
  className?: string
}

export default function FeeBreakdown({
  tradeAction,
  tokenType,
  tokenCost,
  grossRefund,
  creatorFee,
  platformFee,
  totalCost,
  netRefund,
  pricePerToken,
  creatorFeePercent,
  platformFeePercent,
  className = '',
}: FeeBreakdownProps) {
  const formatSol = (amount: number) => {
    if (amount < 0.0001) return '< 0.0001'
    if (amount < 0.01) return amount.toFixed(6)
    if (amount < 1) return amount.toFixed(4)
    return amount.toFixed(2)
  }

  return (
    <div className={`bg-zinc-800 rounded-xl p-4 ${className}`}>
      <h3 className="text-sm text-zinc-400 mb-3">
        {tradeAction === 'buy' ? 'Cost Breakdown' : 'Refund Breakdown'}
      </h3>
      
      <div className="space-y-2 text-sm">
        {/* Base cost/refund */}
        <div className="flex justify-between">
          <span className="text-zinc-400">
            {tradeAction === 'buy' ? 'Token Cost' : 'Gross Refund'}
          </span>
          <span className="text-white">
            {formatSol(tokenCost || grossRefund || 0)} SOL
          </span>
        </div>
        
        {/* Creator Fee */}
        <div className="flex justify-between">
          <span className="text-zinc-400 flex items-center gap-2">
            Creator Fee 
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              tokenType === 'CREATOR' 
                ? 'bg-purple-500/20 text-purple-400' 
                : 'bg-cyan-500/20 text-cyan-400'
            }`}>
              {(creatorFeePercent * 100).toFixed(0)}%
            </span>
          </span>
          <span className={tokenType === 'CREATOR' ? 'text-purple-400' : 'text-cyan-400'}>
            {tradeAction === 'buy' ? '+' : '-'}{formatSol(creatorFee)} SOL
          </span>
        </div>
        
        {/* Platform Fee */}
        <div className="flex justify-between">
          <span className="text-zinc-400 flex items-center gap-2">
            Platform Fee
            <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300">
              {(platformFeePercent * 100).toFixed(0)}%
            </span>
          </span>
          <span className="text-zinc-300">
            {tradeAction === 'buy' ? '+' : '-'}{formatSol(platformFee)} SOL
          </span>
        </div>
        
        {/* Divider and Total */}
        <div className="border-t border-zinc-700 pt-2 mt-2">
          <div className="flex justify-between font-semibold">
            <span className="text-white">
              {tradeAction === 'buy' ? 'Total Cost' : 'Net Refund'}
            </span>
            <span className={tradeAction === 'buy' ? 'text-emerald-400' : 'text-red-400'}>
              {formatSol(totalCost || netRefund || 0)} SOL
            </span>
          </div>
          
          {/* Price per token */}
          <div className="flex justify-between text-xs mt-1">
            <span className="text-zinc-500">Price per token</span>
            <span className="text-zinc-400">{formatSol(pricePerToken)} SOL</span>
          </div>
        </div>
      </div>
      
      {/* Info tooltip about fees */}
      <div className="mt-3 pt-3 border-t border-zinc-700">
        <p className="text-xs text-zinc-500">
          {tokenType === 'CREATOR' ? (
            <>
              Creator tokens: <span className="text-purple-400">10%</span> to creator, 
              <span className="text-zinc-300"> 1%</span> to platform
            </>
          ) : (
            <>
              Video tokens: <span className="text-cyan-400">20%</span> to creator, 
              <span className="text-zinc-300"> 1%</span> to platform
            </>
          )}
        </p>
      </div>
    </div>
  )
}

// Compact version for inline use
interface CompactFeeDisplayProps {
  tokenType: 'CREATOR' | 'VIDEO'
  creatorFee: number
  platformFee: number
}

export function CompactFeeDisplay({ tokenType, creatorFee, platformFee }: CompactFeeDisplayProps) {
  const formatSol = (amount: number) => {
    if (amount < 0.0001) return '< 0.0001'
    return amount.toFixed(4)
  }

  return (
    <div className="flex items-center gap-3 text-xs">
      <span className={tokenType === 'CREATOR' ? 'text-purple-400' : 'text-cyan-400'}>
        Creator: {formatSol(creatorFee)} SOL
      </span>
      <span className="text-zinc-500">•</span>
      <span className="text-zinc-400">
        Platform: {formatSol(platformFee)} SOL
      </span>
    </div>
  )
}

