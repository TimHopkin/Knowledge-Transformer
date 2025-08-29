'use client'

import { useState, useEffect } from 'react'

interface Comment {
  id: string
  comment_text: string
  comment_type: 'general' | 'question' | 'insight' | 'action' | 'important'
  is_resolved: boolean
  created_at: string
  highlight?: {
    highlighted_text: string
    content_section: string
  }
  replies?: Comment[]
}

interface Highlight {
  id: string
  start_offset: number
  end_offset: number
  highlighted_text: string
  highlight_color: string
  note?: string
  content_section: string
  created_at?: string
}

interface CommentPanelProps {
  reportId: string
  selectedHighlight?: Highlight | null
  allHighlights: Highlight[]
  onHighlightUpdate: (highlightId: string, updates: { note?: string, highlight_color?: string, start_offset?: number, end_offset?: number, highlighted_text?: string }) => void
  onHighlightSelect: (highlight: Highlight) => void
  onHighlightDelete: (highlightId: string) => void
  onClose: () => void
}

export default function CommentPanel({ 
  reportId, 
  selectedHighlight,
  allHighlights,
  onHighlightUpdate,
  onHighlightSelect,
  onHighlightDelete,
  onClose 
}: CommentPanelProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [commentType, setCommentType] = useState<Comment['comment_type']>('general')
  const [highlightNote, setHighlightNote] = useState(selectedHighlight?.note || '')
  const [highlightColor, setHighlightColor] = useState(selectedHighlight?.highlight_color || 'yellow')
  const [loading, setLoading] = useState(false)
  const [editingBoundary, setEditingBoundary] = useState(false)
  const [tempStartOffset, setTempStartOffset] = useState(selectedHighlight?.start_offset || 0)
  const [tempEndOffset, setTempEndOffset] = useState(selectedHighlight?.end_offset || 0)
  const [currentView, setCurrentView] = useState<'highlights' | 'selected'>('highlights')

  useEffect(() => {
    if (selectedHighlight) {
      setHighlightNote(selectedHighlight.note || '')
      setHighlightColor(selectedHighlight.highlight_color || 'yellow')
      setTempStartOffset(selectedHighlight.start_offset)
      setTempEndOffset(selectedHighlight.end_offset)
      setCurrentView('selected')
      fetchComments()
    }
  }, [selectedHighlight])

  const fetchComments = async () => {
    if (!selectedHighlight) return

    try {
      setLoading(true)
      const params = new URLSearchParams({
        report_id: reportId,
        highlight_id: selectedHighlight.id
      })

      const response = await fetch(`/api/comments?${params}`)
      if (response.ok) {
        const data = await response.json()
        setComments(data.comments || [])
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveHighlightChanges = async () => {
    if (!selectedHighlight) return

    try {
      const updates: any = {
        note: highlightNote,
        highlight_color: highlightColor
      }

      if (editingBoundary) {
        updates.start_offset = tempStartOffset
        updates.end_offset = tempEndOffset
        // You'd need to recalculate highlighted_text based on new offsets
      }

      const response = await fetch(`/api/highlights/${selectedHighlight.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        const data = await response.json()
        onHighlightUpdate(selectedHighlight.id, data.highlight)
        setEditingBoundary(false)
      }
    } catch (error) {
      console.error('Error updating highlight:', error)
    }
  }

  const deleteHighlight = async (highlightId: string) => {
    if (!window.confirm('Delete this highlight?')) return

    try {
      const response = await fetch(`/api/highlights/${highlightId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        onHighlightDelete(highlightId)
        if (selectedHighlight?.id === highlightId) {
          setCurrentView('highlights')
        }
      }
    } catch (error) {
      console.error('Error deleting highlight:', error)
    }
  }

  const addComment = async () => {
    if (!newComment.trim() || !selectedHighlight) return

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id: reportId,
          highlight_id: selectedHighlight.id,
          comment_text: newComment.trim(),
          comment_type: commentType
        })
      })

      if (response.ok) {
        setNewComment('')
        setCommentType('general')
        fetchComments()
      }
    } catch (error) {
      console.error('Error creating comment:', error)
    }
  }

  const getCommentTypeIcon = (type: Comment['comment_type']) => {
    switch (type) {
      case 'question': return '❓'
      case 'insight': return '💡'
      case 'action': return '⚡'
      case 'important': return '❗'
      default: return '💬'
    }
  }

  const getCommentTypeColor = (type: Comment['comment_type']) => {
    switch (type) {
      case 'question': return 'text-blue-600 bg-blue-50'
      case 'insight': return 'text-yellow-600 bg-yellow-50'
      case 'action': return 'text-green-600 bg-green-50'
      case 'important': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  return (
    <div className="w-96 border-l border-gray-200 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentView('highlights')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                currentView === 'highlights' 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              📚 All ({allHighlights.length})
            </button>
            {selectedHighlight && (
              <button
                onClick={() => setCurrentView('selected')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  currentView === 'selected' 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                🖍️ Selected
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {currentView === 'highlights' ? (
          /* All Highlights View */
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3">All Highlights</h3>
            
            {allHighlights.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-3xl mb-2">🖍️</div>
                <p className="text-sm">No highlights yet</p>
                <p className="text-xs text-gray-400 mt-1">Select text to create highlights</p>
              </div>
            ) : (
              <div className="space-y-3">
                {allHighlights.map((highlight) => (
                  <div key={highlight.id} className="border border-gray-200 rounded p-3 hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded ${
                          highlight.highlight_color === 'yellow' ? 'bg-yellow-300' :
                          highlight.highlight_color === 'green' ? 'bg-green-300' :
                          highlight.highlight_color === 'blue' ? 'bg-blue-300' :
                          highlight.highlight_color === 'red' ? 'bg-red-300' :
                          'bg-purple-300'
                        }`} />
                        <span className="text-xs text-gray-500 capitalize">{highlight.content_section}</span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => onHighlightSelect(highlight)}
                          className="text-xs text-purple-600 hover:text-purple-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteHighlight(highlight.id)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-800 mb-2">
                      "{truncateText(highlight.highlighted_text, 120)}"
                    </p>
                    
                    {highlight.note && (
                      <div className="bg-yellow-50 p-2 rounded text-xs text-gray-700 mb-2">
                        💭 {truncateText(highlight.note, 80)}
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500">
                      {new Date(highlight.created_at || '').toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : selectedHighlight ? (
          /* Selected Highlight Detail View */
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Highlight Details</h3>
              <button
                onClick={() => setCurrentView('highlights')}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ← Back to All
              </button>
            </div>
            
            {/* Selected text display */}
            <div className="bg-gray-50 rounded p-3 mb-4">
              <div className="text-xs text-gray-500 mb-1">Selected Text:</div>
              <div className="text-sm font-medium text-gray-900 mb-2">
                "{selectedHighlight.highlighted_text}"
              </div>
              <div className="text-xs text-gray-500">
                Section: {selectedHighlight.content_section} | Position: {selectedHighlight.start_offset}-{selectedHighlight.end_offset}
              </div>
            </div>

            {/* Boundary Editing */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-gray-700">
                  Text Boundaries
                </label>
                <button
                  onClick={() => setEditingBoundary(!editingBoundary)}
                  className="text-xs text-purple-600 hover:text-purple-800"
                >
                  {editingBoundary ? 'Cancel' : 'Edit Range'}
                </button>
              </div>
              
              {editingBoundary && (
                <div className="bg-yellow-50 p-3 rounded text-xs">
                  <div className="flex gap-2 mb-2">
                    <div>
                      <label className="block text-gray-600 mb-1">Start:</label>
                      <input
                        type="number"
                        value={tempStartOffset}
                        onChange={(e) => setTempStartOffset(Number(e.target.value))}
                        className="w-full px-2 py-1 border rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">End:</label>
                      <input
                        type="number"
                        value={tempEndOffset}
                        onChange={(e) => setTempEndOffset(Number(e.target.value))}
                        className="w-full px-2 py-1 border rounded text-xs"
                      />
                    </div>
                  </div>
                  <button
                    onClick={saveHighlightChanges}
                    className="w-full px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700"
                  >
                    Update Boundaries
                  </button>
                </div>
              )}
            </div>

            {/* Highlight color picker */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Highlight Color
              </label>
              <div className="flex gap-2">
                {['yellow', 'green', 'blue', 'red', 'purple'].map((color) => (
                  <button
                    key={color}
                    onClick={() => setHighlightColor(color)}
                    className={`w-6 h-6 rounded border-2 ${
                      highlightColor === color ? 'border-gray-800' : 'border-gray-300'
                    } ${
                      color === 'yellow' ? 'bg-yellow-200' :
                      color === 'green' ? 'bg-green-200' :
                      color === 'blue' ? 'bg-blue-200' :
                      color === 'red' ? 'bg-red-200' :
                      'bg-purple-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Note input */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Personal Note
              </label>
              <textarea
                value={highlightNote}
                onChange={(e) => setHighlightNote(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                rows={3}
                placeholder="Add a personal note about this highlight..."
              />
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={saveHighlightChanges}
                className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Save Changes
              </button>
              <button
                onClick={() => deleteHighlight(selectedHighlight.id)}
                className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                🗑️
              </button>
            </div>

            {/* Comments section for selected highlight */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Comments</h4>
              
              {/* Add new comment */}
              <div className="mb-4">
                <div className="flex gap-2 mb-2">
                  <select
                    value={commentType}
                    onChange={(e) => setCommentType(e.target.value as Comment['comment_type'])}
                    className="text-xs border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="general">💬 General</option>
                    <option value="question">❓ Question</option>
                    <option value="insight">💡 Insight</option>
                    <option value="action">⚡ Action</option>
                    <option value="important">❗ Important</option>
                  </select>
                </div>
                
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  rows={3}
                  placeholder="Add a comment..."
                />
                
                <button
                  onClick={addComment}
                  disabled={!newComment.trim()}
                  className="mt-2 px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50"
                >
                  Add Comment
                </button>
              </div>

              {/* Comments list */}
              {loading ? (
                <div className="text-center py-4">
                  <div className="text-gray-500">Loading comments...</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="border border-gray-200 rounded p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${getCommentTypeColor(comment.comment_type)}`}>
                          <span>{getCommentTypeIcon(comment.comment_type)}</span>
                          <span className="capitalize">{comment.comment_type}</span>
                        </div>
                        <button
                          onClick={() => {/* deleteComment(comment.id) */}}
                          className="text-gray-400 hover:text-red-600 text-xs"
                        >
                          🗑️
                        </button>
                      </div>
                      
                      <p className="text-sm text-gray-800 mb-2">{comment.comment_text}</p>
                      
                      <div className="text-xs text-gray-500">
                        {new Date(comment.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                  
                  {comments.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      <div className="text-2xl mb-2">💬</div>
                      <p className="text-sm">No comments yet</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )

}