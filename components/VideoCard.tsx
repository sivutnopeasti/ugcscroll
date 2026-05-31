'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { Profile } from '@/lib/types'
import VideoPlayer from './VideoPlayer'
import LikeButton from './LikeButton'
import ContactModal from './ContactModal'

interface VideoCardProps {
  profile: Profile
  isActive: boolean
  globalMuted: boolean
  onMuteToggle: () => void
}

export default function VideoCard({ profile, isActive, globalMuted, onMuteToggle }: VideoCardProps) {
  const [contactOpen, setContactOpen] = useState(false)
  const videoUrl = profile.cloudflare_video_id!

  return (
    <div className="video-snap-card">
      {/* Video */}
      <div style={{ zIndex: 1, position: 'absolute', inset: 0 }}>
        <VideoPlayer
          videoUrl={videoUrl}
          shouldPlay={isActive}
          muted={globalMuted}
        />
      </div>

      {/* Gradient overlay */}
      <div className="video-overlay" style={{ zIndex: 2 }} />

      {/* Tap to toggle mute */}
      <button
        onClick={onMuteToggle}
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 3, background: 'transparent' }}
        aria-label={globalMuted ? 'Poista mykistys' : 'Mykistä'}
      />

      {/* Right-side action buttons (TikTok style) */}
      <div
        className="absolute right-3 flex flex-col items-center gap-5 pb-24"
        style={{ bottom: '4rem', zIndex: 10 }}
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

        {/* Mute indicator */}
        <button
          onClick={onMuteToggle}
          className="flex flex-col items-center gap-1"
          style={{ zIndex: 11 }}
          aria-label={globalMuted ? 'Poista mykistys' : 'Mykistä'}
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
                  d="M15.536 8.464a5 5 0 010 7.072M12 6v12M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
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
        className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-16"
        style={{ zIndex: 10 }}
      >
        {/* UGC Suomi badge */}
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full mb-2"
          style={{ background: 'rgba(244,123,138,0.9)', backdropFilter: 'blur(4px)' }}>
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-white text-xs font-semibold">Premium UGC</span>
        </div>

        <h2 className="text-white font-bold text-xl leading-tight" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
          {profile.name}
          {profile.age && (
            <span className="font-normal text-white/80 text-lg ml-1">{profile.age}</span>
          )}
        </h2>

        {profile.city && (
          <div className="flex items-center gap-1 mt-0.5">
            <svg className="w-3.5 h-3.5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-white/80 text-sm" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
              {profile.city}
            </span>
          </div>
        )}

        {profile.bio && (
          <p className="text-white/90 text-sm mt-2 line-clamp-2" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
            {profile.bio}
          </p>
        )}
      </div>

      {/* Contact modal */}
      {contactOpen && (
        <ContactModal
          profile={profile}
          onClose={() => setContactOpen(false)}
        />
      )}
    </div>
  )
}
