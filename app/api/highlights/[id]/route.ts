import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { note, highlight_color, start_offset, end_offset, highlighted_text } = body
    const highlightId = params.id

    const userId = '00000000-0000-0000-0000-000000000000'
    const serverClient = createServerClient()

    // Get current highlight
    const { data: currentJob, error: fetchError } = await serverClient
      .from('ai_processing_jobs')
      .select('result')
      .eq('id', highlightId)
      .eq('user_id', userId)
      .eq('job_type', 'highlight')
      .single()

    if (fetchError) {
      console.error('Error fetching current highlight:', fetchError)
      return NextResponse.json(
        { error: 'Highlight not found' },
        { status: 404 }
      )
    }

    // Update highlight data
    const updatedResult = {
      ...currentJob.result,
      note,
      highlight_color,
      start_offset: start_offset !== undefined ? start_offset : currentJob.result.start_offset,
      end_offset: end_offset !== undefined ? end_offset : currentJob.result.end_offset,
      highlighted_text: highlighted_text || currentJob.result.highlighted_text
    }

    const { data: highlight, error } = await serverClient
      .from('ai_processing_jobs')
      .update({
        result: updatedResult,
        completed_at: new Date().toISOString()
      })
      .eq('id', highlightId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating highlight:', error)
      return NextResponse.json(
        { error: 'Failed to update highlight' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      highlight: {
        id: highlight.id,
        ...updatedResult,
        created_at: highlight.created_at
      }
    })

  } catch (error) {
    console.error('Error in highlight PUT API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const highlightId = params.id
    const userId = '00000000-0000-0000-0000-000000000000'
    const serverClient = createServerClient()

    const { error } = await serverClient
      .from('ai_processing_jobs')
      .delete()
      .eq('id', highlightId)
      .eq('user_id', userId)
      .eq('job_type', 'highlight')

    if (error) {
      console.error('Error deleting highlight:', error)
      return NextResponse.json(
        { error: 'Failed to delete highlight' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Highlight deleted successfully'
    })

  } catch (error) {
    console.error('Error in highlight DELETE API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}