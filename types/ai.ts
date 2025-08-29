export interface AIProcessingRequest {
  taskType: string
  inputData: unknown
  modelConfig: AIModelConfig
  cacheKey?: string
  userId: string
}

export interface AIModelConfig {
  model: 'claude-3-sonnet' | 'claude-3-haiku' | 'grok-beta'
  temperature: number
  maxTokens: number
  costPerToken: number
}

export interface AIProcessingResult {
  id: string
  userId: string
  jobType: string
  inputData: Record<string, any>
  aiModel: string
  tokensInput: number
  tokensOutput: number
  costEstimate: number
  processingTimeSeconds: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result: Record<string, any> | null
  errorMessage: string | null
  createdAt: string
  completedAt: string | null
}

export interface SummaryGenerationRequest {
  transcript: string
  videoMetadata: {
    title: string
    description?: string
    duration?: number
    channel?: string
  }
  options?: {
    length?: 'short' | 'medium' | 'long'
    focus?: 'overview' | 'key_points' | 'actionable'
    extractTopics?: boolean
  }
}

export interface SummaryGenerationResult {
  title: string
  summary: string
  keyPoints: string[]
  topics: string[]
  confidence: number
  processingTime: number
  tokensUsed: number
  cost: number
}

export interface TopicExtractionRequest {
  content: string[]  // Array of summaries or transcripts
  options?: {
    maxTopics?: number
    minConfidence?: number
    includeSubtopics?: boolean
  }
}

export interface TopicExtractionResult {
  topics: ExtractedTopic[]
  relationships: TopicRelationship[]
  processingTime: number
  tokensUsed: number
  cost: number
}

export interface ExtractedTopic {
  name: string
  description: string
  confidence: number
  frequency: number
  keywords: string[]
  relatedContent: string[] // Content IDs
}

export interface TopicRelationship {
  parentTopic: string
  childTopic: string
  strength: number
  type: 'hierarchical' | 'associative' | 'causal'
}

export interface AIBudgetTracker {
  userId: string
  monthlyBudget: number
  currentSpend: number
  lastReset: string
  alerts: {
    at75Percent: boolean
    at90Percent: boolean
    budgetExceeded: boolean
  }
}