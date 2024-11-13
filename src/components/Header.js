import React from 'react'
import { Link } from 'react-router-dom'
import { Newspaper } from 'lucide-react'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-gray-200">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex justify-center">
        <div className="w-full max-w-4xl flex h-16 items-center justify-center">
          <Link to="/" className="flex items-center space-x-2 hover:opacity-75 transition-opacity">
            <Newspaper className="h-5 w-5 sm:h-6 sm:w-6 text-gray-700" />
            <span className="text-lg sm:text-xl font-bold text-gray-900">BriefSnap</span>
          </Link>
        </div>
      </nav>
    </header>
  )
}