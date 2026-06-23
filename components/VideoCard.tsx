'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import type { Profile } from '@/lib/types'
import LikeButton from './LikeButton'
import ContactModal from './ContactModal'
import VideoPlayer from './VideoPlayer'
import Link from 'next/link'
import { getHlsUrl } from '@/lib/cloudflare'

interface VideoCardProps {
  profile: Profile
  isActive: boolean
  globalMuted: boolean
  onMuteToggle: () => void
}

function resolveVideoUrl(videoId: string): string {
  if (videoId.startsWith('https://')) return videoId
  return getHlsUrl(videoId)
}

export default function VideoCard({ profile, isActive, globalMuted, onMuteToggle }: VideoCardProps) {
  const [contactOpen, setContactOpen] = useState(false)
  const [bioExpanded, setBioExpanded] = useState(false)
  const [paused, setPaused] = useState(false)
  const [tapIcon, setTapIcon] = useState<'play' | 'pause' | null>(null)
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const videoUrl = resolveVideoUrl(profile.cloudflare_video_id!)

  // Kun video ei ole enää aktiivinen, nollaa paussitila
  useEffect(() => {
    if (!isActive) { setBioExpanded(false); setPaused(false) }
  }, [isActive])

  // Napauta ruutua → pause/play kuten TikTokissa
  const handleTap = useCallback(() => {
    const next = !paused
    setPaused(next)
    setTapIcon(next ? 'pause' : 'play')
    if (tapTimer.current) clearTimeout(tapTimer.current)
    tapTimer.current = setTimeout(() => setTapIcon(null), 700)
  }, [paused])

  // Erottele napautus ja scrollaus: vain lyhyt liike (<12 px) = napautus
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return
    const dx = Math.abs(e.changedTouches[0].clientX - touchStart.current.x)
    const dy = Math.abs(e.changedTouches[0].clientY - touchStart.current.y)
    touchStart.current = null
    if (dx < 12 && dy < 12) {
      e.preventDefault() // estää selaimen synteettisen click-tapahtuman
      handleTap()
    }
  }, [handleTap])

  return (
    <div className="video-snap-card">
      <VideoPlayer videoUrl={videoUrl} shouldPlay={isActive && !paused} muted={globalMuted} isActive={isActive} />

      {/* Gradient overlay */}
      <div className="video-overlay" style={{ zIndex: 2 }} />

      {/* Napauta → pause/play (touch: tarkista ettei ole scroll) */}
      <button
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={handleTap}   // desktop-tuki
        className="absolute inset-0 w-full"
        style={{ zIndex: 3, background: 'transparent', bottom: '35%' }}
        aria-label={paused ? 'Jatka toistoa' : 'Paussaa'}
      />

      {/* TikTok-tyylinen isoikoni flash */}
      {tapIcon && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 8 }}
        >
          <div
            className="w-20 h-20 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
            style={{ animation: 'tap-flash 0.7s ease-out forwards' }}
          >
            {tapIcon === 'pause' ? (
              <svg className="w-9 h-9 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-9 h-9 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Right-side action buttons */}
      <div
        className="absolute right-3 flex flex-col items-center gap-5"
        style={{ bottom: '5rem', zIndex: 10 }}
      >
        <LikeButton profileId={profile.id} initialCount={profile.likes_count} />

        <button
          onClick={() => setContactOpen(true)}
          className="flex flex-col items-center gap-1"
          aria-label="Ota yhteyttä"
        >
          <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <span className="text-white text-xs font-medium" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
            Kontakti
          </span>
        </button>

        <button
          onClick={onMuteToggle}
          className="flex flex-col items-center gap-1"
          style={{ zIndex: 11 }}
        >
          <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
            {globalMuted ? (
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            )}
          </div>
          <span className="text-white text-xs font-medium" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
            {globalMuted ? 'Ääni pois' : 'Ääni'}
          </span>
        </button>
      </div>

      {/* Bottom profile info */}
      <div
        className="absolute bottom-0 left-0 right-14 px-4"
        style={{
          zIndex: 10,
          // Jätä tilaa: alanavigaatio (64px) + progress bar (~46px) + safe area
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 114px)',
        }}
      >
        {/* Laajennettu bio — scrollattava paneeli bio-tekstille */}
        {bioExpanded && profile.bio && (
          <div
            className="mb-3 rounded-2xl overflow-hidden"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
            onClick={(e) => e.stopPropagation()}
          >
          <div
            className="overflow-y-auto px-4 py-3 text-white/95 text-sm leading-relaxed"
            style={{
              maxHeight: '38dvh',
              textShadow: '0 1px 2px rgba(0,0,0,0.4)',
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y',
              overscrollBehavior: 'contain',
            }}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
              {profile.bio.split('\n').map((line, i, arr) => (
                <span key={i}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </span>
              ))}
            </div>
            <button
              onClick={() => setBioExpanded(false)}
              className="w-full py-2 text-white/60 text-xs border-t flex items-center justify-center gap-1"
              style={{ borderColor: 'rgba(255,255,255,0.12)' }}
            >
              ▲ Sulje
            </button>
          </div>
        )}

        {/* Staattinen info: badge + nimi + kaupunki + lyhyt bio */}
        <div>
          {/* Premium badge */}
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full mb-2"
            style={{ background: 'rgba(244,123,138,0.9)', backdropFilter: 'blur(4px)' }}>
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-white text-xs font-semibold">Premium UGC</span>
          </div>

          {/* Nimi */}
          <Link href={`/profile/${profile.id}`} className="block">
            <h2 className="text-white font-bold text-xl leading-tight hover:underline"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
              {profile.name}
              {profile.age && (
                <span className="font-normal text-white/80 text-lg ml-1">{profile.age}</span>
              )}
            </h2>
          </Link>

          {/* Kaupunki */}
          {profile.city && (
            <div className="flex items-center gap-1 mt-0.5">
              <svg className="w-3.5 h-3.5 text-white/70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-white/80 text-sm" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
                {profile.city}
              </span>
            </div>
          )}

          {/* Bio-esikatselu (2 riviä) + "Lue lisää" -nappi */}
          {profile.bio && !bioExpanded && (
            <button
              className="text-left w-full mt-1.5"
              onClick={() => setBioExpanded(true)}
              aria-label="Avaa kuvaus"
            >
              <p className="text-white/90 text-sm"
                style={{
                  textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 2,
                  overflow: 'hidden',
                } as React.CSSProperties}>
                {profile.bio}
              </p>
              {profile.bio.length > 60 && (
                <span className="text-white/50 text-xs mt-0.5 block">▼ Lue lisää</span>
              )}
            </button>
          )}
        </div>
      </div>

      {contactOpen && (
        <ContactModal profile={profile} onClose={() => setContactOpen(false)} />
      )}
    </div>
  )
}
