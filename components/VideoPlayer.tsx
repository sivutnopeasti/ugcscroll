'use client'

import { useEffect, useRef } from 'react'
import Hls from 'hls.js'

interface VideoPlayerProps {
  videoUrl: string   // HLS .m3u8 URL or legacy Supabase direct MP4 URL
  shouldPlay: boolean
  muted: boolean
}

export default function VideoPlayer({ videoUrl, shouldPlay, muted }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)

  // Set up source — handle HLS vs direct MP4
  useEffect(() => {
    const video = videoRef.current
    if (!video || !videoUrl) return

    const isHls = videoUrl.includes('.m3u8') || videoUrl.includes('videodelivery.net')

    if (isHls) {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari: native HLS support
        video.src = videoUrl
      } else if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,

          // Aloita korkeammalta bitrate-arvaukselta (2 Mbps) → hls.js valitsee
          // 720p/1080p heti alusta eikä rampaa ylös 360p:stä
          abrEwmaDefaultEstimate: 2_000_000,
          abrMaxWithRealBitrate: true,

          // Rajoita laatu näytön kokoon — mobiililla 720p riittää, ei tuhlata
          // kaistaa 1080p:hen kun ruutu on 390 px leveä
          capLevelToPlayerSize: true,

          // Bufferoi koko 60 s video keralla → sujuva toisto ilman keskeytyksiä
          maxBufferLength: 60,
          maxMaxBufferLength: 60,
          backBufferLength: 60,
        })
        hls.loadSource(videoUrl)
        hls.attachMedia(video)
        hlsRef.current = hls
      }
    } else {
      // Legacy: direct MP4 from Supabase Storage
      video.src = videoUrl
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [videoUrl])

  // Play/pause
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (shouldPlay) {
      video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [shouldPlay])

  // Muted — must be set via DOM (React muted prop is broken)
  useEffect(() => {
    const video = videoRef.current
    if (video) video.muted = muted
  }, [muted])

  return (
    <video
      ref={videoRef}
      className="video-fill"
      loop
      muted
      playsInline
      preload="metadata"
      x-webkit-airplay="allow"
    />
  )
}
