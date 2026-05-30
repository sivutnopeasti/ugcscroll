'use client'

import Link from 'next/link'

interface BottomNavProps {
  active: 'feed' | 'liked' | 'creator'
}

export default function BottomNav({ active }: BottomNavProps) {
  return (
    <nav
      className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-around pb-safe pb-2 pt-2"
      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)' }}
    >
      <Link
        href="/"
        className={`flex flex-col items-center gap-0.5 px-4 py-1 transition-opacity ${
          active === 'feed' ? 'opacity-100' : 'opacity-50 hover:opacity-80'
        }`}
      >
        <svg className="w-6 h-6 text-white" fill={active === 'feed' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active === 'feed' ? 0 : 2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span className="text-white text-xs font-medium">Selaa</span>
      </Link>

      <Link
        href="/liked"
        className={`flex flex-col items-center gap-0.5 px-4 py-1 transition-opacity ${
          active === 'liked' ? 'opacity-100' : 'opacity-50 hover:opacity-80'
        }`}
      >
        <svg className="w-6 h-6" fill={active === 'liked' ? '#F47B8A' : 'none'} stroke={active === 'liked' ? '#F47B8A' : 'white'} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active === 'liked' ? 0 : 2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        <span className="text-xs font-medium" style={{ color: active === 'liked' ? '#F47B8A' : 'white' }}>
          Tykkätyt
        </span>
      </Link>

      <Link
        href="/creator/login"
        className={`flex flex-col items-center gap-0.5 px-4 py-1 transition-opacity ${
          active === 'creator' ? 'opacity-100' : 'opacity-50 hover:opacity-80'
        }`}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background: active === 'creator'
              ? 'linear-gradient(135deg, #F47B8A, #C084FC)'
              : 'transparent',
            border: active === 'creator' ? 'none' : '1.5px solid rgba(255,255,255,0.5)',
          }}
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <span className="text-white text-xs font-medium">Profiili</span>
      </Link>
    </nav>
  )
}
