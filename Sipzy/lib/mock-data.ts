// Mock data for demo mode - simulates the full Sipzy experience

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

// Mock user data
export const mockUser = {
  id: 'demo-user-001',
  walletAddress: 'DemoWa11etXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  displayName: 'Demo User',
  avatarUrl: null,
  nonce: 'demo-nonce-12345',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// Mock creator data (simulating a real YouTube creator)
export const mockCreator = {
  id: 'demo-creator-001',
  userId: 'demo-user-001',
  channelId: 'UCdemo123456789',
  channelName: 'TechVision Studios',
  channelImage: 'https://yt3.googleusercontent.com/ytc/AIdro_kDHB2JXqT3XBSl7fH7hqmf8F9xFQhZWrqJVDhKCA=s176-c-k-c0x00ffffff-no-rj',
  channelBanner: null,
  subscriberCount: 125000,
  videoCount: 342,
  coinCreated: false,
  coinAddress: null,
  metadataUri: null,
  autoApproveVideos: false,
  isVerified: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// Mock creator with coin already created
export const mockCreatorWithCoin = {
  ...mockCreator,
  coinCreated: true,
  coinAddress: 'DemoP001XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
}

// Mock pending videos
export const mockPendingVideos = [
  {
    id: 'video-001',
    videoId: 'dQw4w9WgXcQ',
    title: 'Building the Future of Creator Economy with Solana',
    thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    viewCount: 15420,
    likeCount: 1250,
  },
  {
    id: 'video-002',
    videoId: '9bZkp7q19f0',
    title: 'Web3 Creator Tokens Explained - Complete Guide',
    thumbnail: 'https://i.ytimg.com/vi/9bZkp7q19f0/maxresdefault.jpg',
    publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    viewCount: 8932,
    likeCount: 756,
  },
]

// Mock stats
export const mockStats = {
  totalVideos: 12,
  approvedVideos: 8,
  pendingVideos: 2,
}

// Mock pool info for creator coin
export const mockPoolInfo = {
  poolAddress: 'DemoP001XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  totalSupply: 1250,
  reserveSol: 156250000, // 0.15625 SOL in lamports
  currentPrice: 13500000, // 0.0135 SOL
  marketCap: 168750000, // ~0.169 SOL
  basePrice: 10000000, // 0.01 SOL
  slope: 100000, // 0.0001 SOL
}

// Mock featured creators for discover page
export const mockFeaturedCreators = [
  {
    id: 'pool-001',
    poolAddress: 'Creator1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    poolType: 'CREATOR',
    identifier: 'UCxyz123',
    displayName: 'TechVision Studios',
    totalSupply: 2500,
    reserveSol: 0.45,
    currentPrice: 0.035,
    totalVolume24h: 12.5,
    totalVolumeAll: 156.8,
    totalTrades: 342,
    holders: 89,
    priceChange1h: 2.5,
    priceChange24h: 15.3,
    priceChange7d: 45.2,
    marketCap: 87.5,
    allTimeHigh: 0.042,
    allTimeLow: 0.01,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'pool-002',
    poolAddress: 'Creator2XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    poolType: 'CREATOR',
    identifier: 'UCabc456',
    displayName: 'CryptoArt Daily',
    totalSupply: 1800,
    reserveSol: 0.28,
    currentPrice: 0.028,
    totalVolume24h: 8.2,
    totalVolumeAll: 98.4,
    totalTrades: 215,
    holders: 67,
    priceChange1h: -1.2,
    priceChange24h: 8.7,
    priceChange7d: 32.1,
    marketCap: 50.4,
    allTimeHigh: 0.035,
    allTimeLow: 0.01,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'pool-003',
    poolAddress: 'Creator3XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    poolType: 'CREATOR',
    identifier: 'UCdef789',
    displayName: 'Web3 Gaming Hub',
    totalSupply: 3200,
    reserveSol: 0.68,
    currentPrice: 0.042,
    totalVolume24h: 18.9,
    totalVolumeAll: 234.5,
    totalTrades: 567,
    holders: 145,
    priceChange1h: 5.8,
    priceChange24h: 22.4,
    priceChange7d: 68.9,
    marketCap: 134.4,
    allTimeHigh: 0.048,
    allTimeLow: 0.01,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'pool-004',
    poolAddress: 'Creator4XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    poolType: 'CREATOR',
    identifier: 'UCghi012',
    displayName: 'DeFi Explained',
    totalSupply: 950,
    reserveSol: 0.12,
    currentPrice: 0.0195,
    totalVolume24h: 3.4,
    totalVolumeAll: 45.2,
    totalTrades: 98,
    holders: 34,
    priceChange1h: 0.8,
    priceChange24h: 4.2,
    priceChange7d: 18.5,
    marketCap: 18.5,
    allTimeHigh: 0.025,
    allTimeLow: 0.01,
    updatedAt: new Date().toISOString(),
  },
]

// Mock featured streams for discover page
export const mockFeaturedStreams = [
  {
    id: 'stream-001',
    poolAddress: 'Stream1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    poolType: 'STREAM',
    identifier: 'live_abc123',
    displayName: 'Building a DEX Live',
    totalSupply: 450,
    reserveSol: 0.08,
    currentPrice: 0.0018,
    totalVolume24h: 2.1,
    totalVolumeAll: 12.4,
    totalTrades: 156,
    holders: 45,
    priceChange1h: 12.5,
    priceChange24h: 45.8,
    priceChange7d: 0,
    marketCap: 0.81,
    allTimeHigh: 0.002,
    allTimeLow: 0.001,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'stream-002',
    poolAddress: 'Stream2XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    poolType: 'STREAM',
    identifier: 'live_def456',
    displayName: 'NFT Art Creation Session',
    totalSupply: 280,
    reserveSol: 0.045,
    currentPrice: 0.0014,
    totalVolume24h: 1.2,
    totalVolumeAll: 6.8,
    totalTrades: 89,
    holders: 28,
    priceChange1h: 8.2,
    priceChange24h: 28.4,
    priceChange7d: 0,
    marketCap: 0.39,
    allTimeHigh: 0.0016,
    allTimeLow: 0.001,
    updatedAt: new Date().toISOString(),
  },
]

// Helper function to simulate API delay
export const simulateDelay = (ms: number = 500) => 
  new Promise(resolve => setTimeout(resolve, ms))

// Generate a fake transaction signature
export const generateMockSignature = () => {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  let result = ''
  for (let i = 0; i < 88; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Generate a fake pool address
export const generateMockPoolAddress = (channelId: string) => {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  let result = channelId.slice(0, 8)
  for (let i = 0; i < 36; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

