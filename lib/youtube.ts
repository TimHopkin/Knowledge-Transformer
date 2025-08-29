import { YouTubeVideo, YouTubeChannel, YouTubePlaylist } from '@/types/youtube'

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

if (!YOUTUBE_API_KEY) {
  console.warn('YouTube API key not found in environment variables')
}

interface YouTubeAPIError {
  error: {
    code: number
    message: string
    errors: Array<{
      domain: string
      reason: string
      message: string
    }>
  }
}

export class YouTubeAPIError extends Error {
  constructor(
    public code: number, 
    message: string, 
    public errors?: any[],
    public errorType?: 'quota_exceeded' | 'video_not_found' | 'video_private' | 'channel_not_found' | 'api_key_invalid' | 'unknown'
  ) {
    super(message)
    this.name = 'YouTubeAPIError'
  }

  getUserFriendlyMessage(): string {
    switch (this.errorType) {
      case 'quota_exceeded':
        return 'YouTube API quota exceeded. Please try again later or contact support.'
      case 'video_not_found':
        return 'Video not found. It may have been deleted or made private.'
      case 'video_private':
        return 'Video is private and cannot be accessed.'
      case 'channel_not_found':
        return 'Channel not found. Please check the URL or handle.'
      case 'api_key_invalid':
        return 'YouTube API configuration error. Please contact support.'
      default:
        return this.message
    }
  }

  canRetry(): boolean {
    return this.errorType === 'quota_exceeded'
  }
}

async function makeYouTubeRequest(endpoint: string, params: Record<string, string>) {
  if (!YOUTUBE_API_KEY) {
    throw new YouTubeAPIError(401, 'YouTube API key not configured')
  }

  const url = new URL(`${YOUTUBE_API_BASE}/${endpoint}`)
  url.searchParams.append('key', YOUTUBE_API_KEY)
  
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.append(key, value)
  }

  const response = await fetch(url.toString())
  const data = await response.json()

  if (!response.ok) {
    const error = data as YouTubeAPIError
    
    // Determine specific error type
    let errorType: YouTubeAPIError['errorType'] = 'unknown'
    if (error.error.code === 403) {
      if (error.error.message.toLowerCase().includes('quota')) {
        errorType = 'quota_exceeded'
      } else if (error.error.message.toLowerCase().includes('forbidden')) {
        errorType = 'video_private'
      }
    } else if (error.error.code === 404) {
      errorType = 'video_not_found'
    } else if (error.error.code === 401 || error.error.code === 400) {
      errorType = 'api_key_invalid'
    }
    
    throw new YouTubeAPIError(
      error.error.code,
      error.error.message,
      error.error.errors,
      errorType
    )
  }

  return data
}

export async function getVideoDetails(videoId: string): Promise<YouTubeVideo | null> {
  try {
    const data = await makeYouTubeRequest('videos', {
      part: 'snippet,contentDetails,statistics',
      id: videoId
    })

    if (!data.items || data.items.length === 0) {
      throw new YouTubeAPIError(404, `Video not found: ${videoId}`, [], 'video_not_found')
    }

    const item = data.items[0]
    const snippet = item.snippet
    const contentDetails = item.contentDetails
    const statistics = item.statistics

    // Parse duration from ISO 8601 format (PT4M13S) to seconds
    const duration = parseDuration(contentDetails.duration)

    return {
      id: item.id,
      title: snippet.title,
      description: snippet.description || '',
      duration,
      publishedAt: snippet.publishedAt,
      thumbnailUrl: snippet.thumbnails.high?.url || snippet.thumbnails.default.url,
      channelId: snippet.channelId,
      channelTitle: snippet.channelTitle,
      viewCount: parseInt(statistics.viewCount || '0'),
      url: `https://www.youtube.com/watch?v=${item.id}`
    }
  } catch (error) {
    console.error('Error fetching video details:', error)
    throw error
  }
}

export async function getChannelDetails(channelId: string): Promise<YouTubeChannel | null> {
  try {
    const data = await makeYouTubeRequest('channels', {
      part: 'snippet,statistics',
      id: channelId
    })

    if (!data.items || data.items.length === 0) {
      throw new YouTubeAPIError(404, `Channel not found: ${channelId}`, [], 'channel_not_found')
    }

    const item = data.items[0]
    const snippet = item.snippet
    const statistics = item.statistics

    return {
      id: item.id,
      title: snippet.title,
      description: snippet.description || '',
      subscriberCount: parseInt(statistics.subscriberCount || '0'),
      videoCount: parseInt(statistics.videoCount || '0'),
      thumbnailUrl: snippet.thumbnails.high?.url || snippet.thumbnails.default.url,
      url: `https://www.youtube.com/channel/${item.id}`
    }
  } catch (error) {
    console.error('Error fetching channel details:', error)
    throw error
  }
}

