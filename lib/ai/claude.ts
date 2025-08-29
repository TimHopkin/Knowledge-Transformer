import Anthropic from '@anthropic-ai/sdk'
import { 
  SummaryGenerationRequest, 
  SummaryGenerationResult, 
  TopicExtractionRequest, 
  TopicExtractionResult,
  AIModelConfig 
} from '@/types/ai'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export class ClaudeAPIError extends Error {
  constructor(
    message: string, 
    public code?: string, 
    public statusCode?: number,
    public errorType?: 'rate_limit' | 'token_limit' | 'context_too_long' | 'api_key_invalid' | 'quota_exceeded' | 'timeout' | 'unknown'
  ) {
    super(message)
    this.name = 'ClaudeAPIError'
  }

  getUserFriendlyMessage(): string {
    switch (this.errorType) {
      case 'rate_limit':
        return 'Claude API rate limit exceeded. Please wait a moment before trying again.'
      case 'token_limit':
        return 'Content is too long for processing. Try breaking it into smaller chunks.'
      case 'context_too_long':
        return 'Transcript is too long. This will be automatically chunked and processed.'
      case 'api_key_invalid':
        return 'Claude API configuration error. Please contact support.'
      case 'quota_exceeded':
        return 'Claude API quota exceeded. Processing will resume when quota resets.'
      case 'timeout':
        return 'Processing took too long. This may work better with shorter content.'
      default:
        return this.message
    }
  }

  canRetry(): boolean {
    return ['rate_limit', 'quota_exceeded', 'timeout'].includes(this.errorType || '')
  }

  suggestedAction(): string {
    switch (this.errorType) {
      case 'rate_limit':
        return 'Wait 60 seconds and try again.'
      case 'token_limit':
        return 'Try processing shorter videos or reduce summary length.'
      case 'context_too_long':
        return 'Content will be automatically split into smaller chunks.'
      case 'quota_exceeded':
        return 'Wait for quota to reset (usually 24 hours) or upgrade your plan.'
      case 'timeout':
        return 'Try again with shorter content or different processing options.'
      default:
        return 'Check your API configuration and try again.'
    }
  }
}

const DEFAULT_MODEL_CONFIG: AIModelConfig = {
  model: 'claude-3-sonnet',
  temperature: 0.3,
  maxTokens: 3000,
  costPerToken: 0.003 // Per 1K input tokens
}

