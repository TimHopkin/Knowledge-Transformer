export interface ContentItem {
  id: string
  sourceId: string
  userId: string
  externalId: string
  title: string
  description: string | null
  durationSeconds: number | null
  publishedAt: string | null
  rawMetadata: Record<string, any>
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed'
  processingError: string | null
  contentHash: string | null
  createdAt: string
  updatedAt: string
}

export interface ContentTranscript {
  id: string
  contentItemId: string
  userId: string
  transcriptType: 'auto' | 'enhanced' | 'manual'
  rawText: string
  processedText: string | null
  segments: TranscriptSegment[]
  processingVersion: string | null
  createdAt: string
}

export interface TranscriptSegment {
  start: number
  end: number
  text: string
  confidence?: number
}

export interface GeneratedSummary {
  id: string
  contentItemId: string
  userId: string
  title: string
  content: string
  keyPoints: string[]
  aiModel: string
  generationMetadata: Record<string, any>
  version: number
  isCurrentVersion: boolean
  createdAt: string
}

export interface Topic {
  id: string
  userId: string
  name: string
  description: string | null
  parentTopicId: string | null
  embedding: number[] | null
  metadata: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface ContentSource {
  id: string
  userId: string
  name: string
  sourceType: 'youtube_channel' | 'youtube_playlist'
  sourceUrl: string
  metadata: Record<string, any>
  processingConfig: Record<string, any>
  lastSyncAt: string | null
  syncStatus: 'active' | 'paused' | 'error'
  syncError: string | null
  createdAt: string
  updatedAt: string
}