export async function getChannelVideos(
  channelId: string,
  maxResults: number = 50,
  pageToken?: string
): Promise<{ videos: YouTubeVideo[]; nextPageToken?: string }> {
  try {
    // First get the uploads playlist ID
    const channelData = await makeYouTubeRequest('channels', {
      part: 'contentDetails',
      id: channelId
    })

    if (!channelData.items || channelData.items.length === 0) {
      return { videos: [] }
    }

    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads

    // Get videos from uploads playlist
    const params: Record<string, string> = {
      part: 'snippet',
      playlistId: uploadsPlaylistId,
      maxResults: Math.min(maxResults, 50).toString()
    }

    if (pageToken) {
      params.pageToken = pageToken
    }

    const playlistData = await makeYouTubeRequest('playlistItems', params)

    if (!playlistData.items) {
      return { videos: [] }
    }

    // Get detailed video information
    const videoIds = playlistData.items.map((item: any) => item.snippet.resourceId.videoId)
    const videosData = await makeYouTubeRequest('videos', {
      part: 'snippet,contentDetails,statistics',
      id: videoIds.join(',')
    })

    const videos: YouTubeVideo[] = videosData.items.map((item: any) => {
      const snippet = item.snippet
      const contentDetails = item.contentDetails
      const statistics = item.statistics
      const duration = parseDuration(contentDetails.duration)

      return {
        id: item.id,
        title: snippet.title,
        description: snippet.description || '',
        duration,
        publishedAt: snippet.publishedAt,
        thumbnailUrl: snippet.thumbnails.high?.url || snippet.thumbnails.default.url,
        channelId: snippet.channelId,
        channelTitle: snippet.channelTitle,
        viewCount: parseInt(statistics.viewCount || '0'),
        url: `https://www.youtube.com/watch?v=${item.id}`
      }
    })

    return {
      videos,
      nextPageToken: playlistData.nextPageToken
    }
  } catch (error) {
    console.error('Error fetching channel videos:', error)
    throw error
  }
}

export async function getPlaylistDetails(playlistId: string): Promise<YouTubePlaylist | null> {
  try {
    const data = await makeYouTubeRequest('playlists', {
      part: 'snippet,contentDetails',
      id: playlistId
    })

    if (!data.items || data.items.length === 0) {
      return null
    }

    const item = data.items[0]
    const snippet = item.snippet
    const contentDetails = item.contentDetails

    return {
      id: item.id,
      title: snippet.title,
      description: snippet.description || '',
      itemCount: contentDetails.itemCount,
      channelId: snippet.channelId,
      channelTitle: snippet.channelTitle
    }
  } catch (error) {
    console.error('Error fetching playlist details:', error)
    throw error
  }
}

export async function getPlaylistVideos(
  playlistId: string,
  maxResults: number = 50,
  pageToken?: string
): Promise<{ videos: YouTubeVideo[]; nextPageToken?: string }> {
  try {
    const params: Record<string, string> = {
      part: 'snippet',
      playlistId,
      maxResults: Math.min(maxResults, 50).toString()
    }

    if (pageToken) {
      params.pageToken = pageToken
    }

    const playlistData = await makeYouTubeRequest('playlistItems', params)

    if (!playlistData.items) {
      return { videos: [] }
    }

    // Get detailed video information
    const videoIds = playlistData.items
      .map((item: any) => item.snippet.resourceId.videoId)
      .filter(Boolean)

    if (videoIds.length === 0) {
      return { videos: [] }
    }

    const videosData = await makeYouTubeRequest('videos', {
      part: 'snippet,contentDetails,statistics',
      id: videoIds.join(',')
    })

    const videos: YouTubeVideo[] = videosData.items.map((item: any) => {
      const snippet = item.snippet
      const contentDetails = item.contentDetails
      const statistics = item.statistics
      const duration = parseDuration(contentDetails.duration)

      return {
        id: item.id,
        title: snippet.title,
        description: snippet.description || '',
        duration,
        publishedAt: snippet.publishedAt,
        thumbnailUrl: snippet.thumbnails.high?.url || snippet.thumbnails.default.url,
        channelId: snippet.channelId,
        channelTitle: snippet.channelTitle,
        viewCount: parseInt(statistics.viewCount || '0'),
        url: `https://www.youtube.com/watch?v=${item.id}`
      }
    })

    return {
      videos,
      nextPageToken: playlistData.nextPageToken
    }
  } catch (error) {
    console.error('Error fetching playlist videos:', error)
    throw error
  }
}

function parseDuration(duration: string): number {
  // Parse ISO 8601 duration format (PT4M13S) to seconds
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0

  const hours = parseInt(match[1] || '0')
  const minutes = parseInt(match[2] || '0')
  const seconds = parseInt(match[3] || '0')

  return hours * 3600 + minutes * 60 + seconds
}

// Helper function to resolve channel ID from various URL formats
export async function resolveChannelId(identifier: string): Promise<string | null> {
  try {
    // If it's already a channel ID (starts with UC), return it
    if (identifier.startsWith('UC') && identifier.length === 24) {
      return identifier
    }

    // Try to get channel by username/handle
    const data = await makeYouTubeRequest('channels', {
      part: 'id',
      forHandle: identifier.replace('@', '')
    })

    if (data.items && data.items.length > 0) {
      return data.items[0].id
    }

    // Try legacy username lookup
    const legacyData = await makeYouTubeRequest('channels', {
      part: 'id',
      forUsername: identifier
    })

    if (legacyData.items && legacyData.items.length > 0) {
      return legacyData.items[0].id
    }

    return null
  } catch (error) {
    console.error('Error resolving channel ID:', error)
    return null
  }
}