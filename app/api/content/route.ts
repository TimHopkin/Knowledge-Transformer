import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status') // 'completed', 'pending', 'failed'
    
    // For now, we'll skip authentication and use a test user ID
    const userId = '00000000-0000-0000-0000-000000000000' // TODO: Get from auth session

    const serverClient = createServerClient()
    
    let query = serverClient
      .from('content_items')
      .select(`
        *,
        content_sources (
          name,
          source_type,
          source_url
        ),
        generated_summaries (
          id,
          title,
          content,
          key_points,
          ai_model,
          created_at
        ),
        content_transcripts (
          id,
          transcript_type,
          raw_text,
          processed_text
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('processing_status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching content items:', error)
      return NextResponse.json(
        { error: 'Failed to fetch content' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      items: data || [],
      count: data?.length || 0
    })

  } catch (error) {
    console.error('Error in content API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get content item by ID
export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json()
    
    if (!id) {
      return NextResponse.json(
        { error: 'Content item ID is required' },
        { status: 400 }
      )
    }

    const userId = '00000000-0000-0000-0000-000000000000' // TODO: Get from auth session
    const serverClient = createServerClient()
    
    const { data, error } = await serverClient
      .from('content_items')
      .select(`
        *,
        content_sources (
          name,
          source_type,
          source_url,
          metadata
        ),
        generated_summaries (
          *
        ),
        content_transcripts (
          *
        ),
        content_topics (
          *,
          topics (
            id,
            name,
            description,
            metadata
          )
        )
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Error fetching content item:', error)
      return NextResponse.json(
        { error: 'Content item not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      item: data
    })

  } catch (error) {
    console.error('Error in content details API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}