'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Hls from 'hls.js'

interface VideoPlayerProps {
  videoUrl: string
  shouldPlay: boolean
  muted: boolean
  isActive: boolean
}

export default function VideoPlayer({ videoUrl, shouldPlay, muted, isActive }: VideoPlayerProps) {
  const videoRef    = useRef<HTMLVideoElement>(null)
  const hlsRef      = useRef<Hls | null>(null)
  const isHlsJsRef  = useRef(false)           // onko HLS.js käytössä (ei native)
  const isActiveRef = useRef(isActive)         // aina ajan tasalla, ei closure-ongelma
  isActiveRef.current = isActive

  const [progress, setProgress]       = useState(0)
  const [duration, setDuration]       = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const seekBarRef   = useRef<HTMLDivElement>(null)
  const isSeeking    = useRef(false)
  const shouldPlayRef = useRef(shouldPlay)
  shouldPlayRef.current = shouldPlay

  // ── HLS / direct-source setup ──────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current
    if (!video || !videoUrl) return

    isHlsJsRef.current = false
    const isHls = videoUrl.includes('.m3u8') || videoUrl.includes('videodelivery.net')

    if (isHls) {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS (Safari/iOS) — ladataan vain metadata kunnes video on aktiivinen
        video.preload = isActiveRef.current ? 'auto' : 'metadata'
        video.src = videoUrl
      } else if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker:          true,
          lowLatencyMode:        false,
          autoStartLoad:         false,       // ← ei ladata segmenttejä ennen startLoad()
          abrEwmaDefaultEstimate: 4_000_000,
          abrMaxWithRealBitrate: true,
          maxBufferLength:       30,          // ← ennen 60 — liian aggressiivinen
          maxMaxBufferLength:    60,
          backBufferLength:      10,
        })
        hls.loadSource(videoUrl)             // hakee manifestin (pieni)
        hls.attachMedia(video)
        hlsRef.current    = hls
        isHlsJsRef.current = true
        // Aloita segmenttilataus heti jos video on jo aktiivinen
        if (isActiveRef.current) hls.startLoad(-1)
      }
    } else {
      video.src = videoUrl
    }

    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null }
    }
  }, [videoUrl])

  // ── Hallitse lataus ja nollaus isActive-muutoksella ────────────────────────
  useEffect(() => {
    const video = videoRef.current
    if (isActive) {
      // Käynnistä segmenttilataus
      if (isHlsJsRef.current && hlsRef.current) {
        hlsRef.current.startLoad(-1)
      } else if (video && !isHlsJsRef.current) {
        // Native HLS: vaihda preload auto-tilaan
        video.preload = 'auto'
      }
    } else {
      // Pysäytä segmenttilataus — vapautetaan kaistaa aktiiviselle videolle
      if (isHlsJsRef.current && hlsRef.current) {
        hlsRef.current.stopLoad()
      }
      // Nollaa toisto ja ajastin
      if (video) {
        video.pause()
        video.currentTime = 0
        setProgress(0)
        setCurrentTime(0)
      }
    }
  }, [isActive])

  // ── Play / pause ───────────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (shouldPlay) {
      // Varmista että lataus on käynnissä
      if (isHlsJsRef.current && hlsRef.current) {
        hlsRef.current.startLoad(-1)
      }
      video.play().catch(() => {
        // canPlay-handler yrittää uudelleen kun video on valmiina
      })
    } else {
      video.pause()
    }
  }, [shouldPlay])

  // ── Muted ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current
    if (video) video.muted = muted
  }, [muted])

  // ── Progress tracking ──────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onTimeUpdate = () => {
      if (isSeeking.current) return
      const d = video.duration || 0
      const c = video.currentTime
      setCurrentTime(c)
      setDuration(d)
      setProgress(d > 0 ? c / d : 0)
    }
    const onLoadedMeta = () => setDuration(video.duration || 0)
    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('loadedmetadata', onLoadedMeta)
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('loadedmetadata', onLoadedMeta)
    }
  }, [])

  // ── Seek helpers ───────────────────────────────────────────────────────────
  const seekTo = useCallback((clientX: number) => {
    const bar   = seekBarRef.current
    const video = videoRef.current
    if (!bar || !video || !duration) return
    const rect  = bar.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    video.currentTime = ratio * duration
    setProgress(ratio)
    setCurrentTime(ratio * duration)
  }, [duration])

  const handleSeekStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation()
    isSeeking.current = true
    seekTo('touches' in e ? e.touches[0].clientX : e.clientX)
  }, [seekTo])

  const handleSeekMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isSeeking.current) return
    e.stopPropagation()
    seekTo('touches' in e ? e.touches[0].clientX : e.clientX)
  }, [seekTo])

  const handleSeekEnd = useCallback(() => { isSeeking.current = false }, [])

  const fmt = (s: number) => {
    const m   = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <>
      <video
        ref={videoRef}
        className="video-fill"
        loop
        muted
        playsInline
        preload="metadata"
        x-webkit-airplay="allow"
        onCanPlay={() => {
          // Retry autoplay kun video on bufferoitunut tarpeeksi
          if (shouldPlayRef.current) {
            videoRef.current?.play().catch(() => {})
          }
        }}
      />

      {/* ── Progress bar ───────────────────────────────────────────────────── */}
      {duration > 0 && (
        <div
          className="absolute left-0 right-0"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 64px)', zIndex: 15 }}
        >
          <div className="flex justify-between px-3 mb-1 pointer-events-none">
            <span className="text-white/70 text-xs" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
              {fmt(currentTime)}
            </span>
            <span className="text-white/50 text-xs" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
              {fmt(duration)}
            </span>
          </div>

          <div
            ref={seekBarRef}
            className="relative mx-3 cursor-pointer"
            style={{ height: 20, display: 'flex', alignItems: 'center' }}
            onMouseDown={handleSeekStart}
            onMouseMove={handleSeekMove}
            onMouseUp={handleSeekEnd}
            onMouseLeave={handleSeekEnd}
            onTouchStart={handleSeekStart}
            onTouchMove={handleSeekMove}
            onTouchEnd={handleSeekEnd}
          >
            <div className="w-full rounded-full overflow-hidden" style={{ height: 3, background: 'rgba(255,255,255,0.25)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progress * 100}%`,
                  background: 'linear-gradient(90deg, #F496A5, #fff)',
                  transition: isSeeking.current ? 'none' : 'width 0.1s linear',
                }}
              />
            </div>
            <div
              className="absolute rounded-full bg-white"
              style={{
                width: 12, height: 12,
                left: `calc(${progress * 100}% - 6px)`,
                top: '50%', transform: 'translateY(-50%)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}
