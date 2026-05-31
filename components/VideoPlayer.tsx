'use client'

import { useEffect, useRef } from 'react'

interface VideoPlayerProps {
  videoUrl: string
  shouldPlay: boolean
  muted: boolean
}

export default function VideoPlayer({ videoUrl, shouldPlay, muted }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (shouldPlay) {
      video.play().catch(() => {})
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
      src={videoUrl}
      loop
      muted={muted}
      playsInline
      preload="metadata"
    />
  )
}
