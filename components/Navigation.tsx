'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navigation() {
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              🧠 Knowledge Transformer
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/dashboard"
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive('/dashboard')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 dark:text-gray-300 hover:text-blue-600'
              }`}
            >
              ➕ Process Content
            </Link>
            
            <Link
              href="/content"
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive('/content')
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-700 dark:text-gray-300 hover:text-green-600'
              }`}
            >
              📚 Content Library
            </Link>
            
            <Link
              href="/synthesis"
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive('/synthesis')
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-700 dark:text-gray-300 hover:text-purple-600'
              }`}
            >
              🔬 Synthesis Reports
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Link
              href="/dashboard"
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600"
            >
              ➕
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}