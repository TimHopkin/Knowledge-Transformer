import Link from 'next/link'

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
          Knowledge Transformer
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
          Transform YouTube content into structured, interactive learning experiences 
          with AI-powered analysis and synthesis.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            href="/dashboard"
            className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Process Content
          </Link>
          <Link
            href="/content"
            className="text-sm font-semibold leading-6 text-gray-900 dark:text-white hover:text-blue-600"
          >
            Browse Library <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
      
      <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            YouTube Processing
          </h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Extract transcripts, metadata, and insights from YouTube videos and channels
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            AI Analysis
          </h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Generate summaries, extract topics, and identify key insights using Claude AI
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Knowledge Building
          </h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Transform passive viewing into active learning with structured content
          </p>
        </div>
      </div>
    </main>
  )
}