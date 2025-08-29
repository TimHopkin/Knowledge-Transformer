'use client'

import { useState, useRef, useCallback, useEffect, ReactNode } from 'react'

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

interface HighlightableTextProps {
  text: string
  section: string
  reportId: string
  highlights: Highlight[]
  onHighlight: (selection: {
    start_offset: number
    end_offset: number
    highlighted_text: string
    content_section: string
  }) => void
  onHighlightClick: (highlight: Highlight) => void
  onHighlightUpdate?: (highlightId: string, updates: {
    start_offset?: number
    end_offset?: number
    highlighted_text?: string
  }) => void
  className?: string
  highlightingEnabled: boolean
}

export default function HighlightableText({
  text,
  section,
  reportId,
  highlights,
  onHighlight,
  onHighlightClick,
  onHighlightUpdate,
  className = '',
  highlightingEnabled
}: HighlightableTextProps) {
  const textRef = useRef<HTMLDivElement>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [isCreatingHighlight, setIsCreatingHighlight] = useState(false)
  const [dragState, setDragState] = useState<{
    highlightId: string
    type: 'start' | 'end'
    originalStart: number
    originalEnd: number
    currentStart: number
    currentEnd: number
  } | null>(null)

  const handleMouseUp = useCallback(() => {
    if (!textRef.current || !highlightingEnabled || isCreatingHighlight) return

    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || selection.toString().trim().length === 0) {
      return
    }

    // Prevent rapid duplicate highlights
    setIsCreatingHighlight(true)

    const range = selection.getRangeAt(0)
    const textContent = textRef.current.textContent || ''
    
    // Get the start and end offsets
    const startOffset = getTextOffset(textRef.current, range.startContainer, range.startOffset)
    const endOffset = getTextOffset(textRef.current, range.endContainer, range.endOffset)
    
    if (startOffset !== -1 && endOffset !== -1 && startOffset < endOffset) {
      // Snap selection to word boundaries
      const wordBounds = findWordBoundaries(text, startOffset, endOffset)
      const wordSnappedText = text.slice(wordBounds.start, wordBounds.end)
      
      // Check if this text overlaps with any existing highlights
      const isAlreadyHighlighted = highlights.some(h => 
        // Check for any overlap: new selection overlaps with existing highlight
        (wordBounds.start >= h.start_offset && wordBounds.start < h.end_offset) ||
        (wordBounds.end > h.start_offset && wordBounds.end <= h.end_offset) ||
        (wordBounds.start <= h.start_offset && wordBounds.end >= h.end_offset)
      )
      
      if (!isAlreadyHighlighted && wordSnappedText.trim().length > 0) {
        onHighlight({
          start_offset: wordBounds.start,
          end_offset: wordBounds.end,
          highlighted_text: wordSnappedText,
          content_section: section
        })
      }
    }

    selection.removeAllRanges()
    
    // Reset creating state after a short delay
    setTimeout(() => setIsCreatingHighlight(false), 200)
  }, [section, onHighlight, highlightingEnabled, highlights, isCreatingHighlight])

  const handleDragStart = (highlightId: string, type: 'start' | 'end') => {
    const highlight = highlights.find(h => h.id === highlightId)
    if (!highlight || !onHighlightUpdate) return

    console.log('Starting simple drag for:', highlightId, type)
    
    setDragState({
      highlightId,
      type,
      originalStart: highlight.start_offset,
      originalEnd: highlight.end_offset,
      currentStart: highlight.start_offset,
      currentEnd: highlight.end_offset
    })

    const handleMouseMove = (e: MouseEvent) => {
      if (!textRef.current || !dragState) return
      
      // Get all text content as a single string
      const fullText = textRef.current.textContent || ''
      
      // Simple approach: map mouse X position to text position
      const rect = textRef.current.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const textRatio = Math.max(0, Math.min(1, mouseX / rect.width))
      const roughCharPos = Math.floor(textRatio * fullText.length)
      
      // Snap to word boundary
      const wordBoundary = findNearestWordBoundary(fullText, roughCharPos, type)
      
      if (type === 'start') {
        const newStart = Math.max(0, Math.min(wordBoundary, dragState.originalEnd - 1))
        setDragState(prev => prev ? { ...prev, currentStart: newStart } : null)
      } else {
        const newEnd = Math.min(fullText.length, Math.max(wordBoundary, dragState.originalStart + 1))
        setDragState(prev => prev ? { ...prev, currentEnd: newEnd } : null)
      }
    }

    const handleMouseUp = () => {
      if (dragState && onHighlightUpdate) {
        const newText = text.slice(dragState.currentStart, dragState.currentEnd)
        console.log('Drag complete:', { start: dragState.currentStart, end: dragState.currentEnd, text: newText })
        
        onHighlightUpdate(highlightId, {
          start_offset: dragState.currentStart,
          end_offset: dragState.currentEnd,
          highlighted_text: newText
        })
      }
      
      setDragState(null)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // Helper function to get text offset relative to container
  const getTextOffset = (container: Node, node: Node, offset: number): number => {
    let textOffset = 0
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    )

    let currentNode
    while (currentNode = walker.nextNode()) {
      if (currentNode === node) {
        return textOffset + offset
      }
      textOffset += currentNode.textContent?.length || 0
    }

    return -1
  }

  // Helper function to find word boundaries
  const findWordBoundaries = (text: string, startPos: number, endPos: number): {start: number, end: number} => {
    // Find start of word by moving backward from startPos
    let wordStart = startPos
    while (wordStart > 0 && /\w/.test(text[wordStart - 1])) {
      wordStart--
    }
    
    // Find end of word by moving forward from endPos
    let wordEnd = endPos
    while (wordEnd < text.length && /\w/.test(text[wordEnd])) {
      wordEnd++
    }
    
    return { start: wordStart, end: wordEnd }
  }

  // Helper function to find nearest word boundary in a direction
  const findNearestWordBoundary = (text: string, position: number, direction: 'start' | 'end'): number => {
    if (direction === 'start') {
      // Move backward to find word start
      let pos = position
      while (pos > 0 && /\w/.test(text[pos - 1])) {
        pos--
      }
      return pos
    } else {
      // Move forward to find word end
      let pos = position
      while (pos < text.length && /\w/.test(text[pos])) {
        pos++
      }
      return pos
    }
  }

  // Create highlighted text with overlays
  const renderHighlightedText = (): ReactNode => {
    if (highlights.length === 0) {
      return text
    }

    // Sort highlights by start position and deduplicate
    const sortedHighlights = [...highlights]
      .sort((a, b) => a.start_offset - b.start_offset)
      // Remove duplicates based on position
      .filter((highlight, index, arr) => {
        if (index === 0) return true
        const prev = arr[index - 1]
        return !(highlight.start_offset === prev.start_offset && highlight.end_offset === prev.end_offset)
      })
    
    const elements: ReactNode[] = []
    let lastIndex = 0

    sortedHighlights.forEach((highlight, i) => {
      // Skip if this highlight overlaps with previous processed text
      if (highlight.start_offset < lastIndex) {
        return
      }

      // Use drag state if this highlight is being dragged
      const isBeingDragged = dragState?.highlightId === highlight.id
      const displayHighlight = isBeingDragged && dragState ? 
        { ...highlight, start_offset: dragState.currentStart, end_offset: dragState.currentEnd, highlighted_text: text.slice(dragState.currentStart, dragState.currentEnd) } : 
        highlight

      // Add text before highlight
      if (displayHighlight.start_offset > lastIndex) {
        elements.push(
          <span key={`text-${i}`}>
            {text.slice(lastIndex, displayHighlight.start_offset)}
          </span>
        )
      }

      // Add highlighted text
      const colorClass = {
        yellow: 'bg-yellow-200 hover:bg-yellow-300 border-l-2 border-yellow-400 shadow-sm',
        green: 'bg-green-200 hover:bg-green-300 border-l-2 border-green-400 shadow-sm',
        blue: 'bg-blue-200 hover:bg-blue-300 border-l-2 border-blue-400 shadow-sm',
        red: 'bg-red-200 hover:bg-red-300 border-l-2 border-red-400 shadow-sm',
        purple: 'bg-purple-200 hover:bg-purple-300 border-l-2 border-purple-400 shadow-sm'
      }[highlight.highlight_color] || 'bg-yellow-200 hover:bg-yellow-300 border-l-2 border-yellow-400 shadow-sm'
      
      elements.push(
        <span
          key={`highlight-${highlight.id}`}
          className={`${colorClass} cursor-pointer rounded-md px-2 py-1 transition-all duration-200 relative group hover:scale-[1.02] ${isBeingDragged ? 'opacity-75 ring-2 ring-blue-300' : ''}`}
          onClick={() => onHighlightClick(highlight)}
          title={highlight.note || 'Click to view/edit note'}
        >
          {/* Start drag handle */}
          {onHighlightUpdate && !highlightingEnabled && (
            <button
              className="absolute -left-4 top-1/2 -translate-y-1/2 w-4 h-8 cursor-col-resize opacity-0 group-hover:opacity-100 bg-blue-600 hover:bg-blue-800 rounded text-white text-xs flex items-center justify-center transition-all z-30 shadow-lg border border-white"
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('Start drag handle clicked')
                handleDragStart(highlight.id, 'start')
              }}
              title="Drag to extend highlight backward"
            >
              ◀
            </button>
          )}
          
          {displayHighlight.highlighted_text}
          
          {/* End drag handle */}
          {onHighlightUpdate && !highlightingEnabled && (
            <button
              className="absolute -right-4 top-1/2 -translate-y-1/2 w-4 h-8 cursor-col-resize opacity-0 group-hover:opacity-100 bg-blue-600 hover:bg-blue-800 rounded text-white text-xs flex items-center justify-center transition-all z-30 shadow-lg border border-white"
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('End drag handle clicked')
                handleDragStart(highlight.id, 'end')
              }}
              title="Drag to extend highlight forward"
            >
              ▶
            </button>
          )}
          
          {highlight.note && (
            <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
              📝 Note available
            </span>
          )}
        </span>
      )

      lastIndex = Math.max(lastIndex, displayHighlight.end_offset)
    })

    // Add remaining text
    if (lastIndex < text.length) {
      elements.push(
        <span key="text-end">
          {text.slice(lastIndex)}
        </span>
      )
    }

    return elements
  }

  return (
    <div
      ref={textRef}
      className={`select-text leading-relaxed ${highlightingEnabled ? 'cursor-crosshair' : 'cursor-text'} ${className}`}
      onMouseUp={handleMouseUp}
      style={{ userSelect: 'text' }}
      suppressContentEditableWarning={true}
    >
      {renderHighlightedText()}
    </div>
  )
}