export async function generateSummary(
  request: SummaryGenerationRequest,
  config: Partial<AIModelConfig> = {}
): Promise<SummaryGenerationResult> {
  const startTime = Date.now()
  const modelConfig = { ...DEFAULT_MODEL_CONFIG, ...config }

  try {
    const prompt = buildSummaryPrompt(request)
    
    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229', // Use actual Anthropic model ID
      max_tokens: modelConfig.maxTokens,
      temperature: modelConfig.temperature,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new ClaudeAPIError('Unexpected response format from Claude API')
    }

    const result = parsesSummaryResponse(content.text)
    const processingTime = Date.now() - startTime

    return {
      ...result,
      processingTime: Math.floor(processingTime / 1000),
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      cost: calculateCost(response.usage.input_tokens, response.usage.output_tokens, modelConfig.model)
    }

  } catch (error) {
    console.error('Error generating summary with Claude:', error)
    
    let errorType: ClaudeAPIError['errorType'] = 'unknown'
    
    if (error instanceof Anthropic.APIError) {
      // Map Anthropic API errors to our error types
      if (error.status === 429) {
        errorType = 'rate_limit'
      } else if (error.status === 401) {
        errorType = 'api_key_invalid'
      } else if (error.message.includes('token') || error.message.includes('too large')) {
        errorType = 'token_limit'
      } else if (error.message.includes('context_length_exceeded')) {
        errorType = 'context_too_long'
      }
      
      throw new ClaudeAPIError(
        `Claude API error: ${error.message}`,
        'anthropic_api_error',
        error.status,
        errorType
      )
    }
    
    // Handle timeout errors
    if (error instanceof Error && error.name === 'TimeoutError') {
      errorType = 'timeout'
    }
    
    throw new ClaudeAPIError(
      `Failed to generate summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
      undefined,
      undefined,
      errorType
    )
  }
}

export async function extractTopics(
  request: TopicExtractionRequest,
  config: Partial<AIModelConfig> = {}
): Promise<TopicExtractionResult> {
  const startTime = Date.now()
  const modelConfig = { ...DEFAULT_MODEL_CONFIG, ...config }

  try {
    const prompt = buildTopicExtractionPrompt(request)
    
    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229', // Use actual Anthropic model ID
      max_tokens: modelConfig.maxTokens,
      temperature: modelConfig.temperature,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new ClaudeAPIError('Unexpected response format from Claude API')
    }

    const result = parseTopicsResponse(content.text)
    const processingTime = Date.now() - startTime

    return {
      ...result,
      processingTime: Math.floor(processingTime / 1000),
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      cost: calculateCost(response.usage.input_tokens, response.usage.output_tokens, modelConfig.model)
    }

  } catch (error) {
    console.error('Error extracting topics with Claude:', error)
    
    let errorType: ClaudeAPIError['errorType'] = 'unknown'
    
    if (error instanceof Anthropic.APIError) {
      // Map Anthropic API errors to our error types
      if (error.status === 429) {
        errorType = 'rate_limit'
      } else if (error.status === 401) {
        errorType = 'api_key_invalid'
      } else if (error.message.includes('token') || error.message.includes('too large')) {
        errorType = 'token_limit'
      } else if (error.message.includes('context_length_exceeded')) {
        errorType = 'context_too_long'
      }
      
      throw new ClaudeAPIError(
        `Claude API error: ${error.message}`,
        'anthropic_api_error',
        error.status,
        errorType
      )
    }
    
    // Handle timeout errors
    if (error instanceof Error && error.name === 'TimeoutError') {
      errorType = 'timeout'
    }
    
    throw new ClaudeAPIError(
      `Failed to extract topics: ${error instanceof Error ? error.message : 'Unknown error'}`,
      undefined,
      undefined,
      errorType
    )
  }
}

function buildSummaryPrompt(request: SummaryGenerationRequest): string {
  const { transcript, videoMetadata, options } = request
  const { title, description, duration, channel } = videoMetadata
  
  const lengthInstruction = {
    'short': 'concise (2-3 paragraphs)',
    'medium': 'detailed (4-6 paragraphs)', 
    'long': 'comprehensive (7-10 paragraphs)'
  }[options?.length || 'medium']

  const focusInstruction = {
    'overview': 'providing a general overview',
    'key_points': 'highlighting the most important points and takeaways',
    'actionable': 'focusing on actionable insights and practical applications'
  }[options?.focus || 'key_points']

  return `You are an expert content analyst. Create a ${lengthInstruction} summary of the following video transcript, ${focusInstruction}.

Video Information:
- Title: ${title}
- Channel: ${channel || 'Unknown'}
- Duration: ${duration ? Math.floor(duration / 60) + ' minutes' : 'Unknown'}
${description ? `- Description: ${description.slice(0, 200)}...` : ''}

Transcript:
${transcript}

Please provide your response in the following JSON format:
{
  "title": "A compelling title that captures the main theme",
  "summary": "The main summary content",
  "keyPoints": ["Point 1", "Point 2", "Point 3", ...],
  ${options?.extractTopics ? '"topics": ["Topic 1", "Topic 2", ...],' : ''}
  "confidence": 0.95
}

Focus on:
- Clarity and readability
- Capturing the most valuable insights
- Maintaining the original meaning and context
- Structuring information logically
${options?.extractTopics ? '- Identifying 3-7 main topics or themes' : ''}

Respond only with the JSON object, no additional text.`
}

function buildTopicExtractionPrompt(request: TopicExtractionRequest): string {
  const { content, options } = request
  const maxTopics = options?.maxTopics || 10
  const minConfidence = options?.minConfidence || 0.7

  return `You are an expert at analyzing content and identifying key topics, themes, and concepts. 

Analyze the following content and extract the main topics:

Content:
${content.join('\n\n---\n\n')}

Please identify topics that:
- Appear frequently across the content
- Represent significant themes or concepts
- Have a confidence score of at least ${minConfidence}
- Are distinct and non-overlapping

Maximum topics to extract: ${maxTopics}
${options?.includeSubtopics ? 'Include hierarchical relationships where topics have clear parent-child relationships.' : ''}

Respond in the following JSON format:
{
  "topics": [
    {
      "name": "Topic Name",
      "description": "Brief description of what this topic covers",
      "confidence": 0.95,
      "frequency": 3,
      "keywords": ["keyword1", "keyword2", "keyword3"],
      "relatedContent": ["content_index_0", "content_index_2"]
    }
  ],
  ${options?.includeSubtopics ? '"relationships": [{"parentTopic": "Parent Topic", "childTopic": "Child Topic", "strength": 0.8, "type": "hierarchical"}]' : '"relationships": []'}
}

Focus on topics that would be valuable for:
- Understanding the main themes
- Organizing and categorizing content
- Building connections between related ideas
- Creating structured learning materials

Respond only with the JSON object, no additional text.`
}

function parsesSummaryResponse(text: string): Omit<SummaryGenerationResult, 'processingTime' | 'tokensUsed' | 'cost'> {
  try {
    const parsed = JSON.parse(text.trim())
    
    return {
      title: parsed.title || 'Summary',
      summary: parsed.summary || '',
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      topics: Array.isArray(parsed.topics) ? parsed.topics : [],
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8
    }
  } catch (error) {
    console.error('Error parsing Claude summary response:', error)
    console.error('Raw response:', text)
    
    // Fallback: try to extract content from non-JSON response
    return {
      title: 'Summary',
      summary: text,
      keyPoints: [],
      topics: [],
      confidence: 0.5
    }
  }
}

function parseTopicsResponse(text: string): Omit<TopicExtractionResult, 'processingTime' | 'tokensUsed' | 'cost'> {
  try {
    const parsed = JSON.parse(text.trim())
    
    return {
      topics: Array.isArray(parsed.topics) ? parsed.topics : [],
      relationships: Array.isArray(parsed.relationships) ? parsed.relationships : []
    }
  } catch (error) {
    console.error('Error parsing Claude topics response:', error)
    console.error('Raw response:', text)
    
    return {
      topics: [],
      relationships: []
    }
  }
}

function calculateCost(inputTokens: number, outputTokens: number, model: string): number {
  const rates: Record<string, { input: number; output: number }> = {
    'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 }, // per 1K tokens
    'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
  }

  const rate = rates[model] || rates['claude-3-sonnet-20240229']
  return (inputTokens / 1000) * rate.input + (outputTokens / 1000) * rate.output
}

// Test function to verify API connectivity
export async function testClaudeConnection(): Promise<boolean> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307', // Use actual Anthropic model ID
      max_tokens: 50,
      messages: [{
        role: 'user',
        content: 'Respond with "OK" if you can receive this message.'
      }]
    })

    const content = response.content[0]
    return content.type === 'text' && content.text.trim().toLowerCase().includes('ok')
  } catch (error) {
    console.error('Claude API connection test failed:', error)
    return false
  }
}