'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDuration, formatRelativeTime, truncateText } from '@/lib/utils'

interface ContentItem {
  id: string
  title: string
  description: string
  duration_seconds: number
  published_at: string
  raw_metadata: any
  processing_status: string
  created_at: string
  content_sources: {
    name: string
    source_type: string
    source_url: string
  }
  generated_summaries: Array<{
    title: string
    key_points: string[]
  }>
  content_topics: Array<{
    topics: {
      name: string
    }
  }>
}

export default function ContentBrowserPage() {
  const [content, setContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all')

  useEffect(() => {
    fetchContent()
  }, [filter])

  const fetchContent = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        limit: '50',
        ...(filter !== 'all' && { status: filter })
      })
      
      const response = await fetch(`/api/content?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch content')
      }

      const result = await response.json()
      setContent(result.items || [])
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Content Library</h1>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              + Process New Content
            </Link>
          </div>
          
          <p className="text-gray-600 mb-6">
            Browse and explore your AI-processed YouTube content collection
          </p>

          {/* Filters */}
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'All Content', count: content.length },
              { key: 'completed', label: 'Completed', count: content.filter(c => c.processing_status === 'completed').length },
              { key: 'pending', label: 'Pending', count: content.filter(c => c.processing_status === 'pending').length },
              { key: 'failed', label: 'Failed', count: content.filter(c => c.processing_status === 'failed').length }
            ].map((filterOption) => (
              <button
                key={filterOption.key}
                onClick={() => setFilter(filterOption.key as any)}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  filter === filterOption.key
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {filterOption.label} ({filterOption.count})
              </button>
            ))}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="text-red-400">❌</div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error Loading Content</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Content Grid */}
        {content.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {filter === 'all' ? 'No Content Yet' : `No ${filter.charAt(0).toUpperCase() + filter.slice(1)} Content`}
            </h2>
            <p className="text-gray-600 mb-6">
              {filter === 'all' 
                ? 'Start by processing some YouTube content to build your knowledge library.'
                : `There is no ${filter} content at the moment.`
              }
            </p>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              Process YouTube Content
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {content.map((item) => (
              <Link key={item.id} href={`/content/${item.id}`}>
                <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer overflow-hidden">
                  {/* Thumbnail */}
                  {item.raw_metadata?.thumbnailUrl && (
                    <img
                      src={item.raw_metadata.thumbnailUrl}
                      alt={item.title}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  
                  <div className="p-4">
                    {/* Status Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.processing_status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : item.processing_status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : item.processing_status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {item.processing_status}
                      </span>
                      
                      <div className="text-xs text-gray-500">
                        {formatRelativeTime(item.created_at)}
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                      {truncateText(item.title, 80)}
                    </h3>

                    {/* Source Info */}
                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                      <span>📺 {truncateText(item.content_sources?.name || 'Unknown', 25)}</span>
                      {item.duration_seconds && (
                        <span>⏱️ {formatDuration(item.duration_seconds)}</span>
                      )}
                    </div>

                    {/* Description */}
                    {item.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {truncateText(item.description, 120)}
                      </p>
                    )}

                    {/* Summary Info */}
                    {item.generated_summaries?.[0] && (
                      <div className="mb-3">
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          {truncateText(item.generated_summaries[0].title, 50)}
                        </div>
                        {item.generated_summaries[0].key_points?.length > 0 && (
                          <div className="text-xs text-gray-600">
                            {item.generated_summaries[0].key_points.length} key points
                          </div>
                        )}
                      </div>
                    )}

                    {/* Topics */}
                    {item.content_topics && item.content_topics.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {item.content_topics.slice(0, 3).map((topicRelation, index) => (
                          <span
                            key={index}
                            className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                          >
                            {topicRelation.topics.name}
                          </span>
                        ))}
                        {item.content_topics.length > 3 && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            +{item.content_topics.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* View Button */}
                    <div className="pt-2 border-t border-gray-100">
                      <div className="text-sm text-blue-600 font-medium">
                        View Details →
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Stats */}
        {content.length > 0 && (
          <div className="mt-12 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Library Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{content.length}</div>
                <div className="text-sm text-gray-600">Total Items</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {content.filter(c => c.processing_status === 'completed').length}
                </div>
                <div className="text-sm text-gray-600">Processed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {content.filter(c => c.generated_summaries?.length > 0).length}
                </div>
                <div className="text-sm text-gray-600">With AI Analysis</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {content.reduce((total, item) => {
                    return total + (item.duration_seconds || 0)
                  }, 0) / 3600}h
                </div>
                <div className="text-sm text-gray-600">Total Duration</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}