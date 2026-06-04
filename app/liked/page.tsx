'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'
import VideoFeed from '@/components/VideoFeed'

const STORAGE_KEY = 'ugc_liked_profiles'

function getLikedIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export default function LikedPage() {
  const [profiles, setProfiles] = useState<Profile[] | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const ids = getLikedIds()
    if (ids.length === 0) {
      setProfiles([])
      return
    }

    supabase
      .from('profiles')
      .select('*')
      .in('id', ids)
      .then(({ data }) => {
        setProfiles((data as unknown as Profile[]) ?? [])
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (profiles === null) {
    return (
      <div className="h-dvh flex items-center justify-center bg-black">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 animate-spin"
          style={{ borderTopColor: '#F496A5' }} />
      </div>
    )
  }

  if (profiles.length === 0) {
    return (
      <div className="relative h-dvh flex flex-col items-center justify-center bg-black gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(244,150,165,0.1)', border: '1px solid rgba(244,150,165,0.3)' }}>
          <svg className="w-8 h-8" style={{ color: '#F496A5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
        <div className="text-center px-8">
          <p className="text-white/50 text-sm mb-4">
            Et ole vielä tykännyt yhdestäkään profiilista.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-2.5 rounded-full font-semibold text-white text-sm"
            style={{ background: 'linear-gradient(135deg, #F496A5, #81BFD4)' }}
          >
            Selaa profiileja
          </Link>
        </div>
        <BottomNav active="liked" />
      </div>
    )
  }

  return (
    <div className="relative h-dvh bg-black">
      <div className="absolute top-0 left-0 right-0 z-20 flex justify-center pt-3 pointer-events-none">
        <span className="text-white font-bold text-base tracking-wide"
          style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
          Tykkätyt
        </span>
      </div>
      <VideoFeed initialProfiles={profiles} hideLogo={true} active="liked" />
    </div>
  )
}
