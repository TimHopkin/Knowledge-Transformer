'use client'

import { useState } from 'react'
import Link from 'next/link'
import { validateYouTubeURL } from '@/lib/utils'

interface ProcessingJob {
  id: string
  url: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  currentStep?: 'pending' | 'fetching_metadata' | 'extracting_transcript' | 'ai_processing' | 'saving_data' | 'completed' | 'failed'
  type: 'video' | 'channel' | 'playlist'
  title?: string
  progress?: number
  error?: string
  errorDetails?: {
    message: string
    userFriendlyMessage?: string
    suggestedAction?: string
    canRetry?: boolean
  }
  result?: any
}

export default function Dashboard() {
  const [urls, setUrls] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [jobs, setJobs] = useState<ProcessingJob[]>([])
  const [options, setOptions] = useState({
    maxVideos: 10,
    extractTopics: true,
    summaryLength: 'medium' as 'short' | 'medium' | 'long',
    summaryFocus: 'key_points' as 'overview' | 'key_points' | 'actionable'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!urls.trim()) return
    
    const urlList = urls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0)
    
    if (urlList.length === 0) return

    // Validate URLs and create initial jobs
    const newJobs: ProcessingJob[] = []
    const validUrls: string[] = []

    for (const url of urlList) {
      const validation = validateYouTubeURL(url)
      const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      if (validation.isValid) {
        newJobs.push({
          id: jobId,
          url,
          status: 'pending',
          type: validation.type!
        })
        validUrls.push(url)
      } else {
        newJobs.push({
          id: jobId,
          url,
          status: 'failed',
          type: 'video', // default
          error: validation.error
        })
      }
    }

    setJobs(prev => [...prev, ...newJobs])
    
    if (validUrls.length === 0) return

    setIsProcessing(true)
    
    try {
      // Update jobs to processing status
      setJobs(prev => prev.map(job => 
        validUrls.includes(job.url) && job.status === 'pending'
          ? { ...job, status: 'processing' }
          : job
      ))

      const response = await fetch('/api/youtube/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urls: validUrls,
          options: {
            maxVideos: options.maxVideos,
            extractTopics: options.extractTopics,
            summaryLength: options.summaryLength,
            summaryFocus: options.summaryFocus
          }
        }),
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Processing failed')
      }

      // Update jobs with results
      setJobs(prev => prev.map(job => {
        if (!validUrls.includes(job.url)) return job

        const processedResult = result.processed.find((p: any) => 
          job.url.includes(p.id)
        )
        const errorResult = result.errors.find((e: any) => e.url === job.url)

        if (processedResult) {
          return {
            ...job,
            status: 'completed',
            title: processedResult.title,
            result: processedResult
          }
        } else if (errorResult) {
          return {
            ...job,
            status: 'failed',
            error: errorResult.error
          }
        }

        return job
      }))

      // Clear the input
      setUrls('')
      
    } catch (error) {
      console.error('Processing error:', error)
      
      // Update all processing jobs to failed
      setJobs(prev => prev.map(job => 
        validUrls.includes(job.url) && job.status === 'processing'
          ? { 
              ...job, 
              status: 'failed', 
              error: error instanceof Error ? error.message : 'Unknown error' 
            }
          : job
      ))
    } finally {
      setIsProcessing(false)
    }
  }

  const clearJobs = () => {
    setJobs([])
  }

  const retryJob = async (jobId: string, contentItemId: string) => {
    try {
      // Update UI to show retry in progress
      setJobs(prev => prev.map(job => 
        job.id === jobId 
          ? { ...job, status: 'processing', currentStep: 'pending', error: undefined, errorDetails: undefined }
          : job
      ))

      const response = await fetch('/api/youtube/retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contentItemId }),
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Retry failed')
      }

      // The retry endpoint will trigger reprocessing
      // For now, just update status - in production you'd poll for updates
      setJobs(prev => prev.map(job => 
        job.id === jobId 
          ? { ...job, status: 'processing', currentStep: 'pending' }
          : job
      ))

    } catch (error) {
      console.error('Retry error:', error)
      
      // Revert job status and show retry error
      setJobs(prev => prev.map(job => 
        job.id === jobId 
          ? { 
              ...job, 
              status: 'failed',
              error: error instanceof Error ? error.message : 'Retry failed',
              errorDetails: {
                message: error instanceof Error ? error.message : 'Retry failed',
                userFriendlyMessage: 'Retry failed. Please try again later.',
                canRetry: true
              }
            }
          : job
      ))
    }
  }

  const getStatusIcon = (status: ProcessingJob['status'], step?: ProcessingJob['currentStep']) => {
    switch (status) {
      case 'pending':
        return '⏳'
      case 'processing':
        switch (step) {
          case 'fetching_metadata':
            return '📋'
          case 'extracting_transcript':
            return '🎤'
          case 'ai_processing':
            return '🧠'
          case 'saving_data':
            return '💾'
          default:
            return '🔄'
        }
      case 'completed':
        return '✅'
      case 'failed':
        return '❌'
      default:
        return '❓'
    }
  }

  const getStepDescription = (step?: ProcessingJob['currentStep']) => {
    switch (step) {
      case 'pending':
        return 'Queued for processing'
      case 'fetching_metadata':
        return 'Getting video information'
      case 'extracting_transcript':
        return 'Extracting captions'
      case 'ai_processing':
        return 'AI analysis in progress'
      case 'saving_data':
        return 'Saving results'
      case 'completed':
        return 'Processing complete'
      case 'failed':
        return 'Processing failed'
      default:
        return ''
    }
  }

  const getTypeIcon = (type: ProcessingJob['type']) => {
    switch (type) {
      case 'video':
        return '🎥'
      case 'channel':
        return '📺'
      case 'playlist':
        return '📋'
      default:
        return '📄'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">
              Knowledge Transformer Dashboard
            </h1>
            <Link
              href="/content"
              className="px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 transition-colors"
            >
              📚 View Library
            </Link>
          </div>
          <p className="text-gray-600">
            Transform YouTube content into structured learning experiences with AI-powered analysis
          </p>
        </div>

        {/* URL Input Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="urls" className="block text-sm font-medium text-gray-700 mb-2">
                YouTube URLs (one per line)
              </label>
              <textarea
                id="urls"
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                placeholder="Paste YouTube video URLs, channel URLs, or playlist URLs here...&#10;&#10;Examples:&#10;https://www.youtube.com/watch?v=VIDEO_ID&#10;https://www.youtube.com/channel/CHANNEL_ID&#10;https://www.youtube.com/@channel_handle"
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isProcessing}
              />
              <p className="mt-1 text-sm text-gray-500">
                Supports videos, channels, and playlists. Maximum 50 URLs per batch.
              </p>
            </div>

            {/* Processing Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Videos per Channel
                </label>
                <select
                  value={options.maxVideos}
                  onChange={(e) => setOptions(prev => ({ ...prev, maxVideos: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isProcessing}
                >
                  <option value={5}>5 videos</option>
                  <option value={10}>10 videos</option>
                  <option value={20}>20 videos</option>
                  <option value={50}>50 videos</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Summary Length
                </label>
                <select
                  value={options.summaryLength}
                  onChange={(e) => setOptions(prev => ({ ...prev, summaryLength: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isProcessing}
                >
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Summary Focus
                </label>
                <select
                  value={options.summaryFocus}
                  onChange={(e) => setOptions(prev => ({ ...prev, summaryFocus: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isProcessing}
                >
                  <option value="overview">Overview</option>
                  <option value="key_points">Key Points</option>
                  <option value="actionable">Actionable Insights</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="extractTopics"
                  checked={options.extractTopics}
                  onChange={(e) => setOptions(prev => ({ ...prev, extractTopics: e.target.checked }))}
                  className="mr-2"
                  disabled={isProcessing}
                />
                <label htmlFor="extractTopics" className="text-sm font-medium text-gray-700">
                  Extract Topics
                </label>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isProcessing || !urls.trim()}
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {isProcessing ? 'Processing...' : 'Process Content'}
              </button>
              
              {jobs.length > 0 && (
                <button
                  type="button"
                  onClick={clearJobs}
                  disabled={isProcessing}
                  className="px-6 py-2 bg-gray-500 text-white font-medium rounded-md hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Clear Results
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Processing Results */}
        {jobs.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Processing Results ({jobs.length})
              </h2>
              <div className="text-sm text-gray-500">
                ✅ {jobs.filter(j => j.status === 'completed').length} completed • 
                🔄 {jobs.filter(j => j.status === 'processing').length} processing • 
                ❌ {jobs.filter(j => j.status === 'failed').length} failed
              </div>
            </div>
            
            <div className="space-y-3">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className={`p-4 rounded-lg border-l-4 ${
                    job.status === 'completed'
                      ? 'bg-green-50 border-green-400'
                      : job.status === 'failed'
                      ? 'bg-red-50 border-red-400'
                      : job.status === 'processing'
                      ? 'bg-blue-50 border-blue-400'
                      : 'bg-gray-50 border-gray-400'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">
                          {getStatusIcon(job.status, job.currentStep)} {getTypeIcon(job.type)}
                        </span>
                        <span className="font-medium text-gray-900">
                          {job.title || `${job.type.charAt(0).toUpperCase() + job.type.slice(1)}`}
                        </span>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                          {job.type}
                        </span>
                        {job.status === 'processing' && job.currentStep && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            {getStepDescription(job.currentStep)}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 break-all">
                        {job.url}
                      </div>
                      {job.error && (
                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="text-sm font-medium text-red-800">
                            {job.errorDetails?.userFriendlyMessage || job.error}
                          </div>
                          {job.errorDetails?.suggestedAction && (
                            <div className="mt-1 text-xs text-red-600">
                              💡 {job.errorDetails.suggestedAction}
                            </div>
                          )}
                          {job.errorDetails?.canRetry && job.result?.contentItemId && (
                            <button 
                              className="mt-2 px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                              onClick={() => retryJob(job.id, job.result.contentItemId)}
                            >
                              🔄 Retry
                            </button>
                          )}
                        </div>
                      )}
                      {job.result && (
                        <div className="mt-2 text-sm text-gray-600">
                          {job.result.summary && (
                            <div>Summary: {job.result.summary}</div>
                          )}
                          {job.result.topicsCount > 0 && (
                            <div>Topics extracted: {job.result.topicsCount}</div>
                          )}
                          {job.result.estimatedCost && (
                            <div>Estimated cost: ${job.result.estimatedCost.toFixed(4)}</div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        job.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : job.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : job.status === 'processing'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Stats */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {jobs.filter(j => j.status === 'completed').length}
                  </div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {jobs.filter(j => j.status === 'processing').length}
                  </div>
                  <div className="text-sm text-gray-600">Processing</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {jobs.filter(j => j.status === 'failed').length}
                  </div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    ${jobs
                      .filter(j => j.result?.estimatedCost)
                      .reduce((sum, j) => sum + (j.result?.estimatedCost || 0), 0)
                      .toFixed(4)}
                  </div>
                  <div className="text-sm text-gray-600">Total Cost</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Getting Started Guide */}
        {jobs.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Getting Started
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">What you can process:</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>🎥 Individual YouTube videos</li>
                  <li>📺 Entire YouTube channels</li>
                  <li>📋 YouTube playlists</li>
                  <li>🔗 Multiple URLs at once (bulk processing)</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">What we'll generate:</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>📝 AI-powered summaries and key points</li>
                  <li>🏷️ Automatically extracted topics and themes</li>
                  <li>💬 Enhanced, structured transcripts</li>
                  <li>📊 Cross-content analysis and insights</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">💡 Pro Tip</h4>
              <p className="text-sm text-blue-800">
                Start with a single video or a small channel (5-10 videos) to see how the system works, 
                then scale up to larger channels or multiple sources.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}