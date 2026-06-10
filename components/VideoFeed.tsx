'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { Profile } from '@/lib/types'
import VideoCard from './VideoCard'
import BottomNav from './BottomNav'
import { createClient } from '@/lib/supabase/client'

const PAGE_SIZE = 8
const PULL_THRESHOLD = 72 // px vetoa ennen päivitystä

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

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
  const [refreshing, setRefreshing] = useState(false)
  const [pulling, setPulling] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const touchStartY = useRef<number | null>(null)
  const supabase = createClient()

  // ── Hae tuore feedi ja scrollaa alkuun ────────────────────────────────────
  const refreshFeed = useCallback(async () => {
    if (refreshing) return
    setRefreshing(true)
    setPulling(false)
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_premium', true)
        .not('cloudflare_video_id', 'is', null)
        .limit(200)
      if (data) {
        const fresh = shuffle(data as Profile[])
        setProfiles(fresh.slice(0, PAGE_SIZE))
        setHasMore(fresh.length > PAGE_SIZE)
        setActiveIndex(0)
        containerRef.current?.scrollTo({ top: 0, behavior: 'instant' })
      }
    } finally {
      setTimeout(() => setRefreshing(false), 600)
    }
  }, [refreshing, supabase])

  // ── Pull-to-refresh touch handlers ───────────────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (activeIndex === 0 && !refreshing) {
      touchStartY.current = e.touches[0].clientY
    }
  }, [activeIndex, refreshing])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current === null) return
    const delta = e.touches[0].clientY - touchStartY.current
    if (delta > 24) setPulling(true)
    if (delta <= 0) { touchStartY.current = null; setPulling(false) }
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (pulling) refreshFeed()
    else setPulling(false)
    touchStartY.current = null
  }, [pulling, refreshFeed])

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

  // Load more when near end — fetch profiles not already shown, shuffle client-side
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)

    const shownIds = profiles.map((p) => p.id)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_premium', true)
      .not('cloudflare_video_id', 'is', null)
      .not('id', 'in', `(${shownIds.join(',')})`)
      .limit(PAGE_SIZE)

    if (!error && data) {
      // Shuffle the new batch before appending
      const batch = [...data] as Profile[]
      for (let i = batch.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[batch[i], batch[j]] = [batch[j], batch[i]]
      }
      setProfiles((prev) => [...prev, ...batch])
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
          style={{ background: 'rgba(244,150,165,0.2)', border: '1px solid rgba(244,150,165,0.4)' }}>
          <svg className="w-8 h-8" style={{ color: '#F496A5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="text-center px-8">
          <p className="text-white/60 mb-4">Ei vielä sisällöntuottajia. Ole ensimmäinen!</p>
          <a
            href="/creator/login"
            className="inline-block px-6 py-3 rounded-full font-bold text-white text-sm"
            style={{ background: 'linear-gradient(135deg, #F496A5 0%, #D25A6C 100%)' }}
          >
            Luo ilmainen profiili
          </a>
        </div>
        <BottomNav active={active} />
      </div>
    )
  }

  return (
    // Ulkokuori: täysleveä musta tausta pöytäkoneella
    <div className="h-dvh bg-black flex justify-center"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Sisäkolumni: mobiililla täysleveä, pöytäkoneella max 9:16-leveys */}
      <div
        className="relative h-dvh w-full"
        style={{ maxWidth: 'min(430px, 56.25dvh)' }}
      >
      {/* Pull-to-refresh / refresh indicator */}
      {(pulling || refreshing) && (
        <div
          className="absolute left-0 right-0 z-30 flex justify-center pointer-events-none"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 4px)' }}
        >
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md">
            <svg
              className={`w-4 h-4 text-white ${refreshing ? 'animate-spin' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-white text-xs font-medium">
              {refreshing ? 'Päivitetään...' : 'Päivitä feedi'}
            </span>
          </div>
        </div>
      )}

      {/* Top logo — klikattava, päivittää feedin */}
      {!hideLogo && (
        <div className="absolute top-0 left-0 right-0 z-20 flex justify-center pt-safe pt-3">
          <button onClick={refreshFeed} aria-label="Päivitä feedi" className="focus:outline-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="UGC Suomi"
              style={{ height: 36, filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.8))' }}
            />
          </button>
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
              style={{ borderTopColor: '#F496A5' }} />
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <BottomNav active={active} />
      </div> {/* /sisäkolumni */}
    </div>
  )
}
