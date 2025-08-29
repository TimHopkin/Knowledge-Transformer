import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
    { label: 'second', seconds: 1 }
  ]

  for (const interval of intervals) {
    const count = Math.floor(diffInSeconds / interval.seconds)
    if (count > 0) {
      return `${count} ${interval.label}${count !== 1 ? 's' : ''} ago`
    }
  }

  return 'Just now'
}

export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

export function extractChannelId(url: string): string | null {
  const patterns = [
    /youtube\.com\/channel\/([^\/\n?#]+)/,
    /youtube\.com\/c\/([^\/\n?#]+)/,
    /youtube\.com\/user\/([^\/\n?#]+)/,
    /youtube\.com\/@([^\/\n?#]+)/
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

export function validateYouTubeURL(url: string): {
  isValid: boolean
  type?: 'video' | 'channel' | 'playlist'
  id?: string
  error?: string
} {
  try {
    const urlObj = new URL(url)
    
    if (!urlObj.hostname.includes('youtube.com') && !urlObj.hostname.includes('youtu.be')) {
      return {
        isValid: false,
        error: 'URL must be from YouTube'
      }
    }

    // Check for video
    const videoId = extractVideoId(url)
    if (videoId) {
      return {
        isValid: true,
        type: 'video',
        id: videoId
      }
    }

    // Check for channel
    const channelId = extractChannelId(url)
    if (channelId) {
      return {
        isValid: true,
        type: 'channel',
        id: channelId
      }
    }

    // Check for playlist
    const playlistMatch = url.match(/[?&]list=([^&\n?#]+)/)
    if (playlistMatch && playlistMatch[1]) {
      return {
        isValid: true,
        type: 'playlist',
        id: playlistMatch[1]
      }
    }

    return {
      isValid: false,
      error: 'URL format not recognized'
    }

  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid URL format'
    }
  }
}

export function estimateReadingTime(text: string): number {
  const wordsPerMinute = 200
  const words = text.split(/\s+/).length
  return Math.ceil(words / wordsPerMinute)
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).replace(/\s+\S*$/, '') + '...'
}

export function calculateCost(tokensInput: number, tokensOutput: number, model: string): number {
  const rates: Record<string, { input: number; output: number }> = {
    'claude-3-sonnet': { input: 0.003, output: 0.015 }, // per 1K tokens
    'claude-3-haiku': { input: 0.00025, output: 0.00125 },
    'grok-beta': { input: 0.005, output: 0.015 } // Estimated rates
  }

  const rate = rates[model] || rates['claude-3-sonnet']
  return (tokensInput / 1000) * rate.input + (tokensOutput / 1000) * rate.output
}

export function generateCacheKey(data: any): string {
  return Buffer.from(JSON.stringify(data)).toString('base64').slice(0, 32)
}