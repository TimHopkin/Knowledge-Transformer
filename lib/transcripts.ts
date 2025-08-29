import { TranscriptSegment } from '@/types/content'

// We'll use the youtube-transcript library for extracting YouTube auto-generated captions
// This is a lightweight alternative to implementing the full YouTube API transcript extraction

interface YouTubeTranscriptSegment {
  text: string
  start: number
  duration: number
}

export class TranscriptError extends Error {
  constructor(
    message: string, 
    public code?: string,
    public errorType?: 'no_captions' | 'video_private' | 'video_not_found' | 'language_unsupported' | 'youtube_api_error' | 'whisper_failed' | 'unknown'
  ) {
    super(message)
    this.name = 'TranscriptError'
  }

  getUserFriendlyMessage(): string {
    switch (this.errorType) {
      case 'no_captions':
        return 'This video has no captions available. Try videos with automatic captions or manual subtitles.'
      case 'video_private':
        return 'Video is private or restricted and captions cannot be accessed.'
      case 'video_not_found':
        return 'Video not found. It may have been deleted or the URL is incorrect.'
      case 'language_unsupported':
        return 'Video captions are in an unsupported language.'
      case 'youtube_api_error':
        return 'YouTube captions service is temporarily unavailable. Try again later.'
      case 'whisper_failed':
        return 'Audio transcription failed. The video may be too long or have poor audio quality.'
      default:
        return this.message
    }
  }

  canRetry(): boolean {
    return ['youtube_api_error', 'whisper_failed'].includes(this.errorType || '')
  }

  suggestedAction(): string {
    switch (this.errorType) {
      case 'no_captions':
        return 'Look for videos that have captions enabled or are from channels that provide subtitles.'
      case 'video_private':
        return 'Find a public version of this video or contact the video owner.'
      case 'language_unsupported':
        return 'Try videos in English or other supported languages.'
      case 'youtube_api_error':
        return 'Wait a few minutes and try again.'
      case 'whisper_failed':
        return 'Try shorter videos or those with clearer audio.'
      default:
        return 'Check the video URL and try again.'
    }
  }
}

