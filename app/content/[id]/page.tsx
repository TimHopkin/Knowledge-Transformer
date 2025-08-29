'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDuration, formatDate, formatRelativeTime, truncateText } from '@/lib/utils'
import HighlightableText from '@/components/HighlightableText'
import CommentPanel from '@/components/CommentPanel'

interface ContentItem {
  id: string
  external_id: string
  title: string
  description: string
  duration_seconds: number
  published_at: string
  raw_metadata: any
  processing_status: string
  content_sources: {
    name: string
    source_type: string
    source_url: string
  }
  generated_summaries: Array<{
    id: string
    title: string
    content: string
    key_points: string[]
    ai_model: string
    created_at: string
    generation_metadata: any
  }>
  content_transcripts: Array<{
    id: string
    transcript_type: string
    raw_text: string
    processed_text: string
  }>
  content_topics: Array<{
    topics: {
      id: string
      name: string
      description: string
      metadata: any
    }
    relevance_score: number
  }>
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

export default function ContentViewPage() {
  const params = useParams()
  const router = useRouter()
  const [content, setContent] = useState<ContentItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'summary' | 'transcript' | 'topics'>('summary')
  const [generatingTranscript, setGeneratingTranscript] = useState(false)
  const [transcriptError, setTranscriptError] = useState('')
  const [generatingTopics, setGeneratingTopics] = useState(false)
  const [topicsError, setTopicsError] = useState('')
  const [highlights, setHighlights] = useState<Record<string, Highlight[]>>({})
  const [selectedHighlight, setSelectedHighlight] = useState<Highlight | null>(null)
  const [showHighlightPanel, setShowHighlightPanel] = useState(false)
  const [highlightingEnabled, setHighlightingEnabled] = useState(false)

  useEffect(() => {
    fetchContent()
    fetchHighlights()
  }, [params.id])

  const fetchContent = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: params.id })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch content')
      }

      const result = await response.json()
      setContent(result.item)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const generateTranscript = async () => {
    try {
      setGeneratingTranscript(true)
      setTranscriptError('')
      
      const response = await fetch(`/api/content/${params.id}/transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate transcript')
      }

      // Refresh content to show new transcript
      await fetchContent()
      setActiveTab('transcript')
      
    } catch (err) {
      setTranscriptError(err instanceof Error ? err.message : 'Failed to generate transcript')
    } finally {
      setGeneratingTranscript(false)
    }
  }

  const fetchHighlights = async () => {
    try {
      const response = await fetch(`/api/highlights?report_id=${params.id}`)
      if (response.ok) {
        const data = await response.json()
        
        // Group highlights by section
        const groupedHighlights: Record<string, Highlight[]> = {}
        data.highlights.forEach((highlight: Highlight) => {
          if (!groupedHighlights[highlight.content_section]) {
            groupedHighlights[highlight.content_section] = []
          }
          groupedHighlights[highlight.content_section].push(highlight)
        })
        
        setHighlights(groupedHighlights)
      }
    } catch (error) {
      console.error('Error fetching highlights:', error)
    }
  }

  const handleCreateHighlight = async (selection: {
    start_offset: number
    end_offset: number
    highlighted_text: string
    content_section: string
  }) => {
    try {
      // Create temporary highlight for immediate UI feedback
      const tempHighlight: Highlight = {
        id: crypto.randomUUID(),
        ...selection,
        highlight_color: 'yellow'
      }

      // Add to state immediately
      setHighlights(prev => {
        const newHighlights = { ...prev }
        if (!newHighlights[selection.content_section]) {
          newHighlights[selection.content_section] = []
        }
        newHighlights[selection.content_section].push(tempHighlight)
        return newHighlights
      })

      // Open highlight panel and select the new highlight
      setSelectedHighlight(tempHighlight)
      setShowHighlightPanel(true)

      // Save to database
      const response = await fetch('/api/highlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id: params.id,
          ...selection
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Update with real ID from database
        setHighlights(prev => {
          const newHighlights = { ...prev }
          const sectionHighlights = newHighlights[selection.content_section] || []
          const tempIndex = sectionHighlights.findIndex(h => h.id === tempHighlight.id)
          if (tempIndex !== -1) {
            sectionHighlights[tempIndex] = { ...data.highlight }
          }
          return newHighlights
        })
        
        setSelectedHighlight({ ...data.highlight })
      }
    } catch (error) {
      console.error('Error creating highlight:', error)
    }
  }

  const handleHighlightClick = (highlight: Highlight) => {
    setSelectedHighlight(highlight)
    setShowHighlightPanel(true)
  }

  const handleHighlightUpdate = (highlightId: string, updates: { note?: string, highlight_color?: string, start_offset?: number, end_offset?: number, highlighted_text?: string }) => {
    setHighlights(prev => {
      const newHighlights = { ...prev }
      Object.keys(newHighlights).forEach(section => {
        newHighlights[section] = newHighlights[section].map(h => 
          h.id === highlightId ? { ...h, ...updates } : h
        )
      })
      return newHighlights
    })
    
    if (selectedHighlight?.id === highlightId) {
      setSelectedHighlight(prev => prev ? { ...prev, ...updates } : null)
    }
  }

  const handleHighlightDelete = (highlightId: string) => {
    setHighlights(prev => {
      const newHighlights = { ...prev }
      Object.keys(newHighlights).forEach(section => {
        newHighlights[section] = newHighlights[section].filter(h => h.id !== highlightId)
      })
      return newHighlights
    })
    
    if (selectedHighlight?.id === highlightId) {
      setSelectedHighlight(null)
    }
  }

  // Get all highlights as flat array
  const allHighlights = Object.values(highlights).flat()

  const generateTopics = async () => {
    if (!content?.external_id) return
    
    setGeneratingTopics(true)
    setTopicsError('')
    
    try {
      const response = await fetch(`/api/content/${content.id}/topics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: content.external_id })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        setTopicsError(data.error || 'Failed to generate topics')
        return
      }
      
      // Refresh content to get updated topics
      await fetchContent()
      setActiveTab('topics')
      
    } catch (error) {
      console.error('Error generating topics:', error)
      setTopicsError('Failed to generate topics')
    } finally {
      setGeneratingTopics(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading content...</p>
        </div>
      </div>
    )
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 font-['Inter']">Content Not Found</h1>
          <p className="text-gray-600 mb-4">{error || 'The requested content could not be found.'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const summary = content.generated_summaries?.[0]
  const transcript = content.content_transcripts?.[0]
  const topics = content.content_topics || []

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="flex-1 max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/content" className="hover:text-blue-600">
              📚 Content Library
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">
              {truncateText(content.title, 40)}
            </span>
          </nav>
        </div>
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-start gap-4">
              {content.raw_metadata?.thumbnailUrl && (
                <img
                  src={content.raw_metadata.thumbnailUrl}
                  alt={content.title}
                  className="w-32 h-24 object-cover rounded"
                />
              )}
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2 font-['Inter']">
                  {content.title}
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                  <span>📺 {content.content_sources?.name}</span>
                  {content.duration_seconds && (
                    <span>⏱️ {formatDuration(content.duration_seconds)}</span>
                  )}
                  <span>📅 {formatRelativeTime(content.published_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      content.processing_status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : content.processing_status === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {content.processing_status}
                    </span>
                    {summary && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        AI Analysis: {summary.ai_model}
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={() => {
                      setHighlightingEnabled(!highlightingEnabled)
                      setShowHighlightPanel(true)
                    }}
                    className={`px-3 py-2 text-sm border rounded transition-colors ${
                      highlightingEnabled 
                        ? 'bg-purple-100 border-purple-300 text-purple-700' 
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    🖍️ {highlightingEnabled ? 'Stop Highlighting' : 'Highlight'} ({allHighlights.length})
                  </button>
                </div>
              </div>
            </div>

            {content.description && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-gray-700 text-sm leading-relaxed">
                  {content.description.length > 300
                    ? `${content.description.slice(0, 300)}...`
                    : content.description
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'summary', label: 'AI Summary', icon: '📝', available: !!summary },
                { key: 'transcript', label: 'Transcript', icon: '📄', available: true }, // Always allow access to transcript tab
                { key: 'topics', label: 'Topics', icon: '🏷️', available: true } // Always allow access to topics tab
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  disabled={tab.key === 'summary' && !tab.available} // Only disable summary tab when not available
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : (tab.available || tab.key === 'transcript' || tab.key === 'topics')
                      ? 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      : 'border-transparent text-gray-300 cursor-not-allowed'
                  }`}
                >
                  {tab.icon} {tab.label}
                  {!tab.available && tab.key === 'summary' && ' (Not Available)'}
                  {tab.key === 'transcript' && !transcript && ' (Not Available)'}
                  {tab.key === 'topics' && topics.length === 0 && ' (Not Available)'}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {activeTab === 'summary' && summary && (
            <div className="prose prose-lg max-w-none">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6 font-['Inter'] leading-tight">
                {summary.title}
              </h2>
              
              {summary.key_points.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 font-['Inter']">Key Points</h3>
                  <ul className="space-y-3">
                    {summary.key_points.map((point, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <HighlightableText
                          text={point}
                          section={`keyPoint${index}`}
                          reportId={content.id}
                          highlights={highlights[`keyPoint${index}`] || []}
                          onHighlight={handleCreateHighlight}
                          onHighlightClick={handleHighlightClick}
                          onHighlightUpdate={handleHighlightUpdate}
                          className="text-gray-700 leading-relaxed font-['Inter']"
                          highlightingEnabled={highlightingEnabled}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 font-['Inter']">Full Summary</h3>
                <div className="prose prose-gray max-w-none">
                  <HighlightableText
                    text={summary.content}
                    section="summary"
                    reportId={content.id}
                    highlights={highlights.summary || []}
                    onHighlight={handleCreateHighlight}
                    onHighlightClick={handleHighlightClick}
                    onHighlightUpdate={handleHighlightUpdate}
                    className="text-gray-700 leading-relaxed font-['Inter'] text-base"
                    highlightingEnabled={highlightingEnabled}
                  />
                </div>
              </div>

              {summary.generation_metadata && (
                <div className="mt-6 pt-4 border-t border-gray-200 text-sm text-gray-500">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <span className="font-medium">Model:</span> {summary.ai_model}
                    </div>
                    <div>
                      <span className="font-medium">Confidence:</span> {(summary.generation_metadata.confidence * 100).toFixed(1)}%
                    </div>
                    <div>
                      <span className="font-medium">Processing Time:</span> {summary.generation_metadata.processingTime}s
                    </div>
                    <div>
                      <span className="font-medium">Tokens Used:</span> {summary.generation_metadata.tokensUsed}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'transcript' && transcript && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 font-['Inter']">
                Transcript ({transcript.transcript_type})
              </h2>
              
              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                  {transcript.processed_text || transcript.raw_text}
                </div>
              </div>
              
              <div className="mt-4 text-sm text-gray-500">
                <span className="font-medium">Type:</span> {transcript.transcript_type} • 
                <span className="font-medium"> Length:</span> {transcript.raw_text.length.toLocaleString()} characters
              </div>
            </div>
          )}

          {activeTab === 'topics' && topics.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 font-['Inter']">
                Extracted Topics ({topics.length})
              </h2>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {topics.map((topicRelation, index) => {
                  const topic = topicRelation.topics
                  return (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900 font-['Inter']">{topic.name}</h3>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {Math.round(topicRelation.relevance_score * 100)}% relevant
                        </span>
                      </div>
                      {topic.description && (
                        <p className="text-sm text-gray-600 mb-3">{topic.description}</p>
                      )}
                      {topic.metadata?.keywords && (
                        <div className="flex flex-wrap gap-1">
                          {topic.metadata.keywords.slice(0, 3).map((keyword: string, i: number) => (
                            <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Empty States */}
          {activeTab === 'summary' && !summary && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2 font-['Inter']">No AI Summary Available</h3>
              <p className="text-gray-600">This content hasn't been processed for AI analysis yet.</p>
            </div>
          )}

          {activeTab === 'transcript' && !transcript && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📄</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2 font-['Inter']">No Transcript Available</h3>
              <p className="text-gray-600 mb-6">
                {transcriptError ? transcriptError : 'Transcript has not been generated for this content yet.'}
              </p>
              
              <button
                onClick={generateTranscript}
                disabled={generatingTranscript}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  generatingTranscript
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {generatingTranscript ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Generating Transcript...
                  </span>
                ) : (
                  'Generate Transcript'
                )}
              </button>
            </div>
          )}

          {activeTab === 'topics' && topics.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🏷️</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2 font-['Inter']">No Topics Extracted</h3>
              <p className="text-gray-600 mb-6">
                {topicsError ? topicsError : 'No topics have been identified for this content yet.'}
              </p>
              
              <button
                onClick={generateTopics}
                disabled={generatingTopics}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  generatingTopics
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {generatingTopics ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Extracting Topics...
                  </span>
                ) : (
                  'Generate Topics'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Highlight Panel */}
      {showHighlightPanel && (
        <CommentPanel
          reportId={content.id}
          selectedHighlight={selectedHighlight}
          allHighlights={allHighlights}
          onHighlightUpdate={handleHighlightUpdate}
          onHighlightSelect={handleHighlightClick}
          onHighlightDelete={handleHighlightDelete}
          onClose={() => {
            setShowHighlightPanel(false)
            setSelectedHighlight(null)
          }}
        />
      )}
    </div>
  )
}