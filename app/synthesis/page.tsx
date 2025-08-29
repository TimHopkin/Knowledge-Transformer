'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface SynthesisReportSummary {
  id: string
  title: string
  description: string
  content: {
    sourceCount: number
    totalDuration: number
    generatedAt: string
  }
  createdAt: string
}

export default function SynthesisListPage() {
  const [reports, setReports] = useState<SynthesisReportSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/synthesis')
      
      if (!response.ok) {
        throw new Error('Failed to fetch synthesis reports')
      }

      const result = await response.json()
      setReports(result.reports || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading synthesis reports...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-blue-600">
              🏠 Home
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Synthesis Reports</span>
          </nav>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🔬 Synthesis Reports</h1>
              <p className="mt-2 text-gray-600">
                Comprehensive analysis reports combining insights from multiple videos
              </p>
            </div>
            
            <Link
              href="/content"
              className="px-4 py-2 bg-purple-600 text-white font-medium rounded-md hover:bg-purple-700 transition-colors"
            >
              Create New Report
            </Link>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="text-red-400">❌</div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error Loading Reports</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Reports Grid */}
        {reports.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔬</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Synthesis Reports Yet</h2>
            <p className="text-gray-600 mb-6">
              Create comprehensive analysis reports by selecting multiple videos from your content library.
            </p>
            <Link
              href="/content"
              className="inline-block px-6 py-3 bg-purple-600 text-white font-medium rounded-md hover:bg-purple-700 transition-colors"
            >
              Browse Content Library
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reports.map((report) => (
              <Link key={report.id} href={`/synthesis/${report.id}`}>
                <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-2xl">🔬</div>
                    <div className="text-xs text-gray-500">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                    {report.title}
                  </h3>

                  {report.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {report.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-4">
                      <span>📹 {report.content.sourceCount} videos</span>
                      <span>⏱️ {formatDuration(report.content.totalDuration)}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="text-sm text-purple-600 font-medium">
                      View Report →
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}