/**
 * Server-side file-based storage
 * Replaces Supabase/Prisma for local development
 * Uses JSON files to persist data across server restarts
 */

import fs from 'fs'
import path from 'path'

// Types
export interface User {
  id: string
  walletAddress: string
  nonce: string
  createdAt: string
  updatedAt: string
}

export interface Creator {
  id: string
  userId: string
  channelId: string
  channelName: string
  channelImage: string | null
  channelBanner: string | null
  subscriberCount: number
  videoCount: number
  accessToken: string | null
  refreshToken: string | null
  tokenExpiry: string | null
  coinCreated: boolean
  coinAddress: string | null
  metadataUri: string | null
  autoApproveVideos: boolean
  isVerified: boolean
  createdAt: string
  updatedAt: string
}

export interface Video {
  id: string
  videoId: string
  creatorId: string
  title: string
  description: string | null
  thumbnail: string
  duration: string | null
  viewCount: number
  likeCount: number
  publishedAt: string
  isLiveStream: boolean
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  coinAddress: string | null
  metadataUri: string | null
  rejectedReason: string | null
  tokenSupply: number
  reserveSol: number
  createdAt: string
  updatedAt: string
}

interface StorageData {
  users: User[]
  creators: Creator[]
  videos: Video[]
}

// Storage file path
const STORAGE_DIR = path.join(process.cwd(), '.sipzy-data')
const STORAGE_FILE = path.join(STORAGE_DIR, 'data.json')

// Ensure storage directory exists
function ensureStorageDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true })
  }
}

// Read all data
function readData(): StorageData {
  ensureStorageDir()
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const content = fs.readFileSync(STORAGE_FILE, 'utf-8')
      return JSON.parse(content)
    }
  } catch (e) {
    console.error('Error reading storage:', e)
  }
  return { users: [], creators: [], videos: [] }
}

// Write all data
function writeData(data: StorageData) {
  ensureStorageDir()
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2))
  } catch (e) {
    console.error('Error writing storage:', e)
  }
}

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

// User operations
export const userStorage = {
  findByWallet(walletAddress: string): User | null {
    const data = readData()
    return data.users.find(u => u.walletAddress === walletAddress) || null
  },

  findById(id: string): User | null {
    const data = readData()
    return data.users.find(u => u.id === id) || null
  },

  upsert(walletAddress: string): User {
    const data = readData()
    let user = data.users.find(u => u.walletAddress === walletAddress)
    
    if (user) {
      user.nonce = crypto.randomUUID()
      user.updatedAt = new Date().toISOString()
    } else {
      user = {
        id: generateId(),
        walletAddress,
        nonce: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      data.users.push(user)
    }
    
    writeData(data)
    return user
  },

  updateNonce(id: string, nonce: string): void {
    const data = readData()
    const user = data.users.find(u => u.id === id)
    if (user) {
      user.nonce = nonce
      user.updatedAt = new Date().toISOString()
      writeData(data)
    }
  },

  getWithCreator(id: string): { user: User; creator: Creator | null } | null {
    const data = readData()
    const user = data.users.find(u => u.id === id)
    if (!user) return null
    
    const creator = data.creators.find(c => c.userId === id) || null
    return { user, creator }
  },
}

// Creator operations
export const creatorStorage = {
  findByUserId(userId: string): Creator | null {
    const data = readData()
    return data.creators.find(c => c.userId === userId) || null
  },

  findByChannelId(channelId: string): Creator | null {
    const data = readData()
    return data.creators.find(c => c.channelId === channelId) || null
  },

  findById(id: string): Creator | null {
    const data = readData()
    return data.creators.find(c => c.id === id) || null
  },

  create(creatorData: Omit<Creator, 'id' | 'createdAt' | 'updatedAt'>): Creator {
    const data = readData()
    
    const creator: Creator = {
      ...creatorData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    data.creators.push(creator)
    writeData(data)
    return creator
  },

  update(id: string, updateData: Partial<Creator>): Creator | null {
    const data = readData()
    const index = data.creators.findIndex(c => c.id === id)
    
    if (index === -1) return null
    
    data.creators[index] = {
      ...data.creators[index],
      ...updateData,
      updatedAt: new Date().toISOString(),
    }
    
    writeData(data)
    return data.creators[index]
  },

  getAll(): Creator[] {
    return readData().creators
  },

  getWithCoins(): Creator[] {
    return readData().creators.filter(c => c.coinCreated)
  },
}

// Video operations
export const videoStorage = {
  findByVideoId(videoId: string): Video | null {
    const data = readData()
    return data.videos.find(v => v.videoId === videoId) || null
  },

  findById(id: string): Video | null {
    const data = readData()
    return data.videos.find(v => v.id === id) || null
  },

  findByCreator(creatorId: string, status?: Video['status']): Video[] {
    const data = readData()
    return data.videos.filter(v => 
      v.creatorId === creatorId && 
      (status ? v.status === status : true)
    )
  },

  create(videoData: Omit<Video, 'id' | 'createdAt' | 'updatedAt'>): Video {
    const data = readData()
    
    const video: Video = {
      ...videoData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    data.videos.push(video)
    writeData(data)
    return video
  },

  update(id: string, updateData: Partial<Video>): Video | null {
    const data = readData()
    const index = data.videos.findIndex(v => v.id === id)
    
    if (index === -1) return null
    
    data.videos[index] = {
      ...data.videos[index],
      ...updateData,
      updatedAt: new Date().toISOString(),
    }
    
    writeData(data)
    return data.videos[index]
  },

  countByCreator(creatorId: string, status?: Video['status']): number {
    const data = readData()
    return data.videos.filter(v => 
      v.creatorId === creatorId && 
      (status ? v.status === status : true)
    ).length
  },

  getApprovedWithCoins(): Video[] {
    const data = readData()
    return data.videos.filter(v => v.status === 'APPROVED' && v.coinAddress)
  },
}

