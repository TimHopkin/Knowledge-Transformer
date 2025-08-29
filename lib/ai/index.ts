import { 
  SummaryGenerationRequest, 
  SummaryGenerationResult, 
  TopicExtractionRequest,
  TopicExtractionResult,
  AIModelConfig
} from '@/types/ai'
import { generateSummary as claudeGenerateSummary, extractTopics as claudeExtractTopics } from './claude'
// import { generateSummary as grokGenerateSummary, extractTopics as grokExtractTopics } from './grok'

export class AIProcessingError extends Error {
  constructor(message: string, public provider: string, public originalError?: Error) {
    super(message)
    this.name = 'AIProcessingError'
  }
}

// Main AI processing interface with fallback support
export async function generateSummary(
  request: SummaryGenerationRequest,
  config: Partial<AIModelConfig> = {},
  preferredProvider: 'claude' | 'grok' = 'claude'
): Promise<SummaryGenerationResult> {
  const providers = preferredProvider === 'claude' ? ['claude', 'grok'] : ['grok', 'claude']
  
  for (const provider of providers) {
    try {
      switch (provider) {
        case 'claude':
          return await claudeGenerateSummary(request, config)
        case 'grok':
          // Placeholder for Grok implementation
          // return await grokGenerateSummary(request, config)
          throw new Error('Grok provider not yet implemented')
        default:
          throw new Error(`Unknown AI provider: ${provider}`)
      }
    } catch (error) {
      console.error(`AI provider ${provider} failed:`, error)
      
      // If this is the last provider, re-throw the error
      if (provider === providers[providers.length - 1]) {
        throw new AIProcessingError(
          `All AI providers failed. Last error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          provider,
          error instanceof Error ? error : undefined
        )
      }
      
      // Otherwise, continue to next provider
      continue
    }
  }
  
  throw new AIProcessingError('No AI providers available', 'none')
}

export async function extractTopics(
  request: TopicExtractionRequest,
  config: Partial<AIModelConfig> = {},
  preferredProvider: 'claude' | 'grok' = 'claude'
): Promise<TopicExtractionResult> {
  const providers = preferredProvider === 'claude' ? ['claude', 'grok'] : ['grok', 'claude']
  
  for (const provider of providers) {
    try {
      switch (provider) {
        case 'claude':
          return await claudeExtractTopics(request, config)
        case 'grok':
          // Placeholder for Grok implementation
          // return await grokExtractTopics(request, config)
          throw new Error('Grok provider not yet implemented')
        default:
          throw new Error(`Unknown AI provider: ${provider}`)
      }
    } catch (error) {
      console.error(`AI provider ${provider} failed:`, error)
      
      // If this is the last provider, re-throw the error
      if (provider === providers[providers.length - 1]) {
        throw new AIProcessingError(
          `All AI providers failed. Last error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          provider,
          error instanceof Error ? error : undefined
        )
      }
      
      // Otherwise, continue to next provider
      continue
    }
  }
  
  throw new AIProcessingError('No AI providers available', 'none')
}

// Enhanced content analysis that combines summary and topic extraction
export async function analyzeContent(
  transcript: string,
  videoMetadata: {
    title: string
    description?: string
    duration?: number
    channel?: string
  },
  options: {
    summaryLength?: 'short' | 'medium' | 'long'
    summaryFocus?: 'overview' | 'key_points' | 'actionable'
    extractTopics?: boolean
    maxTopics?: number
    preferredProvider?: 'claude' | 'grok'
  } = {}
): Promise<{
  summary: SummaryGenerationResult
  topics?: TopicExtractionResult
  totalCost: number
  totalTokens: number
}> {
  const preferredProvider = options.preferredProvider || 'claude'
  let totalCost = 0
  let totalTokens = 0

  // Generate summary
  const summaryRequest: SummaryGenerationRequest = {
    transcript,
    videoMetadata,
    options: {
      length: options.summaryLength,
      focus: options.summaryFocus,
      extractTopics: options.extractTopics
    }
  }

  const summary = await generateSummary(summaryRequest, {}, preferredProvider)
  totalCost += summary.cost
  totalTokens += summary.tokensUsed

  let topics: TopicExtractionResult | undefined

  // Extract topics if requested and not already included in summary
  if (options.extractTopics && (!summary.topics || summary.topics.length === 0)) {
    const topicsRequest: TopicExtractionRequest = {
      content: [summary.summary],
      options: {
        maxTopics: options.maxTopics,
        minConfidence: 0.7,
        includeSubtopics: true
      }
    }

    topics = await extractTopics(topicsRequest, {}, preferredProvider)
    totalCost += topics.cost
    totalTokens += topics.tokensUsed
  }

  return {
    summary,
    topics,
    totalCost,
    totalTokens
  }
}

// Batch process multiple pieces of content
export async function batchAnalyzeContent(
  contents: Array<{
    transcript: string
    videoMetadata: {
      title: string
      description?: string
      duration?: number
      channel?: string
    }
  }>,
  options: {
    summaryLength?: 'short' | 'medium' | 'long'
    summaryFocus?: 'overview' | 'key_points' | 'actionable'
    extractTopics?: boolean
    maxTopics?: number
    preferredProvider?: 'claude' | 'grok'
    maxConcurrent?: number
  } = {}
): Promise<Array<{
  summary: SummaryGenerationResult
  topics?: TopicExtractionResult
  totalCost: number
  totalTokens: number
}>> {
  const maxConcurrent = options.maxConcurrent || 3
  const results: Array<{
    summary: SummaryGenerationResult
    topics?: TopicExtractionResult
    totalCost: number
    totalTokens: number
  }> = []

  // Process in batches to respect rate limits
  for (let i = 0; i < contents.length; i += maxConcurrent) {
    const batch = contents.slice(i, i + maxConcurrent)
    
    const batchPromises = batch.map(content => 
      analyzeContent(content.transcript, content.videoMetadata, options)
    )

    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)

    // Add small delay between batches to be respectful to APIs
    if (i + maxConcurrent < contents.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  return results
}

// Utility function to get optimal model configuration based on content length
export function getOptimalModelConfig(contentLength: number): AIModelConfig {
  if (contentLength < 1000) {
    // Short content - use faster, cheaper model
    return {
      model: 'claude-3-haiku',
      temperature: 0.3,
      maxTokens: 1500,
      costPerToken: 0.00025
    }
  } else if (contentLength < 5000) {
    // Medium content - balanced approach
    return {
      model: 'claude-3-sonnet',
      temperature: 0.3,
      maxTokens: 3000,
      costPerToken: 0.003
    }
  } else {
    // Long content - use most capable model with higher token limit
    return {
      model: 'claude-3-sonnet',
      temperature: 0.2,
      maxTokens: 4000,
      costPerToken: 0.003
    }
  }
}

// Budget management utilities
export function estimateCost(
  contentLength: number,
  includeTopics: boolean = false,
  provider: 'claude' | 'grok' = 'claude'
): number {
  const config = getOptimalModelConfig(contentLength)
  
  // Rough estimation based on content length
  const estimatedInputTokens = Math.ceil(contentLength / 4) // ~4 characters per token
  const estimatedOutputTokens = includeTopics ? 800 : 500
  
  const baseCost = (estimatedInputTokens / 1000) * config.costPerToken + 
                   (estimatedOutputTokens / 1000) * (config.costPerToken * 5) // Output typically costs 5x more
  
  return includeTopics ? baseCost * 1.5 : baseCost // Topics extraction adds ~50% cost
}

export function checkBudget(estimatedCost: number, remainingBudget: number): boolean {
  return estimatedCost <= remainingBudget
}