'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'

interface PricePoint {
  price: number
  supply: number
  timestamp: number
}

interface PriceChartProps {
  data: PricePoint[]
  tokenType: 'CREATOR' | 'VIDEO'
  currentPrice: number
  currentSupply?: number
  onRefresh?: () => void
  className?: string
}

type Timeframe = '1H' | '24H' | '7D' | 'ALL'

export default function PriceChart({ 
  data, 
  tokenType, 
  currentPrice,
  currentSupply = 0,
  onRefresh,
  className = '' 
}: PriceChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('24H')
  const [hoveredPoint, setHoveredPoint] = useState<PricePoint | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)

  // Auto-refresh effect
  useEffect(() => {
    if (onRefresh) {
      const interval = setInterval(onRefresh, 5000) // Refresh every 5 seconds
      return () => clearInterval(interval)
    }
  }, [onRefresh])

  // Filter data based on timeframe
  const filteredData = useMemo(() => {
    const now = Date.now()
    let cutoff: number
    
    switch (timeframe) {
      case '1H':
        cutoff = now - 60 * 60 * 1000
        break
      case '24H':
        cutoff = now - 24 * 60 * 60 * 1000
        break
      case '7D':
        cutoff = now - 7 * 24 * 60 * 60 * 1000
        break
      case 'ALL':
      default:
        cutoff = 0
    }
    
    const filtered = data.filter(point => point.timestamp >= cutoff)
    
    // If we have less than 2 points, generate some mock data for visualization
    if (filtered.length < 2) {
      const mockData: PricePoint[] = []
      const basePrice = currentPrice * 0.8
      const timeStep = (now - cutoff) / 20
      
      for (let i = 0; i <= 20; i++) {
        const progress = i / 20
        const variation = (Math.sin(i * 0.5) + Math.random() * 0.3) * 0.1
        mockData.push({
          price: basePrice + (currentPrice - basePrice) * progress * (1 + variation),
          supply: Math.floor(currentSupply * progress),
          timestamp: cutoff + timeStep * i,
        })
      }
      
      // Ensure last point matches current price
      mockData[mockData.length - 1] = {
        price: currentPrice,
        supply: currentSupply,
        timestamp: now,
      }
      
      return mockData
    }
    
    return filtered
  }, [data, timeframe, currentPrice, currentSupply])

  // Calculate chart dimensions and points
  const chartData = useMemo(() => {
    if (filteredData.length < 2) return { points: [], minPrice: 0, maxPrice: 0 }
    
    const prices = filteredData.map(p => p.price)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceRange = maxPrice - minPrice || maxPrice * 0.1 || 0.0001
    
    // Add padding to range
    const paddedMin = minPrice - priceRange * 0.1
    const paddedMax = maxPrice + priceRange * 0.1
    const paddedRange = paddedMax - paddedMin
    
    const points = filteredData.map((point, index) => ({
      ...point,
      x: (index / (filteredData.length - 1)) * 100,
      y: 100 - ((point.price - paddedMin) / paddedRange) * 100,
    }))
    
    return { points, minPrice: paddedMin, maxPrice: paddedMax }
  }, [filteredData])

  // Generate SVG path
  const linePath = useMemo(() => {
    if (chartData.points.length < 2) return ''
    return `M ${chartData.points.map(p => `${p.x},${p.y}`).join(' L ')}`
  }, [chartData.points])

  // Area fill path
  const areaPath = useMemo(() => {
    if (!linePath) return ''
    return `${linePath} L 100,100 L 0,100 Z`
  }, [linePath])

  // Price change calculation
  const priceChange = useMemo(() => {
    if (chartData.points.length < 2) return { value: 0, percent: 0 }
    const firstPrice = chartData.points[0].price
    const lastPrice = chartData.points[chartData.points.length - 1].price
    const change = lastPrice - firstPrice
    const percentChange = firstPrice > 0 ? (change / firstPrice) * 100 : 0
    return { value: change, percent: percentChange }
  }, [chartData.points])

  const formatSol = (amount: number) => {
    if (amount === undefined || amount === null || isNaN(amount)) return '0'
    if (amount < 0.0001) return '< 0.0001'
    if (amount < 0.01) return amount.toFixed(6)
    if (amount < 1) return amount.toFixed(4)
    return amount.toFixed(2)
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = e.clientY - rect.top
    
    // Find nearest point
    let nearestIndex = 0
    let minDistance = Infinity
    chartData.points.forEach((point, index) => {
      const distance = Math.abs(point.x - x)
      if (distance < minDistance) {
        minDistance = distance
        nearestIndex = index
      }
    })
    
    if (chartData.points[nearestIndex]) {
      setHoveredPoint(chartData.points[nearestIndex])
      setHoveredIndex(nearestIndex)
      setMousePos({ x: e.clientX - rect.left, y })
    }
  }, [chartData.points])

  const handleMouseLeave = useCallback(() => {
    setHoveredPoint(null)
    setHoveredIndex(null)
    setMousePos(null)
  }, [])

  const primaryColor = tokenType === 'CREATOR' ? '#a855f7' : '#06b6d4'
  const gradientId = `gradient-${tokenType}-${Math.random().toString(36).slice(2)}`
  const isUp = priceChange.percent >= 0

  // Generate Y-axis labels
  const yAxisLabels = useMemo(() => {
    const { minPrice, maxPrice } = chartData
    if (maxPrice === 0) return []
    
    const labels = []
    const step = (maxPrice - minPrice) / 4
    for (let i = 0; i <= 4; i++) {
      labels.push(minPrice + step * i)
    }
    return labels.reverse()
  }, [chartData])

  // Generate X-axis labels
  const xAxisLabels = useMemo(() => {
    if (filteredData.length < 2) return []
    
    const labels = []
    const step = Math.floor(filteredData.length / 4)
    for (let i = 0; i <= 4; i++) {
      const index = Math.min(i * step, filteredData.length - 1)
      if (filteredData[index]) {
        labels.push({
          timestamp: filteredData[index].timestamp,
          x: (index / (filteredData.length - 1)) * 100,
        })
      }
    }
    return labels
  }, [filteredData])

  return (
    <div className={`bg-zinc-900 rounded-2xl border border-zinc-800 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-semibold">Price</h2>
            {onRefresh && (
              <button 
                onClick={onRefresh}
                className="p-1 hover:bg-zinc-800 rounded transition"
                title="Refresh"
              >
                <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold" style={{ color: primaryColor }}>
              {formatSol(hoveredPoint?.price ?? currentPrice)} SOL
            </span>
            {priceChange.percent !== 0 && (
              <span className={`text-sm font-medium px-2 py-1 rounded ${
                isUp 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {isUp ? '+' : ''}{priceChange.percent.toFixed(2)}%
              </span>
            )}
          </div>
          {hoveredPoint && (
            <p className="text-xs text-zinc-500 mt-1">
              {formatDate(hoveredPoint.timestamp)} {formatTime(hoveredPoint.timestamp)} • Supply: {hoveredPoint.supply}
            </p>
          )}
        </div>
        
        {/* Timeframe Selector */}
        <div className="flex bg-zinc-800 rounded-lg p-1">
          {(['1H', '24H', '7D', 'ALL'] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1 rounded text-sm font-medium transition ${
                timeframe === tf
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Container */}
      <div className="flex">
        {/* Y-Axis Labels */}
        <div className="flex flex-col justify-between pr-2 py-2 text-right w-16 flex-shrink-0">
          {yAxisLabels.map((label, i) => (
            <span key={i} className="text-xs text-zinc-500 font-mono">
              {formatSol(label)}
            </span>
          ))}
        </div>

        {/* Chart Area */}
        <div className="flex-1">
          <div 
            className="relative h-64 bg-zinc-800/50 rounded-lg overflow-hidden cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {chartData.points.length > 1 ? (
              <>
                <svg 
                  className="w-full h-full" 
                  viewBox="0 0 100 100" 
                  preserveAspectRatio="none"
                >
                  {/* Horizontal grid lines */}
                  {[0, 25, 50, 75, 100].map((y) => (
                    <line
                      key={y}
                      x1="0"
                      y1={y}
                      x2="100"
                      y2={y}
                      stroke="#27272a"
                      strokeWidth="0.5"
                    />
                  ))}
                  
                  {/* Vertical grid lines */}
                  {[0, 25, 50, 75, 100].map((x) => (
                    <line
                      key={x}
                      x1={x}
                      y1="0"
                      x2={x}
                      y2="100"
                      stroke="#27272a"
                      strokeWidth="0.5"
                    />
                  ))}

                  {/* Gradient definition */}
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={primaryColor} stopOpacity="0.2" />
                      <stop offset="100%" stopColor={primaryColor} stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Area fill */}
                  <path
                    d={areaPath}
                    fill={`url(#${gradientId})`}
                  />

                  {/* Price line */}
                  <path
                    d={linePath}
                    fill="none"
                    stroke={primaryColor}
                    strokeWidth="1.5"
                    vectorEffect="non-scaling-stroke"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />

                  {/* Data points - only show on hover or at key intervals */}
                  {chartData.points.map((point, index) => {
                    // Only show dots at intervals or when hovered
                    const showDot = hoveredIndex === index || index % 5 === 0
                    if (!showDot && hoveredIndex === null) return null
                    
                    return (
                      <circle
                        key={index}
                        cx={point.x}
                        cy={point.y}
                        r={hoveredIndex === index ? "2" : "1"}
                        fill={primaryColor}
                        opacity={hoveredIndex === index ? 1 : 0.5}
                        className="transition-all duration-150"
                      />
                    )
                  })}
                </svg>

                {/* Hover line */}
                {hoveredIndex !== null && chartData.points[hoveredIndex] && (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-zinc-400 pointer-events-none"
                    style={{
                      left: `${chartData.points[hoveredIndex].x}%`,
                    }}
                  />
                )}

                {/* Hover tooltip */}
                {hoveredPoint && mousePos && (
                  <div
                    className="absolute z-10 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl pointer-events-none text-sm"
                    style={{
                      left: Math.min(mousePos.x + 10, 280),
                      top: Math.max(mousePos.y - 60, 10),
                    }}
                  >
                    <p className="font-semibold text-white">{formatSol(hoveredPoint.price)} SOL</p>
                    <p className="text-zinc-400 text-xs">Supply: {hoveredPoint.supply}</p>
                    <p className="text-zinc-500 text-xs">{formatDate(hoveredPoint.timestamp)} {formatTime(hoveredPoint.timestamp)}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-500">
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto mb-2 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                  <p>Loading chart data...</p>
                </div>
              </div>
            )}
          </div>

          {/* X-Axis Labels */}
          <div className="flex justify-between pt-2 px-1">
            {xAxisLabels.map((label, i) => (
              <span key={i} className="text-xs text-zinc-500">
                {timeframe === '1H' || timeframe === '24H' 
                  ? formatTime(label.timestamp)
                  : formatDate(label.timestamp)
                }
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex justify-between mt-4 pt-4 border-t border-zinc-800 text-sm">
        <div>
          <p className="text-zinc-500 text-xs">High</p>
          <p className="text-emerald-400 font-medium font-mono">
            {formatSol(chartData.maxPrice)} SOL
          </p>
        </div>
        <div>
          <p className="text-zinc-500 text-xs">Low</p>
          <p className="text-red-400 font-medium font-mono">
            {formatSol(chartData.minPrice)} SOL
          </p>
        </div>
        <div>
          <p className="text-zinc-500 text-xs">Change</p>
          <p className={`font-medium font-mono ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
            {isUp ? '+' : ''}{formatSol(priceChange.value)} SOL
          </p>
        </div>
        <div>
          <p className="text-zinc-500 text-xs">Points</p>
          <p className="text-zinc-300 font-mono">{chartData.points.length}</p>
        </div>
      </div>
    </div>
  )
}

// Mini chart for token cards
interface MiniPriceChartProps {
  data: PricePoint[]
  tokenType: 'CREATOR' | 'VIDEO'
  width?: number
  height?: number
}

export function MiniPriceChart({ 
  data, 
  tokenType, 
  width = 80, 
  height = 32 
}: MiniPriceChartProps) {
  const chartPoints = useMemo(() => {
    if (data.length < 2) return []
    
    const prices = data.map(p => p.price)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceRange = maxPrice - minPrice || 1
    
    return data.map((point, index) => ({
      x: (index / (data.length - 1)) * 100,
      y: 100 - ((point.price - minPrice) / priceRange) * 80 - 10,
    }))
  }, [data])

  const linePath = useMemo(() => {
    if (chartPoints.length < 2) return ''
    return `M ${chartPoints.map(p => `${p.x},${p.y}`).join(' L ')}`
  }, [chartPoints])

  // Determine if trending up or down
  const isUp = data.length >= 2 && data[data.length - 1].price >= data[0].price
  const color = isUp ? '#10b981' : '#ef4444'

  return (
    <svg width={width} height={height} viewBox="0 0 100 100" preserveAspectRatio="none">
      {chartPoints.length > 1 && (
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  )
}
