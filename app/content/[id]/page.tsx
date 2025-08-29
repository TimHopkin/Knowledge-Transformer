'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { formatDuration, formatDate, formatRelativeTime } from '@/lib/utils'

interface ContentItem {
  id: string
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

export default function ContentViewPage() {
  const params = useParams()
  const router = useRouter()
  const [content, setContent] = useState<ContentItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'summary' | 'transcript' | 'topics'>('summary')

  useEffect(() => {
    fetchContent()
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Content Not Found</h1>
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
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
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {content.title}
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                  <span>📺 {content.content_sources?.name}</span>
                  {content.duration_seconds && (
                    <span>⏱️ {formatDuration(content.duration_seconds)}</span>
                  )}
                  <span>📅 {formatRelativeTime(content.published_at)}</span>
                </div>
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
                { key: 'transcript', label: 'Transcript', icon: '📄', available: !!transcript },
                { key: 'topics', label: 'Topics', icon: '🏷️', available: topics.length > 0 }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  disabled={!tab.available}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : tab.available
                      ? 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      : 'border-transparent text-gray-300 cursor-not-allowed'
                  }`}
                >
                  {tab.icon} {tab.label}
                  {!tab.available && ' (Not Available)'}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {activeTab === 'summary' && summary && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {summary.title}
              </h2>
              
              {summary.key_points.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Key Points</h3>
                  <ul className="space-y-2">
                    {summary.key_points.map((point, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span className="text-gray-700">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Summary</h3>
                <div className="prose max-w-none text-gray-700">
                  {summary.content.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-4">
                      {paragraph}
                    </p>
                  ))}
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
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
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
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Extracted Topics ({topics.length})
              </h2>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {topics.map((topicRelation, index) => {
                  const topic = topicRelation.topics
                  return (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900">{topic.name}</h3>
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">No AI Summary Available</h3>
              <p className="text-gray-600">This content hasn't been processed for AI analysis yet.</p>
            </div>
          )}

          {activeTab === 'transcript' && !transcript && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📄</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Transcript Available</h3>
              <p className="text-gray-600">Transcript extraction failed or is not available for this content.</p>
            </div>
          )}

          {activeTab === 'topics' && topics.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🏷️</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Topics Extracted</h3>
              <p className="text-gray-600">No topics have been identified for this content yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}