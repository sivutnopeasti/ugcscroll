'use client'

import { useEffect, useRef } from 'react'
import { getHlsUrl } from '@/lib/cloudflare'

interface VideoPlayerProps {
  videoId: string
  shouldPlay: boolean
  muted: boolean
  onEnded?: () => void
}

export default function VideoPlayer({ videoId, shouldPlay, muted, onEnded }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<import('hls.js').default | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const hlsUrl = getHlsUrl(videoId)

    const setupVideo = async () => {
      // Native HLS support (Safari, iOS)
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = hlsUrl
        return
      }

      // HLS.js for Chrome/Firefox
      const Hls = (await import('hls.js')).default
      if (Hls.isSupported()) {
        if (hlsRef.current) {
          hlsRef.current.destroy()
        }
        const hls = new Hls({
          startLevel: -1,
          maxBufferLength: 20,
          maxMaxBufferLength: 40,
          lowLatencyMode: false,
        })
        hls.loadSource(hlsUrl)
        hls.attachMedia(video)
        hlsRef.current = hls
      }
    }

    setupVideo()

    return () => {
      hlsRef.current?.destroy()
      hlsRef.current = null
    }
  }, [videoId])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (shouldPlay) {
      const playPromise = video.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay blocked — user interaction required
        })
      }
    } else {
      video.pause()
    }
  }, [shouldPlay])

  useEffect(() => {
    const video = videoRef.current
    if (video) video.muted = muted
  }, [muted])

  return (
    <video
      ref={videoRef}
      className="video-fill"
      loop
      muted={muted}
      playsInline
      preload="metadata"
      onEnded={onEnded}
      aria-label="UGC sisältövideo"
    />
  )
}