export async function extractYouTubeTranscript(videoId: string): Promise<{
  segments: TranscriptSegment[]
  rawText: string
  language: string
}> {
  try {
    // For now, we'll create a placeholder implementation
    // In a real implementation, you would:
    // 1. Use the youtube-transcript library
    // 2. Handle multiple languages
    // 3. Fall back to Whisper API if no captions available
    
    const { YoutubeTranscript } = await import('youtube-transcript')
    
    const transcript = await YoutubeTranscript.fetchTranscript(videoId)
    
    const segments: TranscriptSegment[] = transcript.map((item: any, index: number) => ({
      start: item.offset / 1000, // Convert milliseconds to seconds
      end: (item.offset + item.duration) / 1000,
      text: item.text.trim(),
      confidence: 0.9 // YouTube auto-captions typically have good confidence
    }))
    
    const rawText = segments.map(segment => segment.text).join(' ')
    
    return {
      segments,
      rawText,
      language: 'en' // Default to English, could be enhanced to detect language
    }
    
  } catch (error) {
    console.error('Error extracting YouTube transcript:', error)
    
    // Determine specific error type
    let errorType: TranscriptError['errorType'] = 'unknown'
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      if (message.includes('no transcript') || message.includes('captions unavailable')) {
        errorType = 'no_captions'
      } else if (message.includes('private') || message.includes('unavailable')) {
        errorType = 'video_private'  
      } else if (message.includes('not found') || message.includes('404')) {
        errorType = 'video_not_found'
      } else {
        errorType = 'youtube_api_error'
      }
    }
    
    // If YouTube transcript fails, we could fall back to Whisper
    throw new TranscriptError(
      `Failed to extract transcript for video ${videoId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'YOUTUBE_TRANSCRIPT_FAILED',
      errorType
    )
  }
}

// Fallback to Whisper API for videos without captions
export async function extractWithWhisper(audioUrl: string): Promise<{
  segments: TranscriptSegment[]
  rawText: string
  language: string
}> {
  // This would require:
  // 1. Downloading the audio from YouTube (using yt-dlp or similar)
  // 2. Calling OpenAI's Whisper API
  // 3. Processing the response
  
  // For now, this is a placeholder
  throw new TranscriptError('Whisper transcription not yet implemented', 'WHISPER_NOT_IMPLEMENTED')
}

// Enhanced transcript processing using Claude
export async function enhanceTranscript(
  rawText: string,
  videoMetadata: {
    title: string
    description?: string
    channelTitle: string
  }
): Promise<string> {
  try {
    // This would use the Claude API to:
    // 1. Fix grammatical errors
    // 2. Add proper punctuation
    // 3. Structure the content better
    // 4. Remove filler words and repetitions
    
    // For now, just return the raw text with basic cleaning
    return cleanTranscript(rawText)
    
  } catch (error) {
    console.error('Error enhancing transcript:', error)
    return cleanTranscript(rawText)
  }
}

function cleanTranscript(text: string): string {
  return text
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    // Fix common auto-caption errors
    .replace(/\b(um|uh|ah|mm)\b/gi, '')
    // Remove repeated words (basic implementation)
    .replace(/\b(\w+)\s+\1\b/gi, '$1')
    // Capitalize sentences
    .replace(/(^|\. )([a-z])/g, (match, prefix, letter) => prefix + letter.toUpperCase())
    .trim()
}

// Segment transcript into meaningful chunks for AI processing
export function segmentTranscript(
  text: string,
  maxChunkSize: number = 4000
): string[] {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const chunks: string[] = []
  let currentChunk = ''
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim()
    if (!trimmedSentence) continue
    
    const potentialChunk = currentChunk + (currentChunk ? '. ' : '') + trimmedSentence + '.'
    
    if (potentialChunk.length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk + '.')
      currentChunk = trimmedSentence
    } else {
      currentChunk = potentialChunk.replace(/\.$/, '')
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk + '.')
  }
  
  return chunks
}

// Get transcript with automatic fallback chain
export async function getTranscript(videoId: string): Promise<{
  segments: TranscriptSegment[]
  rawText: string
  processedText: string
  transcriptType: 'auto' | 'enhanced' | 'whisper'
  language: string
}> {
  try {
    // Try YouTube auto-captions first
    const youtubeResult = await extractYouTubeTranscript(videoId)
    
    return {
      ...youtubeResult,
      processedText: cleanTranscript(youtubeResult.rawText),
      transcriptType: 'auto'
    }
    
  } catch (youtubeError) {
    console.log('YouTube transcript failed, attempting Whisper fallback...')
    
    try {
      // Fallback to Whisper (if implemented)
      const whisperResult = await extractWithWhisper(`https://www.youtube.com/watch?v=${videoId}`)
      
      return {
        ...whisperResult,
        processedText: cleanTranscript(whisperResult.rawText),
        transcriptType: 'whisper'
      }
      
    } catch (whisperError) {
      // Determine primary error type based on YouTube error
      let primaryErrorType: TranscriptError['errorType'] = 'unknown'
      if (youtubeError instanceof TranscriptError) {
        primaryErrorType = youtubeError.errorType || 'unknown'
      }
      
      throw new TranscriptError(
        `All transcript extraction methods failed for video ${videoId}. YouTube error: ${youtubeError instanceof Error ? youtubeError.message : 'Unknown'}. Whisper error: ${whisperError instanceof Error ? whisperError.message : 'Unknown'}`,
        'ALL_METHODS_FAILED',
        primaryErrorType
      )
    }
  }
}

// Utility to check if transcript is available for a video
export async function isTranscriptAvailable(videoId: string): Promise<boolean> {
  try {
    const { YoutubeTranscript } = await import('youtube-transcript')
    await YoutubeTranscript.fetchTranscript(videoId)
    return true
  } catch (error) {
    return false
  }
}

// Format transcript for display with timestamps
export function formatTranscriptForDisplay(segments: TranscriptSegment[]): string {
  return segments
    .map(segment => {
      const minutes = Math.floor(segment.start / 60)
      const seconds = Math.floor(segment.start % 60)
      const timestamp = `${minutes}:${seconds.toString().padStart(2, '0')}`
      return `[${timestamp}] ${segment.text}`
    })
    .join('\n')
}