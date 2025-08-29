import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get('report_id')
    const contentSection = searchParams.get('content_section')
    
    if (!reportId) {
      return NextResponse.json(
        { error: 'report_id parameter is required' },
        { status: 400 }
      )
    }

    const userId = '00000000-0000-0000-0000-000000000000'
    const serverClient = createServerClient()

    // Use ai_processing_jobs table to store highlights temporarily
    const { data: highlights, error } = await serverClient
      .from('ai_processing_jobs')
      .select('id, result, created_at, input_data')
      .eq('user_id', userId)
      .eq('job_type', 'highlight')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching highlights:', error)
      return NextResponse.json(
        { error: 'Failed to fetch highlights' },
        { status: 500 }
      )
    }

    // Transform highlights data and filter by report_id
    const transformedHighlights = (highlights || [])
      .filter(job => job.input_data?.report_id === reportId)
      .map(job => ({
        id: job.id,
        ...job.result,
        created_at: job.created_at
      }))
      .filter(h => !contentSection || h.content_section === contentSection)

    return NextResponse.json({
      success: true,
      highlights: transformedHighlights
    })

  } catch (error) {
    console.error('Error in highlights GET API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      report_id,
      content_section,
      start_offset,
      end_offset,
      highlighted_text,
      highlight_color = 'yellow',
      note
    } = body

    if (!report_id || !content_section || start_offset === undefined || end_offset === undefined || !highlighted_text) {
      return NextResponse.json(
        { error: 'Missing required fields: report_id, content_section, start_offset, end_offset, highlighted_text' },
        { status: 400 }
      )
    }

    const userId = '00000000-0000-0000-0000-000000000000'
    const serverClient = createServerClient()

    // Store highlight in ai_processing_jobs table temporarily
    const highlightData = {
      report_id,
      content_section,
      start_offset,
      end_offset,
      highlighted_text,
      highlight_color,
      note,
      user_id: userId
    }

    const { data: highlight, error } = await serverClient
      .from('ai_processing_jobs')
      .insert({
        user_id: userId,
        job_type: 'highlight',
        input_data: { report_id, content_section },
        result: highlightData,
        status: 'completed'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating highlight:', error)
      return NextResponse.json(
        { error: 'Failed to create highlight' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      highlight: {
        id: highlight.id,
        ...highlightData,
        created_at: highlight.created_at
      }
    })

  } catch (error) {
    console.error('Error in highlights POST API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}