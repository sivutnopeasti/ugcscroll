'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Hls from 'hls.js'

interface VideoPlayerProps {
  videoUrl: string
  shouldPlay: boolean
  muted: boolean
  isActive: boolean  // true = tämä video on näkyvissä, false = scrollattu pois → nollaa
}

export default function VideoPlayer({ videoUrl, shouldPlay, muted, isActive }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef  = useRef<Hls | null>(null)
  const [progress, setProgress]   = useState(0)      // 0–1
  const [duration, setDuration]   = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const seekBarRef = useRef<HTMLDivElement>(null)
  const isSeeking  = useRef(false)

  // Ref joka pitää aina ajan tasalla olevan shouldPlay-arvon asynkronisia callbackeja varten
  const shouldPlayRef = useRef(shouldPlay)
  shouldPlayRef.current = shouldPlay

  // ── Web Audio normalization ─────────────────────────────────────────────
  const audioCtxRef    = useRef<AudioContext | null>(null)
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null)

  const initAudioNormalization = useCallback(() => {
    const video = videoRef.current
    if (!video || audioSourceRef.current) return   // already wired up
    try {
      const ctx = audioCtxRef.current ?? new AudioContext()
      audioCtxRef.current = ctx
      // resume() voi epäonnistua ilman käyttäjägesterä — ei estä videoiden toistoa
      ctx.resume().catch(() => {})

      const source = ctx.createMediaElementSource(video)
      audioSourceRef.current = source

      const compressor = ctx.createDynamicsCompressor()
      compressor.threshold.value = -24
      compressor.knee.value       =  30
      compressor.ratio.value      =  12
      compressor.attack.value     =   0.003
      compressor.release.value    =   0.25

      const gain = ctx.createGain()
      gain.gain.value = 1.5

      source.connect(compressor)
      compressor.connect(gain)
      gain.connect(ctx.destination)
    } catch (e) {
      console.warn('Web Audio init skipped:', e)
    }
  }, [])

  // ── Set up HLS / direct source ─────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current
    if (!video || !videoUrl) return

    const isHls = videoUrl.includes('.m3u8') || videoUrl.includes('videodelivery.net')

    if (isHls) {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = videoUrl
      } else if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          abrEwmaDefaultEstimate: 4_000_000,
          abrMaxWithRealBitrate: true,
          maxBufferLength: 60,
          maxMaxBufferLength: 60,
          backBufferLength: 60,
        })
        hls.loadSource(videoUrl)
        hls.attachMedia(video)
        hlsRef.current = hls
      }
    } else {
      video.src = videoUrl
    }

    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null }
      // Sulje AudioContext kun komponentti unmountataan
      if (audioCtxRef.current) {
        audioCtxRef.current.close()
        audioCtxRef.current = null
        audioSourceRef.current = null
      }
    }
  }, [videoUrl])

  // ── Play / pause ─────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (shouldPlay) {
      initAudioNormalization()
      video.play().catch(() => {
        // Video ei ole vielä bufferoitunut — canplay-tapahtuma yrittää uudelleen
      })
    } else {
      video.pause()
    }
  }, [shouldPlay, initAudioNormalization])

  // ── Nollaa alusta vain kun video vaihtuu (isActive → false) ───────────
  useEffect(() => {
    if (!isActive) {
      const video = videoRef.current
      if (video) {
        // Keskeytä ensin, sitten nollaa — varmistaa ettei pending play jatku
        video.pause()
        video.currentTime = 0
        setProgress(0)
        setCurrentTime(0)
      }
    }
  }, [isActive])

  // ── Muted ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current
    if (video) video.muted = muted
  }, [muted])

  // ── Progress tracking ──────────────────────────────────────────────────
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

  // ── Seek helpers ───────────────────────────────────────────────────────
  const seekTo = useCallback((clientX: number) => {
    const bar = seekBarRef.current
    const video = videoRef.current
    if (!bar || !video || !duration) return
    const rect = bar.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    video.currentTime = ratio * duration
    setProgress(ratio)
    setCurrentTime(ratio * duration)
  }, [duration])

  const handleSeekStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation()
    isSeeking.current = true
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX
    seekTo(x)
  }, [seekTo])

  const handleSeekMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isSeeking.current) return
    e.stopPropagation()
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX
    seekTo(x)
  }, [seekTo])

  const handleSeekEnd = useCallback(() => {
    isSeeking.current = false
  }, [])

  // Aika-apufunktio mm:ss
  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
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
        preload="auto"
        x-webkit-airplay="allow"
        onCanPlay={() => {
          // Toista heti kun video on valmiina — korjaa tapaukset joissa play() kutsuttiin liian aikaisin
          if (shouldPlayRef.current) {
            videoRef.current?.play().catch(() => {})
          }
        }}
      />

      {/* ── Progress bar ─────────────────────────────────────────────── */}
      {duration > 0 && (
        <div
          className="absolute left-0 right-0"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 64px)', zIndex: 15 }}
        >
          {/* Aika-teksti */}
          <div className="flex justify-between px-3 mb-1 pointer-events-none">
            <span className="text-white/70 text-xs" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
              {fmt(currentTime)}
            </span>
            <span className="text-white/50 text-xs" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
              {fmt(duration)}
            </span>
          </div>

          {/* Seek-palkki — iso kosketusalue, ohut visuaalinen track */}
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
            {/* Track */}
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
            {/* Peukalo */}
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
