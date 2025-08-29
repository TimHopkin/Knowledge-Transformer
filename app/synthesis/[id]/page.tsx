'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import HighlightableText from '@/components/HighlightableText'
import CommentPanel from '@/components/CommentPanel'

interface Highlight {
  id: string
  start_offset: number
  end_offset: number
  highlighted_text: string
  highlight_color: string
  note?: string
  content_section: string
}

interface SynthesisReport {
  id: string
  title: string
  description: string
  content: {
    overview: string
    keyThemes: string[]
    insights: string[]
    patterns: string
    recommendations: string[]
    furtherResearch: string[]
    sourceCount: number
    totalDuration: number
    generatedAt: string
    fullContent: string
  }
  metadata: any
  createdAt: string
  sourceVideos: Array<{
    id: string
    title: string
    external_id: string
  }>
}

export default function SynthesisReportPage() {
  const params = useParams()
  const router = useRouter()
  const [report, setReport] = useState<SynthesisReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [highlights, setHighlights] = useState<Record<string, Highlight[]>>({})
  const [selectedHighlight, setSelectedHighlight] = useState<Highlight | null>(null)
  const [showCommentPanel, setShowCommentPanel] = useState(false)
  const [highlightingEnabled, setHighlightingEnabled] = useState(false)

  useEffect(() => {
    fetchReport()
    fetchHighlights()
  }, [params.id])

  const fetchReport = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/synthesis/${params.id}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Synthesis report not found')
        } else {
          setError('Failed to load synthesis report')
        }
        return
      }

      const data = await response.json()
      setReport(data.report)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
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
      setShowCommentPanel(true)

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
    setShowCommentPanel(true)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading synthesis report...</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 font-['Inter']">Report Not Found</h1>
          <p className="text-gray-600 mb-4">{error || 'The requested synthesis report could not be found.'}</p>
          <Link
            href="/content"
            className="inline-block px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Back to Content Library
          </Link>
        </div>
      </div>
    )
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="flex-1 max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-blue-600">
              🏠 Home
            </Link>
            <span>/</span>
            <Link href="/synthesis" className="hover:text-blue-600">
              🔬 Synthesis Reports
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">
              {report?.title ? (report.title.length > 30 ? report.title.substring(0, 30) + '...' : report.title) : 'Report'}
            </span>
          </nav>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/synthesis"
              className="text-gray-500 hover:text-gray-700 text-sm font-medium"
            >
              ← Back to Synthesis Reports
            </Link>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2 font-['Inter']">
                  🔬 {report.title}
                </h1>
                {report.description && (
                  <p className="text-gray-600 mb-4">{report.description}</p>
                )}
                
                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <span>📹 {report.content.sourceCount} videos analyzed</span>
                  <span>⏱️ {formatDuration(report.content.totalDuration)} total content</span>
                  <span>📅 Generated {new Date(report.content.generatedAt).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setHighlightingEnabled(!highlightingEnabled)
                    setShowCommentPanel(true)
                  }}
                  className={`px-3 py-2 text-sm border rounded transition-colors ${
                    highlightingEnabled 
                      ? 'bg-purple-100 border-purple-300 text-purple-700' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  🖍️ {highlightingEnabled ? 'Stop Highlighting' : 'Highlight'}
                </button>
                <button className="px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
                  📄 Export PDF
                </button>
                <button className="px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
                  💾 Export Markdown
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Source Videos */}
        {report.sourceVideos && report.sourceVideos.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 font-['Inter']">Source Videos</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {report.sourceVideos.map((video, index) => (
                <Link
                  key={video.id}
                  href={`/content/${video.id}`}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate font-['Inter']">{video.title}</p>
                    <p className="text-xs text-gray-500">YouTube Video</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Report Content */}
        <div className="space-y-8">
          {/* Executive Overview */}
          {report.content.overview && (
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 font-['Inter'] leading-tight">📋 Executive Overview</h2>
              <div className="prose prose-lg max-w-none">
                <HighlightableText
                  text={report.content.overview}
                  section="overview"
                  reportId={report.id}
                  highlights={highlights.overview || []}
                  onHighlight={handleCreateHighlight}
                  onHighlightClick={handleHighlightClick}
                  onHighlightUpdate={handleHighlightUpdate}
                  className="text-gray-700 leading-relaxed font-['Inter'] text-base"
                  highlightingEnabled={highlightingEnabled}
                />
              </div>
            </div>
          )}

          {/* Key Themes */}
          {report.content.keyThemes && report.content.keyThemes.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 font-['Inter'] leading-tight">🏷️ Key Themes</h2>
              <div className="grid gap-6 md:grid-cols-2">
                {report.content.keyThemes.map((theme, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-6">
                    <div className="font-semibold text-gray-900 mb-3 font-['Inter']">Theme {index + 1}</div>
                    <HighlightableText
                      text={theme}
                      section={`keyTheme${index}`}
                      reportId={report.id}
                      highlights={highlights[`keyTheme${index}`] || []}
                      onHighlight={handleCreateHighlight}
                      onHighlightClick={handleHighlightClick}
                      onHighlightUpdate={handleHighlightUpdate}
                      className="text-gray-700 text-base leading-relaxed font-['Inter']"
                      highlightingEnabled={highlightingEnabled}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insights */}
          {report.content.insights && report.content.insights.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 font-['Inter']">💡 Unique Insights</h2>
              <ul className="space-y-3">
                {report.content.insights.map((insight, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-yellow-100 text-yellow-700 rounded-full flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <p className="text-gray-700 font-['Inter']">{insight}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Patterns */}
          {report.content.patterns && (
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 font-['Inter'] leading-tight">🔗 Patterns & Connections</h2>
              <div className="prose prose-lg max-w-none">
                <HighlightableText
                  text={report.content.patterns}
                  section="patterns"
                  reportId={report.id}
                  highlights={highlights.patterns || []}
                  onHighlight={handleCreateHighlight}
                  onHighlightClick={handleHighlightClick}
                  onHighlightUpdate={handleHighlightUpdate}
                  className="text-gray-700 leading-relaxed font-['Inter'] text-base"
                  highlightingEnabled={highlightingEnabled}
                />
              </div>
            </div>
          )}

          {/* Recommendations */}
          {report.content.recommendations && report.content.recommendations.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 font-['Inter']">🎯 Actionable Recommendations</h2>
              <ol className="space-y-3">
                {report.content.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <p className="text-gray-700 font-['Inter']">{rec}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Further Research */}
          {report.content.furtherResearch && report.content.furtherResearch.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 font-['Inter']">🔍 Areas for Further Research</h2>
              <ul className="space-y-2">
                {report.content.furtherResearch.map((area, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <p className="text-gray-700 font-['Inter']">{area}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Full Content (Collapsible) */}
          <details className="bg-white rounded-lg shadow-sm p-6">
            <summary className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-gray-700 font-['Inter']">
              📄 Full AI Analysis
            </summary>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="prose prose-gray max-w-none">
                <HighlightableText
                  text={report.content.fullContent}
                  section="fullContent"
                  reportId={report.id}
                  highlights={highlights.fullContent || []}
                  onHighlight={handleCreateHighlight}
                  onHighlightClick={handleHighlightClick}
                  onHighlightUpdate={handleHighlightUpdate}
                  className="whitespace-pre-wrap text-gray-700 leading-relaxed font-['Inter'] text-sm"
                  highlightingEnabled={highlightingEnabled}
                />
              </div>
            </div>
          </details>
        </div>
      </div>
      
      {/* Comment Panel */}
      {showCommentPanel && (
        <CommentPanel
          reportId={report.id}
          selectedHighlight={selectedHighlight}
          allHighlights={allHighlights}
          onHighlightUpdate={handleHighlightUpdate}
          onHighlightSelect={handleHighlightClick}
          onHighlightDelete={handleHighlightDelete}
          onClose={() => {
            setShowCommentPanel(false)
            setSelectedHighlight(null)
          }}
        />
      )}
    </div>
  )
}