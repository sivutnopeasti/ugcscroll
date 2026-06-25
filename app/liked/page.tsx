'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'
import VideoCard from '@/components/VideoCard'
import { getThumbnailUrl } from '@/lib/cloudflare'

const STORAGE_KEY = 'ugc_liked_profiles'

function getLikedIds(): string[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

// ── Pikkukuva ruudukossa ───────────────────────────────────────────────────
function Thumbnail({ profile, onClick }: { profile: Profile; onClick: () => void }) {
  const thumb =
    profile.cloudflare_video_id && !profile.cloudflare_video_id.startsWith('https://')
      ? getThumbnailUrl(profile.cloudflare_video_id)
      : null

  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden bg-gray-900 focus:outline-none"
      style={{ aspectRatio: '9/16' }}
    >
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt={profile.name ?? ''} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <svg className="w-8 h-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
      )}
      {/* Nimi-overlay */}
      <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)' }}>
        <p className="text-white text-xs font-medium truncate">{profile.name}</p>
      </div>
    </button>
  )
}

// ── Scrollattava soitinnäkymä ─────────────────────────────────────────────
function ScrollPlayer({
  profiles,
  startIndex,
  onBack,
}: {
  profiles: Profile[]
  startIndex: number
  onBack: () => void
}) {
  const [activeIndex, setActiveIndex] = useState(startIndex)
  const [globalMuted, setGlobalMuted] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const touchStartX = useRef<number | null>(null)

  // Scrollaa oikeaan kohtaan mountissa
  useEffect(() => {
    const container = containerRef.current
    if (!container || startIndex === 0) return
    const h = container.clientHeight
    container.scrollTop = startIndex * h
  }, [startIndex])

  // Intersection Observer
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = cardRefs.current.findIndex((r) => r === entry.target)
            if (idx !== -1) setActiveIndex(idx)
          }
        })
      },
      { root: container, threshold: 0.6 }
    )
    cardRefs.current.forEach((r) => r && observer.observe(r))
    return () => observer.disconnect()
  }, [profiles.length])

  // Swipe oikealle → takaisin ruudukkoon
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    if (deltaX > 80) onBack()
    touchStartX.current = null
  }, [onBack])

  return (
    <div
      className="h-dvh bg-black flex justify-center"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative h-dvh w-full" style={{ maxWidth: 'min(430px, 56.25dvh)' }}>

        {/* Takaisin-nuoli */}
        <button
          onClick={onBack}
          className="absolute top-0 left-0 z-30 flex items-center gap-1.5 px-4 py-3 focus:outline-none"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
          aria-label="Takaisin ruudukkoon"
        >
          <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </div>
        </button>

        {/* Otsikko */}
        <div className="absolute top-0 left-0 right-0 z-20 flex justify-center pointer-events-none"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}>
          <span className="text-white font-bold text-base" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
            Tykätyt
          </span>
        </div>

        {/* Videot */}
        <div ref={containerRef} className="feed-container">
          {profiles.map((profile, index) => (
            <div key={profile.id} ref={(el) => { cardRefs.current[index] = el }}>
              <VideoCard
                profile={profile}
                isActive={index === activeIndex}
                globalMuted={globalMuted}
                onMuteToggle={() => setGlobalMuted((m) => !m)}
              />
            </div>
          ))}
        </div>

        <BottomNav active="liked" />
      </div>
    </div>
  )
}

// ── Pääkomponentti ────────────────────────────────────────────────────────
export default function LikedPage() {
  const [profiles, setProfiles] = useState<Profile[] | null>(null)
  const [view, setView] = useState<'grid' | 'scroll'>('grid')
  const [startIndex, setStartIndex] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    const ids = getLikedIds()
    if (ids.length === 0) { setProfiles([]); return }
    supabase
      .from('profiles')
      .select('*')
      .in('id', ids)
      .then(({ data }) => setProfiles((data as unknown as Profile[]) ?? []))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const openScroll = useCallback((index: number) => {
    setStartIndex(index)
    setView('scroll')
  }, [])

  // Lataustilas
  if (profiles === null) {
    return (
      <div className="h-dvh bg-black flex justify-center">
        <div className="relative h-dvh w-full flex items-center justify-center"
          style={{ maxWidth: 'min(430px, 56.25dvh)' }}>
          <div className="w-8 h-8 rounded-full border-2 border-white/20 animate-spin"
            style={{ borderTopColor: '#F496A5' }} />
        </div>
      </div>
    )
  }

  // Tyhjä tila
  if (profiles.length === 0) {
    return (
      <div className="h-dvh bg-black flex justify-center">
        <div className="relative h-dvh w-full flex flex-col items-center justify-center gap-4"
          style={{ maxWidth: 'min(430px, 56.25dvh)' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(244,150,165,0.1)', border: '1px solid rgba(244,150,165,0.3)' }}>
            <svg className="w-8 h-8" style={{ color: '#F496A5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div className="text-center px-8">
            <p className="text-white/50 text-sm mb-4">Et ole vielä tykännyt yhdestäkään profiilista.</p>
            <Link href="/" className="inline-block px-6 py-2.5 rounded-full font-semibold text-white text-sm"
              style={{ background: 'linear-gradient(135deg, #F496A5, #81BFD4)' }}>
              Selaa profiileja
            </Link>
          </div>
          <BottomNav active="liked" />
        </div>
      </div>
    )
  }

  // Soittinnäkymä
  if (view === 'scroll') {
    return (
      <ScrollPlayer
        profiles={profiles}
        startIndex={startIndex}
        onBack={() => setView('grid')}
      />
    )
  }

  // Ruudukkonäkymä
  return (
    <div className="h-dvh bg-black flex justify-center">
      <div className="relative h-dvh w-full flex flex-col"
        style={{ maxWidth: 'min(430px, 56.25dvh)' }}>

        {/* Otsikko */}
        <div className="flex-shrink-0 flex items-center justify-center px-4"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', paddingBottom: 12 }}>
          <h1 className="text-white font-bold text-base">Tykätyt</h1>
        </div>

        {/* Ruudukko */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="grid grid-cols-3 gap-0.5">
            {profiles.map((profile, index) => (
              <Thumbnail
                key={profile.id}
                profile={profile}
                onClick={() => openScroll(index)}
              />
            ))}
          </div>
        </div>

        <BottomNav active="liked" />
      </div>
    </div>
  )
}
