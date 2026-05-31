import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'
import ContactButton from '@/components/ContactButton'

interface Props {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export default async function ProfilePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!data) notFound()

  const profile = data as unknown as Profile

  return (
    <div className="min-h-dvh bg-black text-white" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)' }}>
      {/* Header with video preview */}
      <div className="relative h-64 overflow-hidden">
        {profile.cloudflare_video_id ? (
          <video
            src={profile.cloudflare_video_id}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, #F47B8A, #C084FC)' }} />
        )}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.9) 100%)' }} />

        {/* Back button */}
        <Link
          href="/"
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
          aria-label="Takaisin"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>

        {/* Premium badge */}
        {profile.is_premium && (
          <div
            className="absolute top-4 right-4 inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(244,123,138,0.9)', backdropFilter: 'blur(4px)' }}
          >
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-white text-xs font-semibold">Premium UGC</span>
          </div>
        )}

        {/* Name over gradient */}
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-3xl font-bold text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
            {profile.name}
            {profile.age && (
              <span className="font-normal text-white/80 text-2xl ml-2">{profile.age}</span>
            )}
          </h1>
          {profile.city && (
            <div className="flex items-center gap-1 mt-1">
              <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-white/80 text-sm">{profile.city}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <div className="px-4 pt-5 pb-2">
          <h2 className="text-white/50 text-xs uppercase tracking-widest font-semibold mb-2">Kuvaus</h2>
          <p className="text-white/90 leading-relaxed">{profile.bio}</p>
        </div>
      )}

      {/* Full video player */}
      {profile.cloudflare_video_id && (
        <div className="px-4 pt-5">
          <h2 className="text-white/50 text-xs uppercase tracking-widest font-semibold mb-3">Video</h2>
          <div className="rounded-2xl overflow-hidden w-full" style={{ aspectRatio: '9/16', maxHeight: '65vh' }}>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              src={profile.cloudflare_video_id}
              controls
              playsInline
              preload="metadata"
              className="w-full h-full object-cover bg-neutral-900"
            />
          </div>
        </div>
      )}

      {/* Contact button */}
      <div className="px-4 pt-6">
        <ContactButton profile={profile} />
      </div>

      <BottomNav active="feed" />
    </div>
  )
}
