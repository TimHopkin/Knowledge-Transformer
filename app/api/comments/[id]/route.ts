import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { comment_text, comment_type, is_resolved } = body
    const commentId = params.id

    const userId = '00000000-0000-0000-0000-000000000000' // TODO: Get from auth session
    const serverClient = createServerClient()

    const { data: comment, error } = await serverClient
      .from('report_comments')
      .update({
        comment_text,
        comment_type,
        is_resolved,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating comment:', error)
      return NextResponse.json(
        { error: 'Failed to update comment' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      comment
    })

  } catch (error) {
    console.error('Error in comment PUT API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const commentId = params.id
    const userId = '00000000-0000-0000-0000-000000000000' // TODO: Get from auth session
    const serverClient = createServerClient()

    const { error } = await serverClient
      .from('report_comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting comment:', error)
      return NextResponse.json(
        { error: 'Failed to delete comment' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully'
    })

  } catch (error) {
    console.error('Error in comment DELETE API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}