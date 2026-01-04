'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useWallet } from '@solana/wallet-adapter-react'
import { useConnection } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useSearchParams } from 'next/navigation'
import bs58 from 'bs58'
import { 
  deriveCreatorPoolPDA, 
  createInitializeCreatorPoolTx,
  poolExists,
  fetchPoolInfo,
  formatSol as formatSolAnchor,
  DEFAULT_CREATOR_BASE_PRICE,
  DEFAULT_CREATOR_SLOPE,
  LAMPORTS_PER_SOL,
} from '@/lib/anchor-client'

// Check if we're in demo mode
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

// Generate mock signature for demo
const generateMockSignature = () => {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  let result = ''
  for (let i = 0; i < 88; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Generate mock pool address for demo
const generateMockPoolAddress = (channelId: string) => {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  let result = ''
  for (let i = 0; i < 44; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

interface CreatorData {
  id: string
  channelId: string
  channelName: string
  channelImage: string | null
  subscriberCount: number
  coinCreated: boolean
  coinAddress: string | null
  autoApproveVideos: boolean
}

interface VideoData {
  id: string
  videoId: string
  title: string
  thumbnail: string
  publishedAt: string
  status: string
  viewCount: number
  hasToken?: boolean
  tokenId?: string
}

interface CoinInfo {
  poolAddress: string
  totalSupply: number
  reserveSol: number
  currentPrice: number
  marketCap: number
}

interface TokenInfo {
  id: string
  name: string
  symbol: string
  type: 'CREATOR' | 'VIDEO'
  supply: number
  currentPrice?: number
  marketCap?: number
  creatorEarnings?: number
  holders?: number
  totalTrades?: number
  volume24h?: number
}

function DashboardContent() {
  const { publicKey, signMessage, connected, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const searchParams = useSearchParams()
  
  // Mounted state to prevent hydration mismatch
  const [mounted, setMounted] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [creator, setCreator] = useState<CreatorData | null>(null)
  const [pendingVideos, setPendingVideos] = useState<VideoData[]>([])
  const [approvedVideos, setApprovedVideos] = useState<VideoData[]>([])
  const [stats, setStats] = useState({ totalVideos: 0, approvedVideos: 0, pendingVideos: 0 })
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isCreatingCoin, setIsCreatingCoin] = useState(false)
  const [coinInfo, setCoinInfo] = useState<CoinInfo | null>(null)
  const [showCoinModal, setShowCoinModal] = useState(false)
  
  // New: Token and earnings state
  const [creatorToken, setCreatorToken] = useState<TokenInfo | null>(null)
  const [videoTokens, setVideoTokens] = useState<TokenInfo[]>([])
  const [totalEarnings, setTotalEarnings] = useState(0)
  const [isCreatingVideoToken, setIsCreatingVideoToken] = useState<string | null>(null)
  const [showVideoTokenModal, setShowVideoTokenModal] = useState(false)
  const [createdVideoToken, setCreatedVideoToken] = useState<TokenInfo | null>(null)

  // Handle mounted state and check RPC connection
  useEffect(() => {
    setMounted(true)
    
    // Check RPC connection on mount (only in production mode)
    if (!DEMO_MODE) {
      const checkRpcConnection = async () => {
        try {
          console.log('Checking RPC connection to:', connection.rpcEndpoint)
          const slot = await connection.getSlot()
          console.log('RPC connection successful. Current slot:', slot)
        } catch (err: any) {
          console.error('RPC connection failed:', err.message)
          console.log('Make sure solana-test-validator is running!')
        }
      }
      
      checkRpcConnection()
    }
  }, [connection])

  // Handle URL params (success/error from OAuth)
  useEffect(() => {
    const success = searchParams.get('success')
    const errorParam = searchParams.get('error')
    
    if (success === 'youtube_connected') {
      setSuccessMessage('YouTube channel connected successfully!')
      window.history.replaceState({}, '', '/dashboard')
    }
    
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        'oauth_denied': 'YouTube authorization was denied',
        'invalid_callback': 'Invalid OAuth callback',
        'no_tokens': 'Failed to get YouTube tokens',
        'channel_taken': 'This YouTube channel is already registered by another user',
        'callback_failed': 'YouTube connection failed. Please try again.',
      }
      setError(errorMessages[errorParam] || 'An error occurred')
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [searchParams])

  // Check existing session
  const checkSession = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/session')
      const data = await res.json()
      
      if (data.authenticated) {
        setIsAuthenticated(true)
        return true
      }
      return false
    } catch (err) {
      console.error('Session check error:', err)
      return false
    }
  }, [])

  // Authenticate with wallet signature (or demo mode)
  const authenticate = useCallback(async (): Promise<boolean> => {
    // Demo mode authentication
    if (DEMO_MODE) {
      setIsAuthenticating(true)
      try {
        const demoWallet = 'DemoWa11etXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
        
        // Get nonce from demo API
        const nonceRes = await fetch(`/api/auth/nonce?wallet=${demoWallet}`)
        if (!nonceRes.ok) {
          throw new Error('Failed to get nonce')
        }
        const { nonce, message } = await nonceRes.json()
        
        // Simulate signing delay
        await new Promise(r => setTimeout(r, 800))
        
        // Verify with demo signature
        const verifyRes = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            walletAddress: demoWallet, 
            signature: 'demo-signature-' + Date.now(), 
            nonce 
          }),
        })
        
        const result = await verifyRes.json()
        
        if (result.success) {
          setIsAuthenticated(true)
          return true
        }
        return false
      } catch (err: any) {
        console.error('Demo auth error:', err)
        setError('Demo authentication failed. Please try again.')
        return false
      } finally {
        setIsAuthenticating(false)
      }
    }

    // Production mode - require wallet
    if (!publicKey || !signMessage || isAuthenticating) return false
    
    setIsAuthenticating(true)
    try {
      const walletAddress = publicKey.toBase58()
      
      const nonceRes = await fetch(`/api/auth/nonce?wallet=${walletAddress}`)
      if (!nonceRes.ok) {
        throw new Error('Failed to get nonce')
      }
      const { nonce, message } = await nonceRes.json()
      
      if (!nonce || !message) {
        throw new Error('Invalid nonce response')
      }
      
      const encodedMessage = new TextEncoder().encode(message)
      const signatureBytes = await signMessage(encodedMessage)
      const signature = bs58.encode(signatureBytes)
      
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, signature, nonce }),
      })
      
      const result = await verifyRes.json()
      
      if (result.success) {
        setIsAuthenticated(true)
        return true
      }
      return false
    } catch (err: any) {
      console.error('Auth error:', err)
      if (!err.message?.includes('User rejected')) {
        setError('Authentication failed. Please try again.')
      }
      return false
    } finally {
      setIsAuthenticating(false)
    }
  }, [publicKey, signMessage, isAuthenticating])

  const fetchCreatorData = useCallback(async () => {
    try {
      const res = await fetch('/api/creator/profile')
      if (res.status === 404) {
        setCreator(null)
        return
      }
      if (!res.ok) throw new Error('Failed to fetch')
      
      const data = await res.json()
      setCreator(data.creator)
      setStats(data.stats)
      
      // If coin exists, fetch on-chain data
      if (data.creator?.coinCreated && data.creator?.coinAddress) {
        await fetchCoinInfo(data.creator.channelId)
      }
      
      // Fetch pending videos
      const videosRes = await fetch('/api/creator/videos?status=pending')
      if (videosRes.ok) {
        const videosData = await videosRes.json()
        setPendingVideos(videosData.videos || [])
      }
      
      // Fetch approved videos
      const approvedRes = await fetch('/api/creator/videos?status=approved')
      if (approvedRes.ok) {
        const approvedData = await approvedRes.json()
        setApprovedVideos(approvedData.videos || [])
      }
      
      // Fetch token info from trading state
      await fetchTokensData(data.creator.id)
    } catch (err: any) {
      console.error('Fetch error:', err)
    }
  }, [])

  // Fetch token info from our trading API
  const fetchTokensData = async (creatorId: string) => {
    if (!DEMO_MODE) return
    
    try {
      const res = await fetch(`/api/tokens?creatorId=${creatorId}`)
      if (!res.ok) return
      
      const data = await res.json()
      const tokens = data.tokens || []
      
      // Separate creator and video tokens
      const creatorTokens = tokens.filter((t: TokenInfo) => t.type === 'CREATOR')
      const videoTokensList = tokens.filter((t: TokenInfo) => t.type === 'VIDEO')
      
      if (creatorTokens.length > 0) {
        setCreatorToken(creatorTokens[0])
      }
      setVideoTokens(videoTokensList)
      
      // Calculate total earnings
      const total = tokens.reduce((sum: number, t: TokenInfo) => sum + (t.creatorEarnings || 0), 0)
      setTotalEarnings(total)
    } catch (err) {
      console.error('Failed to fetch tokens:', err)
    }
  }

  // Fetch coin info from chain (production mode)
  const fetchCoinInfo = async (channelId: string) => {
    if (DEMO_MODE) {
      // In demo mode, use mock data
      setCoinInfo({
        poolAddress: generateMockPoolAddress(channelId),
        totalSupply: 100,
        reserveSol: 0.15,
        currentPrice: 0.0015,
        marketCap: 0.15,
      })
      return
    }
    
    try {
      const [poolPDA] = deriveCreatorPoolPDA(channelId)
      const info = await fetchPoolInfo(connection, poolPDA)
      
      if (info) {
        const currentPrice = info.basePrice + info.totalSupply * info.curveParam
        setCoinInfo({
          poolAddress: poolPDA.toBase58(),
          totalSupply: info.totalSupply,
          reserveSol: info.reserveSol,
          currentPrice,
          marketCap: info.totalSupply * currentPrice,
        })
      }
    } catch (err) {
      console.error('Failed to fetch coin info:', err)
    }
  }

  // Main initialization effect
  useEffect(() => {
    async function init() {
      if (!mounted) return
      
      setIsLoading(true)
      
      // Demo mode or production mode
      if (DEMO_MODE || (connected && publicKey)) {
        const hasSession = await checkSession()
        
        if (hasSession) {
          await fetchCreatorData()
        }
      }
      
      setIsLoading(false)
    }
    
    init()
  }, [mounted, connected, publicKey, checkSession, fetchCreatorData])

  const handleSignIn = async () => {
    const authed = await authenticate()
    if (authed) {
      await fetchCreatorData()
    }
  }

  const handleConnectYouTube = async () => {
    // Always try real YouTube OAuth - even in demo mode, we want to demonstrate actual YouTube connection
    try {
      const res = await fetch('/api/auth/youtube')
      const data = await res.json()
      
      if (data.authUrl) {
        window.location.href = data.authUrl
      } else {
        throw new Error('No auth URL returned')
      }
    } catch (err: any) {
      console.error('YouTube auth error:', err)
      
      // Only fall back to mock data if real auth fails AND we're in demo mode
      if (DEMO_MODE) {
        setIsLoading(true)
        await new Promise(r => setTimeout(r, 1000))
        
        // Set mock creator data as fallback
        setCreator({
          id: 'demo-creator',
          channelId: 'UC_demo_channel_123',
          channelName: 'TechVision Studios',
          channelImage: 'https://api.dicebear.com/7.x/initials/svg?seed=TV&backgroundColor=6366f1',
          subscriberCount: 125000,
          coinCreated: false,
          coinAddress: null,
          autoApproveVideos: false,
        })
        
        // Set mock pending videos as fallback
        setPendingVideos([
          {
            id: 'v1',
            videoId: 'dQw4w9WgXcQ',
            title: 'Building Web3 Apps - Complete Guide 2024',
            thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
            publishedAt: new Date(Date.now() - 86400000).toISOString(),
            status: 'pending',
            viewCount: 45230,
          },
          {
            id: 'v2',
            videoId: 'LXb3EKWsInQ',
            title: 'Solana Smart Contracts Explained',
            thumbnail: 'https://i.ytimg.com/vi/LXb3EKWsInQ/maxresdefault.jpg',
            publishedAt: new Date(Date.now() - 172800000).toISOString(),
            status: 'pending',
            viewCount: 32100,
          },
          {
            id: 'v3',
            videoId: 'jNQXAC9IVRw',
            title: 'React + Blockchain Integration Tutorial',
            thumbnail: 'https://i.ytimg.com/vi/jNQXAC9IVRw/maxresdefault.jpg',
            publishedAt: new Date(Date.now() - 259200000).toISOString(),
            status: 'pending',
            viewCount: 28500,
          },
        ])
        
        setStats({ totalVideos: 3, approvedVideos: 0, pendingVideos: 3 })
        setSuccessMessage('YouTube connection unavailable - using demo data')
        setIsLoading(false)
      } else {
        setError('Failed to start YouTube connection. Please try again.')
      }
    }
  }
  
  // Alternative: Use mock data directly (for quick demo without YouTube OAuth)
  const handleUseDemoData = async () => {
    setIsLoading(true)
    await new Promise(r => setTimeout(r, 800))
    
    setCreator({
      id: 'demo-creator',
      channelId: 'UC_demo_channel_123',
      channelName: 'TechVision Studios',
      channelImage: 'https://api.dicebear.com/7.x/initials/svg?seed=TV&backgroundColor=6366f1',
      subscriberCount: 125000,
      coinCreated: false,
      coinAddress: null,
      autoApproveVideos: false,
    })
    
    setPendingVideos([
      {
        id: 'v1',
        videoId: 'dQw4w9WgXcQ',
        title: 'Building Web3 Apps - Complete Guide 2024',
        thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        publishedAt: new Date(Date.now() - 86400000).toISOString(),
        status: 'pending',
        viewCount: 45230,
      },
      {
        id: 'v2',
        videoId: 'LXb3EKWsInQ',
        title: 'Solana Smart Contracts Explained',
        thumbnail: 'https://i.ytimg.com/vi/LXb3EKWsInQ/maxresdefault.jpg',
        publishedAt: new Date(Date.now() - 172800000).toISOString(),
        status: 'pending',
        viewCount: 32100,
      },
      {
        id: 'v3',
        videoId: 'jNQXAC9IVRw',
        title: 'React + Blockchain Integration Tutorial',
        thumbnail: 'https://i.ytimg.com/vi/jNQXAC9IVRw/maxresdefault.jpg',
        publishedAt: new Date(Date.now() - 259200000).toISOString(),
        status: 'pending',
        viewCount: 28500,
      },
    ])
    
    setStats({ totalVideos: 3, approvedVideos: 0, pendingVideos: 3 })
    setSuccessMessage('Demo creator loaded! You can now create tokens.')
    setIsLoading(false)
  }

  const handleCreateCoin = async () => {
    if (!creator) return
    
    // In demo mode, we don't require wallet connection
    if (!DEMO_MODE && (!publicKey || !sendTransaction)) return
    
    setIsCreatingCoin(true)
    setError(null)
    
    try {
      // DEMO MODE: Create token via our trading API
      if (DEMO_MODE) {
        console.log('[DEMO] Creating creator token for:', creator.channelName)
        
        // Simulate blockchain operations with delays
        await new Promise(r => setTimeout(r, 1000))
        
        // Create token via API
        const res = await fetch('/api/tokens/create/creator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creatorId: creator.id,
            creatorName: creator.channelName,
            creatorImage: creator.channelImage,
            subscriberCount: creator.subscriberCount,
            name: `${creator.channelName} Token`,
            symbol: '$' + creator.channelName.replace(/[^A-Z0-9]/gi, '').slice(0, 6).toUpperCase(),
          }),
        })
        
        const data = await res.json()
        
        if (!res.ok) {
          throw new Error(data.error || 'Failed to create token')
        }
        
        await new Promise(r => setTimeout(r, 500))
        
        // Update creator state
        const mockPoolAddress = data.token.id
        setCreator(prev => prev ? { ...prev, coinCreated: true, coinAddress: mockPoolAddress } : null)
        
        // Update API to mark coin created
        await fetch('/api/creator/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coinCreated: true,
            coinAddress: mockPoolAddress
          })
        })
        
        // Set coin info
        setCoinInfo({
          poolAddress: mockPoolAddress,
          totalSupply: data.token.supply,
          reserveSol: 0,
          currentPrice: data.token.params.basePrice,
          marketCap: 0,
        })
        
        // Set creator token
        setCreatorToken({
          id: data.token.id,
          name: data.token.name,
          symbol: data.token.symbol,
          type: 'CREATOR',
          supply: data.token.supply,
          currentPrice: data.token.params.basePrice,
          marketCap: 0,
          creatorEarnings: 0,
          holders: 1,
          totalTrades: 0,
          volume24h: 0,
        })
        
        setShowCoinModal(true)
        setSuccessMessage(`🎉 ${data.token.symbol} created! ${data.message}`)
        setIsCreatingCoin(false)
        return
      }

      // PRODUCTION MODE: Real blockchain interaction
      if (!publicKey || !sendTransaction) return
      
      // Derive the pool PDA
      const [poolPDA, bump] = deriveCreatorPoolPDA(creator.channelId)
      
      console.log('Creating pool:', {
        channelId: creator.channelId,
        channelName: creator.channelName,
        poolPDA: poolPDA.toBase58(),
        authority: publicKey.toBase58(),
      })
      
      // Check if pool already exists
      const exists = await poolExists(connection, poolPDA)
      if (exists) {
        // Pool already exists on-chain, just update database
        const updateRes = await fetch('/api/creator/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coinCreated: true,
            coinAddress: poolPDA.toBase58()
          })
        })
        
        if (updateRes.ok) {
          setCreator(prev => prev ? { ...prev, coinCreated: true, coinAddress: poolPDA.toBase58() } : null)
          await fetchCoinInfo(creator.channelId)
          setShowCoinModal(true)
          setSuccessMessage('$CREATOR coin already exists! Connected to your profile.')
        }
        setIsCreatingCoin(false)
        return
      }
      
      // Create metadata URI (placeholder for now - would use Pinata in production)
      const metadataUri = `ipfs://creator-${creator.channelId}`
      
      // Build the transaction
      const transaction = createInitializeCreatorPoolTx(
        poolPDA,
        publicKey, // Creator wallet receives fees
        publicKey, // Authority (signer)
        creator.channelId,
        creator.channelName,
        metadataUri,
        null, // Use default base price
        null  // Use default slope
      )
      
      // Get recent blockhash with retry
      console.log('Getting recent blockhash from:', connection.rpcEndpoint)
      let blockhash: string
      let lastValidBlockHeight: number
      
      try {
        const result = await connection.getLatestBlockhash('confirmed')
        blockhash = result.blockhash
        lastValidBlockHeight = result.lastValidBlockHeight
      } catch (rpcError: any) {
        console.error('RPC Error:', rpcError)
        // Check if it's a network issue
        if (rpcError.message?.includes('Failed to fetch') || rpcError.message?.includes('NetworkError')) {
          throw new Error(`Cannot connect to Solana network. Make sure:\n1. Solana validator is running (solana-test-validator)\n2. You're on the right network in Phantom (Localhost)`)
        }
        throw new Error(`RPC Error: ${rpcError.message}`)
      }
      
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey
      
      console.log('Sending transaction...')
      
      // Send transaction
      const signature = await sendTransaction(transaction, connection)
      
      console.log('Transaction sent:', signature)
      console.log('Waiting for confirmation...')
      
      // Wait for confirmation
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      }, 'confirmed')
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`)
      }
      
      console.log('Transaction confirmed!')
      
      // Update database with coin address
      const updateRes = await fetch('/api/creator/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coinCreated: true,
          coinAddress: poolPDA.toBase58()
        })
      })
      
      if (updateRes.ok) {
        setCreator(prev => prev ? { ...prev, coinCreated: true, coinAddress: poolPDA.toBase58() } : null)
      }
      
      // Fetch and show coin info
      setCoinInfo({
        poolAddress: poolPDA.toBase58(),
        totalSupply: 0,
        reserveSol: 0,
        currentPrice: DEFAULT_CREATOR_BASE_PRICE,
        marketCap: 0,
      })
      
      setShowCoinModal(true)
      setSuccessMessage(`$CREATOR coin created! TX: ${signature.slice(0, 8)}...`)
      
    } catch (err: any) {
      console.error('Create coin error:', err)
      
      // Parse error message
      let errorMsg = 'Failed to create coin'
      
      if (err.message?.includes('User rejected')) {
        errorMsg = 'Transaction cancelled by user'
      } else if (err.message?.includes('insufficient')) {
        errorMsg = 'Insufficient SOL balance. You need at least 0.01 SOL for transaction fees.'
      } else if (err.message?.includes('0x0')) {
        errorMsg = 'Transaction simulation failed. Make sure localnet is running.'
      } else if (err.logs) {
        // Anchor error logs
        const anchorError = err.logs.find((l: string) => l.includes('Error'))
        if (anchorError) errorMsg = anchorError
      } else if (err.message) {
        errorMsg = err.message
      }
      
      setError(errorMsg)
    } finally {
      setIsCreatingCoin(false)
    }
  }

  // Create video token
  const handleCreateVideoToken = async (video: VideoData) => {
    if (!creator) return
    
    setIsCreatingVideoToken(video.id)
    setError(null)
    
    try {
      await new Promise(r => setTimeout(r, 800))
      
      // Create token via API
      const res = await fetch('/api/tokens/create/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: creator.id,
          creatorName: creator.channelName,
          creatorImage: creator.channelImage,
          subscriberCount: creator.subscriberCount,
          videoId: video.videoId,
          videoTitle: video.title,
          videoThumbnail: video.thumbnail,
          name: video.title.slice(0, 30),
          symbol: '$' + video.title.replace(/[^A-Z0-9]/gi, '').slice(0, 5).toUpperCase(),
        }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        // If video already has a token, show the existing token instead
        if (data.error === 'Video already has a token' && data.existingToken) {
          setSuccessMessage(`This video already has a token: ${data.existingToken.symbol}`)
          // Navigate to the existing token
          window.location.href = `/token/${data.existingToken.id}`
          return
        }
        throw new Error(data.error || 'Failed to create video token')
      }
      
      // Update video state
      setApprovedVideos(prev => prev.map(v => 
        v.id === video.id ? { ...v, hasToken: true, tokenId: data.token.id } : v
      ))
      
      // Add to video tokens
      const newToken: TokenInfo = {
        id: data.token.id,
        name: data.token.name,
        symbol: data.token.symbol,
        type: 'VIDEO',
        supply: 0,
        currentPrice: data.token.params?.basePrice || 0.001,
        marketCap: 0,
        creatorEarnings: 0,
        holders: 0,
        totalTrades: 0,
        volume24h: 0,
      }
      
      setVideoTokens(prev => [...prev, newToken])
      setCreatedVideoToken(newToken)
      setShowVideoTokenModal(true)
      setSuccessMessage(`🎬 ${data.token.symbol} video token created! You earn 20% of all trades!`)
      
    } catch (err: any) {
      console.error('Create video token error:', err)
      setError(err.message || 'Failed to create video token')
    } finally {
      setIsCreatingVideoToken(null)
    }
  }

  const handleApproveVideo = async (videoId: string) => {
    try {
      // In demo mode, just move to approved
      if (DEMO_MODE) {
        const video = pendingVideos.find(v => v.id === videoId)
        if (video) {
          setPendingVideos(prev => prev.filter(v => v.id !== videoId))
          setApprovedVideos(prev => [...prev, { ...video, status: 'approved' }])
          setStats(prev => ({
            ...prev,
            pendingVideos: prev.pendingVideos - 1,
            approvedVideos: prev.approvedVideos + 1,
          }))
          setSuccessMessage('Video approved! You can now create a token for it.')
        }
        return
      }
      
      const res = await fetch(`/api/creator/videos/${videoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'approve',
          coinAddress: 'pending',
        }),
      })
      
      if (res.ok) {
        setPendingVideos(prev => prev.filter(v => v.id !== videoId))
        setStats(prev => ({
          ...prev,
          pendingVideos: prev.pendingVideos - 1,
          approvedVideos: prev.approvedVideos + 1,
        }))
        setSuccessMessage('Video approved!')
      }
    } catch (err: any) {
      setError('Failed to approve video')
    }
  }

  const handleRejectVideo = async (videoId: string) => {
    try {
      if (DEMO_MODE) {
        setPendingVideos(prev => prev.filter(v => v.id !== videoId))
        setStats(prev => ({ ...prev, pendingVideos: prev.pendingVideos - 1 }))
        return
      }
      
      const res = await fetch(`/api/creator/videos/${videoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      })
      
      if (res.ok) {
        setPendingVideos(prev => prev.filter(v => v.id !== videoId))
        setStats(prev => ({ ...prev, pendingVideos: prev.pendingVideos - 1 }))
      }
    } catch (err: any) {
      setError('Failed to reject video')
    }
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

  // Format SOL for display
  const formatSol = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(amount)) return '0.0000'
    if (amount < 0.0001) return '< 0.0001'
    return amount.toFixed(6)
  }

  // Don't render anything until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  // Not connected (skip in demo mode)
  if (!connected && !DEMO_MODE) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <h1 className="text-3xl font-bold mb-6">Creator Dashboard</h1>
        <p className="text-zinc-400 mb-8">Connect your wallet to access the dashboard</p>
        <WalletMultiButton className="!bg-gradient-to-r !from-emerald-500 !to-cyan-500 !rounded-xl !h-12 !font-semibold" />
      </div>
    )
  }

  // Connected but not authenticated (different flow in demo mode)
  if (!isAuthenticated && !isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        {DEMO_MODE && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-amber-500/20 border border-amber-500/50 rounded-full text-amber-400 text-sm font-medium">
            🎮 Demo Mode - No real transactions
          </div>
        )}
        <h1 className="text-3xl font-bold mb-6">Creator Dashboard</h1>
        <p className="text-zinc-400 mb-4">
          {DEMO_MODE ? 'Demo Wallet Connected' : `Wallet connected: ${publicKey?.toBase58().slice(0, 8)}...`}
        </p>
        <p className="text-zinc-500 mb-8">
          {DEMO_MODE ? 'Click below to simulate authentication' : 'Sign a message to authenticate and access your dashboard'}
        </p>
        <button
          onClick={handleSignIn}
          disabled={isAuthenticating}
          className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl font-semibold text-black hover:opacity-90 transition disabled:opacity-50"
        >
          {isAuthenticating ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full"></div>
              {DEMO_MODE ? 'Authenticating...' : 'Signing...'}
            </span>
          ) : (
            DEMO_MODE ? '🎮 Demo Sign In' : 'Sign In with Wallet'
          )}
        </button>
        <p className="text-zinc-600 text-sm mt-4">
          {DEMO_MODE ? 'This is a demonstration - no real wallet required' : 'This signature request is free and won\'t cost any gas'}
        </p>
      </div>
    )
  }

  if (isLoading) {
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
            🎮 Demo Mode Active — All transactions are simulated. No real blockchain or wallet required.
          </span>
        </div>
      )}
      
      {/* Coin Created Modal */}
      {showCoinModal && coinInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-700 p-8 max-w-md w-full">
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-bold mb-2">Creator Token Live!</h2>
              <p className="text-zinc-400 mb-6">Your token is now tradeable</p>
              
              <div className="bg-zinc-800 rounded-xl p-4 mb-6 text-left space-y-3">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Token ID</span>
                  <span className="text-sm font-mono text-emerald-400">
                    {coinInfo.poolAddress.slice(0, 12)}...
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Initial Supply</span>
                  <span className="text-white">{coinInfo.totalSupply} tokens</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Your Allocation (10%)</span>
                  <span className="text-emerald-400 font-semibold">{Math.floor(coinInfo.totalSupply * 0.1)} tokens</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Creator Fee</span>
                  <span className="text-purple-400">10% of trades</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Bonding Curve</span>
                  <span className="text-white">Linear</span>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCoinModal(false)}
                  className="flex-1 px-6 py-3 bg-zinc-700 rounded-xl font-semibold text-white hover:bg-zinc-600 transition"
                >
                  Close
                </button>
                <Link
                  href={`/token/${coinInfo.poolAddress}`}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold text-white hover:opacity-90 transition text-center"
                >
                  Trade Token
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Token Created Modal */}
      {showVideoTokenModal && createdVideoToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-700 p-8 max-w-md w-full">
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-bold mb-2">Video Token Created!</h2>
              <p className="text-zinc-400 mb-6">{createdVideoToken.symbol} is now tradeable</p>
              
              <div className="bg-zinc-800 rounded-xl p-4 mb-6 text-left space-y-3">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Token</span>
                  <span className="text-cyan-400 font-semibold">{createdVideoToken.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Creator Fee</span>
                  <span className="text-emerald-400 font-semibold">20% of trades</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Bonding Curve</span>
                  <span className="text-white">Exponential</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Growth Rate</span>
                  <span className="text-purple-400">0.5% per token</span>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowVideoTokenModal(false)}
                  className="flex-1 px-6 py-3 bg-zinc-700 rounded-xl font-semibold text-white hover:bg-zinc-600 transition"
                >
                  Close
                </button>
                <Link
                  href={`/token/${createdVideoToken.id}`}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-semibold text-white hover:opacity-90 transition text-center"
                >
                  View Token
                </Link>
              </div>
            </div>
          </div>
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
              href="/explore"
              className="px-4 py-2 text-zinc-400 hover:text-white transition"
            >
              Explore
            </Link>
            <WalletMultiButton className="!bg-zinc-800 !rounded-xl !h-10" />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className={`px-6 pb-16 ${DEMO_MODE ? 'pt-32' : 'pt-24'}`}>
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Creator Dashboard</h1>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              {successMessage}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
              {error}
            </div>
          )}

          {!creator ? (
            /* Not a Creator Yet */
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8 text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-4">Become a Creator</h2>
              <p className="text-zinc-400 mb-8 max-w-md mx-auto">
                Connect your YouTube channel to create your creator token and start letting your community invest in your success.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {/* Real YouTube OAuth */}
                <button
                  onClick={handleConnectYouTube}
                  className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 rounded-xl font-semibold text-white hover:opacity-90 transition inline-flex items-center justify-center gap-3"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  Connect YouTube
                </button>
                
                {/* Demo mode quick start */}
                {DEMO_MODE && (
                  <button
                    onClick={handleUseDemoData}
                    className="px-8 py-4 bg-zinc-800 border border-zinc-700 rounded-xl font-semibold text-white hover:bg-zinc-700 transition inline-flex items-center justify-center gap-3"
                  >
                    <span className="text-xl">🎮</span>
                    Use Demo Data
                  </button>
                )}
              </div>
              
              {DEMO_MODE && (
                <p className="text-zinc-500 text-sm mt-4 max-w-md mx-auto">
                  Click "Connect YouTube" for real OAuth, or "Use Demo Data" for a quick demonstration without YouTube setup.
                </p>
              )}
            </div>
          ) : (
            /* Creator Dashboard */
            <>
              {/* Creator Profile */}
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 mb-8">
                <div className="flex items-start gap-6">
                  {creator.channelImage ? (
                    <img
                      src={creator.channelImage}
                      alt={creator.channelName}
                      className="w-20 h-20 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <span className="text-3xl font-bold text-white">
                        {creator.channelName.charAt(0)}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold">{creator.channelName}</h2>
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                        Creator
                      </span>
                    </div>
                    <p className="text-zinc-400 mb-4">
                      {creator.subscriberCount.toLocaleString()} subscribers
                    </p>
                    
                    {!creator.coinCreated ? (
                      <button 
                        onClick={handleCreateCoin}
                        disabled={isCreatingCoin}
                        className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold text-white hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isCreatingCoin ? (
                          <span className="flex items-center gap-2">
                            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                            Creating Token...
                          </span>
                        ) : (
                          'Create Creator Token'
                        )}
                      </button>
                    ) : (
                      <div className="flex items-center gap-4">
                        <span className="text-emerald-400 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Creator Token Active
                        </span>
                        <Link
                          href={`/token/${creator.coinAddress}`}
                          className="text-sm text-purple-400 hover:text-purple-300"
                        >
                          View Trading Page →
                        </Link>
                        <button
                          onClick={() => setShowCoinModal(true)}
                          className="text-sm text-zinc-400 hover:text-white"
                        >
                          View Stats
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Earnings Overview */}
              {creator.coinCreated && (
                <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 rounded-2xl border border-emerald-500/30 p-6 mb-8">
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Your Earnings
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-black/30 rounded-xl p-4">
                      <p className="text-zinc-400 text-sm mb-1">Total Earnings</p>
                      <p className="text-2xl font-bold text-emerald-400">{formatSol(totalEarnings)} SOL</p>
                    </div>
                    <div className="bg-black/30 rounded-xl p-4">
                      <p className="text-zinc-400 text-sm mb-1">Creator Token Fee</p>
                      <p className="text-lg font-semibold text-purple-400">10% per trade</p>
                    </div>
                    <div className="bg-black/30 rounded-xl p-4">
                      <p className="text-zinc-400 text-sm mb-1">Video Token Fee</p>
                      <p className="text-lg font-semibold text-cyan-400">20% per trade</p>
                    </div>
                    <div className="bg-black/30 rounded-xl p-4">
                      <p className="text-zinc-400 text-sm mb-1">Active Tokens</p>
                      <p className="text-2xl font-bold">{1 + videoTokens.length}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Token Stats */}
              {creator.coinCreated && creatorToken && (
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 mb-8">
                  <h3 className="text-xl font-semibold mb-4">Creator Token Stats</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-zinc-800 rounded-xl p-4">
                      <p className="text-zinc-500 text-sm mb-1">Price</p>
                      <p className="text-xl font-bold text-emerald-400">
                        {formatSol(creatorToken.currentPrice)} SOL
                      </p>
                    </div>
                    <div className="bg-zinc-800 rounded-xl p-4">
                      <p className="text-zinc-500 text-sm mb-1">Supply</p>
                      <p className="text-xl font-bold">{creatorToken.supply}</p>
                    </div>
                    <div className="bg-zinc-800 rounded-xl p-4">
                      <p className="text-zinc-500 text-sm mb-1">Market Cap</p>
                      <p className="text-xl font-bold">{formatSol(creatorToken.marketCap)} SOL</p>
                    </div>
                    <div className="bg-zinc-800 rounded-xl p-4">
                      <p className="text-zinc-500 text-sm mb-1">Holders</p>
                      <p className="text-xl font-bold">{creatorToken.holders}</p>
                    </div>
                    <div className="bg-zinc-800 rounded-xl p-4">
                      <p className="text-zinc-500 text-sm mb-1">Trades</p>
                      <p className="text-xl font-bold">{creatorToken.totalTrades}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Video Tokens */}
              {videoTokens.length > 0 && (
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 mb-8">
                  <h3 className="text-xl font-semibold mb-4">Your Video Tokens</h3>
                  <div className="space-y-3">
                    {videoTokens.map(token => (
                      <div key={token.id} className="flex items-center justify-between p-4 bg-zinc-800 rounded-xl">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                            <span className="text-sm font-bold">🎬</span>
                          </div>
                          <div>
                            <p className="font-semibold">{token.symbol}</p>
                            <p className="text-sm text-zinc-400">{token.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-right">
                            <p className="text-zinc-400">Price</p>
                            <p className="font-semibold text-emerald-400">{formatSol(token.currentPrice)} SOL</p>
                          </div>
                          <div className="text-right">
                            <p className="text-zinc-400">Earnings</p>
                            <p className="font-semibold text-purple-400">{formatSol(token.creatorEarnings)} SOL</p>
                          </div>
                          <Link
                            href={`/token/${token.id}`}
                            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition"
                          >
                            View
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
                  <p className="text-zinc-500 text-sm mb-1">Total Videos</p>
                  <p className="text-2xl font-bold">{stats.totalVideos}</p>
                </div>
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
                  <p className="text-zinc-500 text-sm mb-1">Tokenized Videos</p>
                  <p className="text-2xl font-bold text-emerald-400">{videoTokens.length}</p>
                </div>
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
                  <p className="text-zinc-500 text-sm mb-1">Pending Approval</p>
                  <p className="text-2xl font-bold text-yellow-400">{stats.pendingVideos}</p>
                </div>
              </div>

              {/* Approved Videos - Create Token Section */}
              {approvedVideos.length > 0 && creator.coinCreated && (
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 mb-8">
                  <h3 className="text-xl font-semibold mb-6">Incentivize Your Videos</h3>
                  <p className="text-zinc-400 mb-6">Create tokens for your videos to earn 20% of all trades!</p>
                  <div className="space-y-4">
                    {approvedVideos.map((video) => (
                      <div
                        key={video.id}
                        className="flex items-center gap-4 p-4 bg-zinc-800 rounded-xl"
                      >
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-32 h-20 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-white truncate">{video.title}</h4>
                          <p className="text-sm text-zinc-400">
                            {new Date(video.publishedAt).toLocaleDateString()} • {video.viewCount.toLocaleString()} views
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {video.hasToken ? (
                            <Link
                              href={`/token/${video.tokenId}`}
                              className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg font-medium"
                            >
                              View Token
                            </Link>
                          ) : (
                            <button
                              onClick={() => handleCreateVideoToken(video)}
                              disabled={isCreatingVideoToken === video.id}
                              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg font-medium text-white hover:opacity-90 transition disabled:opacity-50"
                            >
                              {isCreatingVideoToken === video.id ? (
                                <span className="flex items-center gap-2">
                                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                                  Creating...
                                </span>
                              ) : (
                                'Create Token'
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Videos */}
              {pendingVideos.length > 0 && (
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
                  <h3 className="text-xl font-semibold mb-6">Videos Awaiting Approval</h3>
                  <p className="text-zinc-400 mb-6">Approve videos to enable token creation</p>
                  <div className="space-y-4">
                    {pendingVideos.map((video) => (
                      <div
                        key={video.id}
                        className="flex items-center gap-4 p-4 bg-zinc-800 rounded-xl"
                      >
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-32 h-20 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-white truncate">{video.title}</h4>
                          <p className="text-sm text-zinc-400">
                            {new Date(video.publishedAt).toLocaleDateString()} • {video.viewCount.toLocaleString()} views
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApproveVideo(video.id)}
                            className="px-4 py-2 bg-emerald-500 rounded-lg font-medium text-white hover:bg-emerald-600 transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectVideo(video.id)}
                            className="px-4 py-2 bg-zinc-700 rounded-lg font-medium text-white hover:bg-zinc-600 transition"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pendingVideos.length === 0 && approvedVideos.length === 0 && (
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8 text-center">
                  <p className="text-zinc-400">
                    No videos yet. Your YouTube videos will appear here once detected.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

// Loading fallback for Suspense
function DashboardLoading() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
    </div>
  )
}

// Export with Suspense wrapper for useSearchParams
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  )
}
