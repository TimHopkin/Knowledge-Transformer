import { NextRequest, NextResponse } from 'next/server'
import { supabase, createServerClient } from '@/lib/supabase'
import { validateYouTubeURL } from '@/lib/utils'
import { getVideoDetails, getChannelDetails, getChannelVideos, resolveChannelId } from '@/lib/youtube'
import { getTranscript } from '@/lib/transcripts'
import { analyzeContent, estimateCost, checkBudget } from '@/lib/ai'

type ProcessingStep = 'pending' | 'fetching_metadata' | 'extracting_transcript' | 'ai_processing' | 'saving_data' | 'completed' | 'failed'

async function updateProcessingStep(
  serverClient: any,
  contentItemId: string,
  step: ProcessingStep,
  details: any = {},
  errorInfo: any = {}
) {
  await serverClient.rpc('update_processing_step', {
    content_item_id: contentItemId,
    new_step: step,
    details,
    error_info: errorInfo
  })
}

interface ProcessRequest {
  urls: string[]
  options?: {
    maxVideos?: number
    extractTopics?: boolean
    summaryLength?: 'short' | 'medium' | 'long'
    summaryFocus?: 'overview' | 'key_points' | 'actionable'
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ProcessRequest = await request.json()
    const { urls, options = {} } = body

    // Basic validation
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: 'URLs array is required' },
        { status: 400 }
      )
    }

    if (urls.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 URLs allowed per request' },
        { status: 400 }
      )
    }

    // For now, we'll skip authentication and use a test user ID
    // In production, you'd get this from the session
    const userId = '00000000-0000-0000-0000-000000000000' // TODO: Get from auth session

    const serverClient = createServerClient()
    const processedResults = []
    const errors = []
    let totalEstimatedCost = 0

    // Process each URL
    for (const url of urls) {
      try {
        const validation = validateYouTubeURL(url)
        if (!validation.isValid) {
          errors.push({
            url,
            error: validation.error || 'Invalid URL'
          })
          continue
        }

        switch (validation.type) {
          case 'video':
            const videoResult = await processVideo(validation.id!, userId, options)
            processedResults.push(videoResult)
            totalEstimatedCost += videoResult.estimatedCost
            break

          case 'channel':
            const channelResult = await processChannel(validation.id!, userId, options)
            processedResults.push(channelResult)
            totalEstimatedCost += channelResult.estimatedCost
            break

          case 'playlist':
            // TODO: Implement playlist processing
            errors.push({
              url,
              error: 'Playlist processing not yet implemented'
            })
            break

          default:
            errors.push({
              url,
              error: 'Unsupported URL type'
            })
        }
      } catch (error) {
        console.error(`Error processing URL ${url}:`, error)
        
        // Enhanced error reporting
        let errorDetails: any = {
          message: error instanceof Error ? error.message : 'Unknown error'
        }
        
        // Add specific error handling for different error types
        if (error instanceof Error && 'getUserFriendlyMessage' in error && typeof error.getUserFriendlyMessage === 'function') {
          errorDetails.userFriendlyMessage = (error as any).getUserFriendlyMessage()
          errorDetails.canRetry = (error as any).canRetry?.() || false
          errorDetails.suggestedAction = (error as any).suggestedAction?.() || ''
        }
        
        errors.push({
          url,
          error: errorDetails.message,
          errorDetails
        })
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedResults,
      errors,
      totalEstimatedCost,
      message: `Processed ${processedResults.length} items, ${errors.length} errors`
    })

  } catch (error) {
    console.error('Error in YouTube processing API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function processVideo(
  videoId: string,
  userId: string,
  options: ProcessRequest['options'] = {}
) {
  const serverClient = createServerClient()
  
  // Get video details from YouTube
  const videoDetails = await getVideoDetails(videoId)
  if (!videoDetails) {
    throw new Error(`Video not found: ${videoId}`)
  }

  // Check if we already have this video
  const { data: existingItem } = await serverClient
    .from('content_items')
    .select('id')
    .eq('external_id', videoId)
    .eq('user_id', userId)
    .single()

  if (existingItem) {
    return {
      type: 'video',
      id: videoId,
      title: videoDetails.title,
      status: 'already_exists',
      contentItemId: existingItem.id,
      estimatedCost: 0
    }
  }

  // Create content source (individual video source)
  const { data: contentSource, error: sourceError } = await serverClient
    .from('content_sources')
    .insert({
      user_id: userId,
      name: `Video: ${videoDetails.title}`,
      source_type: 'youtube_video',
      source_url: videoDetails.url,
      metadata: {
        channelId: videoDetails.channelId,
        channelTitle: videoDetails.channelTitle
      }
    })
    .select()
    .single()

  if (sourceError) {
    throw new Error(`Failed to create content source: ${sourceError.message}`)
  }

  // Create content item
  const { data: contentItem, error: itemError } = await serverClient
    .from('content_items')
    .insert({
      source_id: contentSource.id,
      user_id: userId,
      external_id: videoId,
      title: videoDetails.title,
      description: videoDetails.description,
      duration_seconds: videoDetails.duration,
      published_at: videoDetails.publishedAt,
      raw_metadata: {
        viewCount: videoDetails.viewCount,
        thumbnailUrl: videoDetails.thumbnailUrl,
        url: videoDetails.url
      },
      processing_status: 'pending',
      current_step: 'pending'
    })
    .select()
    .single()

  if (itemError) {
    throw new Error(`Failed to create content item: ${itemError.message}`)
  }

  // Update status: fetching metadata (now that we have contentItem.id)
  await updateProcessingStep(serverClient, contentItem.id, 'fetching_metadata', { 
    videoId,
    title: videoDetails.title,
    duration: videoDetails.duration 
  })

  // Update status: extracting transcript
  await updateProcessingStep(serverClient, contentItem.id, 'extracting_transcript', { videoId })
  
  // Estimate cost before processing
  const transcript = await getTranscript(videoId)
  const estimatedCost = estimateCost(
    transcript.rawText.length,
    options.extractTopics,
    'claude'
  )

  // For now, we'll process immediately
  // In production, you might want to queue this
  try {
    // Save transcript
    const { error: transcriptError } = await serverClient
      .from('content_transcripts')
      .insert({
        content_item_id: contentItem.id,
        user_id: userId,
        transcript_type: transcript.transcriptType,
        raw_text: transcript.rawText,
        processed_text: transcript.processedText,
        segments: transcript.segments,
        processing_version: '1.0'
      })

    if (transcriptError) {
      throw new Error(`Failed to save transcript: ${transcriptError.message}`)
    }

    // Update status: AI processing
    await updateProcessingStep(serverClient, contentItem.id, 'ai_processing', { 
      transcriptLength: transcript.rawText.length,
      estimatedCost 
    })
    
    // Generate AI summary
    const analysis = await analyzeContent(
      transcript.processedText,
      {
        title: videoDetails.title,
        description: videoDetails.description,
        duration: videoDetails.duration,
        channel: videoDetails.channelTitle
      },
      {
        summaryLength: options.summaryLength,
        summaryFocus: options.summaryFocus,
        extractTopics: options.extractTopics
      }
    )

    // Save summary
    const { error: summaryError } = await serverClient
      .from('generated_summaries')
      .insert({
        content_item_id: contentItem.id,
        user_id: userId,
        title: analysis.summary.title,
        content: analysis.summary.summary,
        key_points: analysis.summary.keyPoints,
        ai_model: 'claude-3-sonnet',
        generation_metadata: {
          confidence: analysis.summary.confidence,
          processingTime: analysis.summary.processingTime,
          tokensUsed: analysis.summary.tokensUsed,
          cost: analysis.summary.cost
        }
      })

    if (summaryError) {
      throw new Error(`Failed to save summary: ${summaryError.message}`)
    }

    // Update status: saving data
    await updateProcessingStep(serverClient, contentItem.id, 'saving_data', { 
      analysisComplete: true 
    })

    // Save topics if extracted
    if (analysis.topics && analysis.topics.topics.length > 0) {
      for (const topic of analysis.topics.topics) {
        const { data: topicRecord, error: topicError } = await serverClient
          .from('topics')
          .insert({
            user_id: userId,
            name: topic.name,
            description: topic.description,
            metadata: {
              keywords: topic.keywords,
              confidence: topic.confidence,
              frequency: topic.frequency
            }
          })
          .select()
          .single()

        if (topicError) {
          console.error('Failed to save topic:', topicError)
          continue
        }

        // Link topic to content
        await serverClient
          .from('content_topics')
          .insert({
            content_item_id: contentItem.id,
            topic_id: topicRecord.id,
            user_id: userId,
            relevance_score: topic.confidence,
            extraction_method: 'ai'
          })
      }
    }

    // Update processing status to completed
    await updateProcessingStep(serverClient, contentItem.id, 'completed', { 
      summary: analysis.summary.title,
      topicsCount: analysis.topics?.topics.length || 0,
      totalCost: analysis.totalCost
    })

    return {
      type: 'video',
      id: videoId,
      title: videoDetails.title,
      status: 'completed',
      contentItemId: contentItem.id,
      estimatedCost: analysis.totalCost,
      summary: analysis.summary.title,
      topicsCount: analysis.topics?.topics.length || 0
    }

  } catch (processingError) {
    // Update processing status to failed with detailed error info
    const errorDetails = {
      message: processingError instanceof Error ? processingError.message : 'Unknown error',
      step: 'ai_processing', // Default to AI processing as most likely failure point
      timestamp: new Date().toISOString(),
      videoId,
      canRetry: true
    }
    
    await updateProcessingStep(serverClient, contentItem.id, 'failed', {}, errorDetails)

    throw processingError
  }
}

async function processChannel(
  channelId: string,
  userId: string,
  options: ProcessRequest['options'] = {}
) {
  const serverClient = createServerClient()
  const maxVideos = options.maxVideos || 10

  // Resolve channel ID if needed
  const resolvedChannelId = await resolveChannelId(channelId)
  if (!resolvedChannelId) {
    throw new Error(`Channel not found: ${channelId}`)
  }

  // Get channel details
  const channelDetails = await getChannelDetails(resolvedChannelId)
  if (!channelDetails) {
    throw new Error(`Channel details not found: ${resolvedChannelId}`)
  }

  // Check if we already have this channel
  const { data: existingSource } = await serverClient
    .from('content_sources')
    .select('id')
    .eq('source_url', channelDetails.url)
    .eq('user_id', userId)
    .single()

  let contentSourceId: string

  if (existingSource) {
    contentSourceId = existingSource.id
  } else {
    // Create content source
    const { data: contentSource, error: sourceError } = await serverClient
      .from('content_sources')
      .insert({
        user_id: userId,
        name: channelDetails.title,
        source_type: 'youtube_channel',
        source_url: channelDetails.url,
        metadata: {
          subscriberCount: channelDetails.subscriberCount,
          videoCount: channelDetails.videoCount,
          thumbnailUrl: channelDetails.thumbnailUrl
        }
      })
      .select()
      .single()

    if (sourceError) {
      throw new Error(`Failed to create content source: ${sourceError.message}`)
    }

    contentSourceId = contentSource.id
  }

  // Get channel videos
  const { videos } = await getChannelVideos(resolvedChannelId, maxVideos)
  
  const processedVideos = []
  let totalEstimatedCost = 0

  // Process each video
  for (const video of videos.slice(0, maxVideos)) {
    try {
      const videoResult = await processChannelVideo(
        video,
        contentSourceId,
        userId,
        options
      )
      processedVideos.push(videoResult)
      totalEstimatedCost += videoResult.estimatedCost || 0
    } catch (error) {
      console.error(`Failed to process video ${video.id}:`, error)
      processedVideos.push({
        videoId: video.id,
        title: video.title,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return {
    type: 'channel',
    id: resolvedChannelId,
    title: channelDetails.title,
    status: 'completed',
    contentSourceId,
    videosProcessed: processedVideos.length,
    estimatedCost: totalEstimatedCost,
    videos: processedVideos
  }
}

async function processChannelVideo(
  video: any,
  contentSourceId: string,
  userId: string,
  options: ProcessRequest['options'] = {}
) {
  const serverClient = createServerClient()

  // Check if we already have this video
  const { data: existingItem } = await serverClient
    .from('content_items')
    .select('id')
    .eq('external_id', video.id)
    .eq('source_id', contentSourceId)
    .single()

  if (existingItem) {
    return {
      videoId: video.id,
      title: video.title,
      status: 'already_exists',
      contentItemId: existingItem.id,
      estimatedCost: 0
    }
  }

  // Create content item
  const { data: contentItem, error: itemError } = await serverClient
    .from('content_items')
    .insert({
      source_id: contentSourceId,
      user_id: userId,
      external_id: video.id,
      title: video.title,
      description: video.description,
      duration_seconds: video.duration,
      published_at: video.publishedAt,
      raw_metadata: {
        viewCount: video.viewCount,
        thumbnailUrl: video.thumbnailUrl,
        url: video.url
      },
      processing_status: 'pending',
      current_step: 'pending'
    })
    .select()
    .single()

  if (itemError) {
    throw new Error(`Failed to create content item: ${itemError.message}`)
  }

  // Update status: extracting transcript
  await updateProcessingStep(serverClient, contentItem.id, 'extracting_transcript', { 
    videoId: video.id 
  })

  // Process similar to individual video
  const transcript = await getTranscript(video.id)
  const estimatedCost = estimateCost(
    transcript.rawText.length,
    options.extractTopics,
    'claude'
  )

  try {
    // Save transcript
    await serverClient
      .from('content_transcripts')
      .insert({
        content_item_id: contentItem.id,
        user_id: userId,
        transcript_type: transcript.transcriptType,
        raw_text: transcript.rawText,
        processed_text: transcript.processedText,
        segments: transcript.segments,
        processing_version: '1.0'
      })

    // Update status: AI processing
    await updateProcessingStep(serverClient, contentItem.id, 'ai_processing', { 
      transcriptLength: transcript.rawText.length,
      estimatedCost 
    })

    // Generate AI summary
    const analysis = await analyzeContent(
      transcript.processedText,
      {
        title: video.title,
        description: video.description,
        duration: video.duration,
        channel: video.channelTitle
      },
      {
        summaryLength: options.summaryLength || 'short', // Use shorter summaries for batch processing
        summaryFocus: options.summaryFocus,
        extractTopics: options.extractTopics
      }
    )

    // Save summary
    await serverClient
      .from('generated_summaries')
      .insert({
        content_item_id: contentItem.id,
        user_id: userId,
        title: analysis.summary.title,
        content: analysis.summary.summary,
        key_points: analysis.summary.keyPoints,
        ai_model: 'claude-3-sonnet',
        generation_metadata: {
          confidence: analysis.summary.confidence,
          processingTime: analysis.summary.processingTime,
          tokensUsed: analysis.summary.tokensUsed,
          cost: analysis.summary.cost
        }
      })

    // Update status: saving data and completion
    await updateProcessingStep(serverClient, contentItem.id, 'saving_data', { 
      analysisComplete: true 
    })
    
    await updateProcessingStep(serverClient, contentItem.id, 'completed', { 
      summary: analysis.summary.title,
      totalCost: analysis.totalCost
    })

    return {
      videoId: video.id,
      title: video.title,
      status: 'completed',
      contentItemId: contentItem.id,
      estimatedCost: analysis.totalCost
    }

  } catch (processingError) {
    // Update processing status to failed with detailed error info
    const errorDetails = {
      message: processingError instanceof Error ? processingError.message : 'Unknown error',
      step: 'channel_video_processing',
      timestamp: new Date().toISOString(),
      videoId: video.id,
      canRetry: true
    }
    
    await updateProcessingStep(serverClient, contentItem.id, 'failed', {}, errorDetails)

    throw processingError
  }
}