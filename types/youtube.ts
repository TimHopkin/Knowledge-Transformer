export interface YouTubeVideo {
  id: string
  title: string
  description: string
  duration: number
  publishedAt: string
  thumbnailUrl: string
  channelId: string
  channelTitle: string
  viewCount: number
  url: string
}

export interface YouTubeChannel {
  id: string
  title: string
  description: string
  subscriberCount: number
  videoCount: number
  thumbnailUrl: string
  url: string
}

export interface YouTubePlaylist {
  id: string
  title: string
  description: string
  itemCount: number
  channelId: string
  channelTitle: string
}

export interface ProcessingJob {
  id: string
  type: 'video' | 'channel' | 'playlist'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  url: string
  metadata?: YouTubeVideo | YouTubeChannel | YouTubePlaylist
  error?: string
  createdAt: string
  completedAt?: string
}

export interface URLValidationResult {
  isValid: boolean
  type?: 'video' | 'channel' | 'playlist'
  id?: string
  error?: string
}