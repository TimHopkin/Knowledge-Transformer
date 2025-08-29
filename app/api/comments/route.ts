import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get('report_id')
    const highlightId = searchParams.get('highlight_id')
    const contentSection = searchParams.get('content_section')
    
    if (!reportId) {
      return NextResponse.json(
        { error: 'report_id parameter is required' },
        { status: 400 }
      )
    }

    const userId = '00000000-0000-0000-0000-000000000000' // TODO: Get from auth session
    const serverClient = createServerClient()

    let query = serverClient
      .from('report_comments')
      .select(`
        *,
        highlight:report_highlights(highlighted_text, content_section),
        replies:report_comments!parent_comment_id(*)
      `)
      .eq('report_id', reportId)
      .eq('user_id', userId)
      .is('parent_comment_id', null) // Only top-level comments
      .order('created_at', { ascending: true })

    if (highlightId) {
      query = query.eq('highlight_id', highlightId)
    }

    if (contentSection) {
      query = query.eq('content_section', contentSection)
    }

    const { data: comments, error } = await query

    if (error) {
      console.error('Error fetching comments:', error)
      return NextResponse.json(
        { error: 'Failed to fetch comments' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      comments: comments || []
    })

  } catch (error) {
    console.error('Error in comments GET API:', error)
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
      highlight_id,
      content_section,
      comment_text,
      comment_type = 'general',
      parent_comment_id
    } = body

    if (!report_id || !comment_text) {
      return NextResponse.json(
        { error: 'Missing required fields: report_id, comment_text' },
        { status: 400 }
      )
    }

    const userId = '00000000-0000-0000-0000-000000000000' // TODO: Get from auth session
    const serverClient = createServerClient()

    const { data: comment, error } = await serverClient
      .from('report_comments')
      .insert({
        report_id,
        user_id: userId,
        highlight_id,
        content_section,
        comment_text,
        comment_type,
        parent_comment_id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating comment:', error)
      return NextResponse.json(
        { error: 'Failed to create comment' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      comment
    })

  } catch (error) {
    console.error('Error in comments POST API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}