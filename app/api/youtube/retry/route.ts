import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { contentItemId } = await request.json()
    
    if (!contentItemId) {
      return NextResponse.json(
        { error: 'Content item ID is required' },
        { status: 400 }
      )
    }

    const serverClient = createServerClient()
    
    // Check if item exists and can be retried
    const { data: contentItem, error: fetchError } = await serverClient
      .from('content_items')
      .select('id, current_step, can_retry, retry_count, external_id')
      .eq('id', contentItemId)
      .single()
    
    if (fetchError || !contentItem) {
      return NextResponse.json(
        { error: 'Content item not found' },
        { status: 404 }
      )
    }
    
    if (!contentItem.can_retry) {
      return NextResponse.json(
        { error: 'This item has exceeded maximum retry attempts' },
        { status: 400 }
      )
    }
    
    // Increment retry count and reset status
    const canRetry = await serverClient.rpc('increment_retry_count', {
      content_item_id: contentItemId,
      max_retries: 3
    })
    
    if (!canRetry) {
      return NextResponse.json(
        { error: 'Maximum retry attempts reached' },
        { status: 400 }
      )
    }
    
    // Reset processing status
    await serverClient
      .from('content_items')
      .update({ 
        current_step: 'pending',
        error_details: '{}',
        processing_error: null
      })
      .eq('id', contentItemId)
    
    // Trigger reprocessing by calling the original process endpoint
    // Note: In a production system, you might want to use a queue for this
    const processResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/youtube/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        urls: [`https://www.youtube.com/watch?v=${contentItem.external_id}`],
        options: {}
      }),
    })
    
    const result = await processResponse.json()
    
    return NextResponse.json({
      success: true,
      message: 'Retry initiated successfully',
      result
    })
    
  } catch (error) {
    console.error('Error in retry API:', error)
    return NextResponse.json(
      { error: 'Internal server error during retry' },
      { status: 500 }
    )
  }
}