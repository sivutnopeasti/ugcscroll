'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'

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
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const ids = getLikedIds()
    if (ids.length === 0) {
      setLoading(false)
      return
    }

    supabase
      .from('profiles')
      .select('*')
      .in('id', ids)
      .then(({ data }) => {
        setProfiles((data as Profile[]) ?? [])
        setLoading(false)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative h-dvh overflow-hidden" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-safe pt-12 pb-4">
        <h1 className="text-white font-bold text-xl">Tykkätyt profiilit</h1>
        <Link href="/" className="text-sm font-medium" style={{ color: '#F47B8A' }}>
          Selaa lisää
        </Link>
      </div>

      {/* Content */}
      <div className="overflow-y-auto" style={{ height: 'calc(100dvh - 140px)' }}>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 rounded-full border-2 border-white/20 animate-spin"
              style={{ borderTopColor: '#F47B8A' }} />
          </div>
        ) : profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 px-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(244,123,138,0.1)', border: '1px solid rgba(244,123,138,0.3)' }}>
              <svg className="w-8 h-8" style={{ color: '#F47B8A' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <p className="text-white/50 text-center text-sm">
              Et ole vielä tykännyt yhdestäkään profiilista.
              Selaa feediä ja tykkää sisällöntuottajista!
            </p>
            <Link
              href="/"
              className="px-6 py-2.5 rounded-full font-semibold text-white text-sm"
              style={{ background: 'linear-gradient(135deg, #F47B8A, #C084FC)' }}
            >
              Selaa profiileja
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-0.5 px-0.5">
            {profiles.map((profile) => (
              <LikedCard key={profile.id} profile={profile} />
            ))}
          </div>
        )}
      </div>

      <BottomNav active="liked" />
    </div>
  )
}

function LikedCard({ profile }: { profile: Profile }) {
  const thumbnailUrl = profile.video_thumbnail_url

  return (
    <div className="relative aspect-[9/16] overflow-hidden bg-black">
      {thumbnailUrl && (
        <img
          src={thumbnailUrl}
          alt={profile.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)' }}
      />
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="text-white font-semibold text-sm truncate">{profile.name}</p>
        {profile.city && (
          <p className="text-white/60 text-xs truncate">{profile.city}</p>
        )}
      </div>
      {/* Pink heart badge */}
      <div className="absolute top-2 right-2">
        <svg className="w-5 h-5" style={{ color: '#F47B8A' }} fill="currentColor" viewBox="0 0 24 24">
          <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </div>
    </div>
  )
}
