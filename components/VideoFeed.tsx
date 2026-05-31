'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { Profile } from '@/lib/types'
import VideoCard from './VideoCard'
import BottomNav from './BottomNav'
import { createClient } from '@/lib/supabase/client'

const PAGE_SIZE = 8

interface VideoFeedProps {
  initialProfiles: Profile[]
  hideLogo?: boolean
  active?: 'feed' | 'liked' | 'creator'
}

export default function VideoFeed({ initialProfiles, hideLogo, active = 'feed' }: VideoFeedProps) {
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles)
  const [activeIndex, setActiveIndex] = useState(0)
  const [globalMuted, setGlobalMuted] = useState(true)
  const [hasMore, setHasMore] = useState(initialProfiles.length === PAGE_SIZE)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const supabase = createClient()

  // Intersection Observer to track active video
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = cardRefs.current.findIndex((ref) => ref === entry.target)
            if (index !== -1) setActiveIndex(index)
          }
        })
      },
      { root: container, threshold: 0.6 }
    )

    cardRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref)
    })

    return () => observer.disconnect()
  }, [profiles.length])

  // Load more when near end
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)

    const lastProfile = profiles[profiles.length - 1]
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_premium', true)
      .not('cloudflare_video_id', 'is', null)
      .order('created_at', { ascending: false })
      .lt('created_at', lastProfile.created_at)
      .limit(PAGE_SIZE)

    if (!error && data) {
      setProfiles((prev) => [...prev, ...(data as unknown as Profile[])])
      setHasMore(data.length === PAGE_SIZE)
    }
    setLoading(false)
  }, [loading, hasMore, profiles, supabase])

  // Trigger load more when approaching last card
  useEffect(() => {
    if (activeIndex >= profiles.length - 3) {
      loadMore()
    }
  }, [activeIndex, profiles.length, loadMore])

  if (profiles.length === 0) {
    return (
      <div className="relative h-dvh flex flex-col items-center justify-center bg-black text-white gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(244,123,138,0.2)', border: '1px solid rgba(244,123,138,0.4)' }}>
          <svg className="w-8 h-8" style={{ color: '#F47B8A' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="text-center px-8">
          <p className="text-white/60 mb-4">Ei vielä sisällöntuottajia. Ole ensimmäinen!</p>
          <a
            href="/creator/login"
            className="inline-block px-6 py-3 rounded-full font-bold text-white text-sm"
            style={{ background: 'linear-gradient(135deg, #F47B8A 0%, #E25C6E 100%)' }}
          >
            Luo ilmainen profiili
          </a>
        </div>
        <BottomNav active={active} />
      </div>
    )
  }

  return (
    <div className="relative h-dvh bg-black">
      {/* Top logo bar */}
      {!hideLogo && (
        <div className="absolute top-0 left-0 right-0 z-20 flex justify-center pt-safe pt-3 pointer-events-none">
          <span className="text-white font-bold text-base tracking-wide"
            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
            UGC Suomi
          </span>
        </div>
      )}

      {/* Feed */}
      <div ref={containerRef} className="feed-container">
        {profiles.map((profile, index) => (
          <div
            key={profile.id}
            ref={(el) => { cardRefs.current[index] = el }}
          >
            <VideoCard
              profile={profile}
              isActive={index === activeIndex}
              globalMuted={globalMuted}
              onMuteToggle={() => setGlobalMuted((m) => !m)}
            />
          </div>
        ))}

        {/* Loading spinner at bottom */}
        {loading && (
          <div className="video-snap-card flex items-center justify-center bg-black">
            <div className="w-8 h-8 rounded-full border-2 border-white/20 animate-spin"
              style={{ borderTopColor: '#F47B8A' }} />
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <BottomNav active={active} />
    </div>
  )
}
