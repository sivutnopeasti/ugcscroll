'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Profile, ProfileUpdate } from '@/lib/types'
import { getThumbnailUrl } from '@/lib/cloudflare'
import Link from 'next/link'

type UploadStage = 'idle' | 'uploading' | 'processing' | 'done' | 'error'

// Resolve thumbnail: CF Stream or fallback for Supabase legacy URLs
function resolveThumbnail(videoId: string): string | null {
  if (!videoId) return null
  if (videoId.startsWith('https://')) return null   // legacy Supabase Storage — no auto-thumb
  return getThumbnailUrl(videoId)
}

export default function CreatorDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [uploadStage, setUploadStage] = useState<UploadStage>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState('')
  const [loading, setLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/creator/login'); return }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (data) {
        setProfile(data as unknown as Profile)
      }
      setLoading(false)
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('video/')) {
      setUploadError('Valitse videotiedosto (MP4, MOV, jne.)')
      return
    }
    if (file.size > 500 * 1024 * 1024) {
      setUploadError('Video on liian suuri (max 500 MB)')
      return
    }

    setUploadStage('uploading')
    setUploadProgress(0)
    setUploadError('')

    try {
      // Step 1: Get Cloudflare Direct Upload URL
      const urlRes = await fetch('/api/upload-url', { method: 'POST' })
      if (!urlRes.ok) {
        const err = await urlRes.json().catch(() => ({}))
        throw new Error(err.error ?? `Upload URL haku epäonnistui (${urlRes.status})`)
      }
      const { uploadURL, uid } = await urlRes.json()

      // Step 2: Upload directly to Cloudflare Stream
      await uploadToCF(file, uploadURL, (p) => setUploadProgress(p))

      setUploadStage('processing')

      // Step 3: Save CF video UID to profile
      const videoUpdate: ProfileUpdate = { cloudflare_video_id: uid, video_thumbnail_url: null }
      const { error } = await supabase
        .from('profiles')
        .update(videoUpdate as never)
        .eq('user_id', (await supabase.auth.getUser()).data.user!.id)

      if (error) throw error

      const { data } = await supabase.from('profiles').select('*')
        .eq('user_id', (await supabase.auth.getUser()).data.user!.id).maybeSingle()
      if (data) setProfile(data as unknown as Profile)

      setUploadStage('done')
      setTimeout(() => setUploadStage('idle'), 4000)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Lähetys epäonnistui')
      setUploadStage('error')
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDeleteVideo = async () => {
    if (!profile?.cloudflare_video_id) return
    if (!confirm('Poistetaanko video? Se häviää myös feedistä.')) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Delete from CF Stream if it's a UID (not a legacy Supabase URL)
    const videoId = profile.cloudflare_video_id
    if (!videoId.startsWith('https://')) {
      await fetch(`/api/delete-video?uid=${encodeURIComponent(videoId)}`, { method: 'DELETE' })
        .catch((err) => console.warn('CF delete failed:', err))
    }

    await supabase
      .from('profiles')
      .update({ cloudflare_video_id: null, video_thumbnail_url: null } as never)
      .eq('user_id', user.id)

    setProfile((prev) => prev ? { ...prev, cloudflare_video_id: null, video_thumbnail_url: null } : prev)
  }


  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #FFD7DD 0%, #D5EFF7 100%)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-white/40 animate-spin"
          style={{ borderTopColor: '#F496A5' }} />
      </div>
    )
  }

  const videoId = profile?.cloudflare_video_id ?? null
  const thumbnailUrl = videoId ? resolveThumbnail(videoId) : null
  const isPremium = profile?.is_premium ?? false

  return (
    <div className="min-h-dvh pb-12"
      style={{ background: 'linear-gradient(135deg, #FFD7DD 0%, #D5EFF7 100%)' }}>

      {/* Header */}
      <div className="px-5 pt-safe pt-12 pb-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="UGC Suomi" style={{ height: 30, filter: 'brightness(0)' }} />
        </Link>
        <button onClick={handleSignOut} className="text-sm font-medium text-gray-500 hover:text-gray-700">
          Kirjaudu ulos
        </button>
      </div>

      <div className="px-5 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Oma profiili</h1>

        {/* Status line */}
        <p className="text-sm text-gray-500 mb-6">
          {isPremium
            ? videoId
              ? '✓ Premium — profiilisi näkyy feedissä'
              : '✓ Premium — lisää video niin pääset feediin'
            : 'Tilaa Premium näkyäksesi UGC-feedissä'}
        </p>

        {/* ── EI PREMIUM → linkki ugcsuomi.fi:hin ── */}
        {!isPremium && (
          <div className="bg-white rounded-3xl p-5 shadow-sm mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-gray-900 text-sm mb-0.5">Ei Premium-tilausta</p>
              <p className="text-xs text-gray-500">Tilaa Premium ugcsuomi.fi:ssä ja pääset feediin.</p>
            </div>
            <a
              href="https://ugcsuomi.fi/oma-tili"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold text-white whitespace-nowrap"
              style={{ background: 'linear-gradient(135deg, #F496A5 0%, #81BFD4 100%)' }}
            >
              Tilaa →
            </a>
          </div>
        )}

        {/* ── VIDEO SECTION (premium only) ── */}
        {isPremium && (
          <div className="bg-white rounded-3xl p-5 shadow-sm mb-4">
            <h2 className="font-semibold text-gray-900 mb-3">Esittelyvideo</h2>

            {videoId && uploadStage !== 'uploading' && uploadStage !== 'processing' && (
              <div className="mb-4">
                <div className="rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: '9/16', maxHeight: 320 }}>
                  {thumbnailUrl ? (
                    /* Show CF thumbnail while processing / as preview */
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbnailUrl} alt="Video thumbnail" className="w-full h-full object-cover" />
                  ) : (
                    /* Legacy Supabase URL — use native video */
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video src={videoId} className="w-full h-full object-cover" controls playsInline preload="metadata" />
                  )}
                </div>
                <button
                  onClick={handleDeleteVideo}
                  className="mt-2 w-full py-2 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Poista video
                </button>
              </div>
            )}

            {(uploadStage === 'uploading' || uploadStage === 'processing') && (
              <div className="mb-4 p-4 rounded-2xl bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {uploadStage === 'uploading' ? 'Ladataan Cloudflare Streamiin...' : 'Cloudflare käsittelee videota...'}
                  </span>
                  {uploadStage === 'uploading' && (
                    <span className="text-sm text-gray-500">{uploadProgress}%</span>
                  )}
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  {uploadStage === 'uploading' ? (
                    <div className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%`, background: 'linear-gradient(90deg, #F496A5, #81BFD4)' }} />
                  ) : (
                    <div className="h-full rounded-full animate-pulse"
                      style={{ width: '100%', background: 'linear-gradient(90deg, #F496A5, #81BFD4)' }} />
                  )}
                </div>
                {uploadStage === 'processing' && (
                  <p className="text-xs text-gray-400 mt-2">Video ilmestyy feediin muutaman minuutin kuluttua.</p>
                )}
              </div>
            )}

            {uploadStage === 'done' && (
              <div className="mb-4 p-3 rounded-2xl bg-green-50 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-green-700 font-medium">Video lähetetty Cloudflare Streamiin!</span>
              </div>
            )}

            {uploadError && (
              <p className="mb-3 text-sm text-red-500">{uploadError}</p>
            )}

            <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoSelect} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadStage === 'uploading' || uploadStage === 'processing'}
              className="w-full py-3 rounded-xl border-2 border-dashed font-medium text-sm transition-colors disabled:opacity-50"
              style={{ borderColor: '#F496A5', color: '#F496A5' }}
            >
              {videoId ? 'Vaihda video' : '+ Lisää esittelyvideo'}
            </button>
            <p className="text-xs text-gray-400 mt-2 text-center">MP4, MOV — max 500 MB, max 5 min</p>
          </div>
        )}

        {/* ── PROFILE INFO (synced from ugcsuomi.fi) ── */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Profiilitiedot</h2>
            <a
              href="https://ugcsuomi.fi/oma-tili"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium flex items-center gap-1"
              style={{ color: '#F496A5' }}
            >
              Muokkaa ugcsuomi.fi:ssä
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          {profile?.name ? (
            <div className="flex flex-col gap-3">
              {/* Name + age + city row */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                  style={{ background: 'linear-gradient(90deg, #F496A5, #81BFD4)' }}>
                  {profile.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-base leading-tight">
                    {profile.name}
                    {profile.age && <span className="font-normal text-gray-500 ml-1.5">{profile.age}</span>}
                  </p>
                  {profile.city && (
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {profile.city}
                    </p>
                  )}
                </div>
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl px-4 py-3">
                  {profile.bio}
                </p>
              )}
            </div>
          ) : (
            /* No profile data yet */
            <div className="text-center py-4">
              <p className="text-sm text-gray-500 mb-3">
                Tietoja ei ole vielä synkattu. Kirjaudu ugcsuomi.fi:ssä ja avaa UGC Scroll sieltä,
                niin profiilitietosi siirtyvät automaattisesti.
              </p>
              <a
                href="https://ugcsuomi.fi"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(90deg, #F496A5, #81BFD4)' }}
              >
                Siirry ugcsuomi.fi:hin
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}

          <p className="text-xs text-gray-400 mt-4 text-center">
            Tiedot haetaan automaattisesti ugcsuomi.fi-profiilisi mukaan
          </p>
        </div>

        <ContactRequests profile={profile} />
      </div>
    </div>
  )
}

function ContactRequests({ profile }: { profile: Profile | null }) {
  const [requests, setRequests] = useState<Array<{
    id: string; sender_name: string; sender_email: string; company: string | null; message: string; created_at: string
  }>>([])
  const supabase = createClient()

  useEffect(() => {
    if (!profile) return
    supabase
      .from('contact_requests')
      .select('*')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setRequests((data as unknown as typeof requests) ?? []))
  }, [profile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!profile || requests.length === 0) return null

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm mt-4">
      <h2 className="font-semibold text-gray-900 mb-4">Yhteydenotot ({requests.length})</h2>
      <div className="flex flex-col gap-3">
        {requests.map((req) => (
          <div key={req.id} className="p-4 rounded-2xl bg-gray-50">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-gray-900 text-sm">{req.sender_name}</p>
                {req.company && <p className="text-xs text-gray-500">{req.company}</p>}
              </div>
              <a
                href={`mailto:${req.sender_email}`}
                className="text-xs font-medium px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(244,150,165,0.15)', color: '#D25A6C' }}
              >
                Vastaa
              </a>
            </div>
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{req.message}</p>
            <p className="text-xs text-gray-400 mt-1">
              {new Date(req.created_at).toLocaleDateString('fi-FI')}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// Upload file to Cloudflare Stream Direct Upload URL with progress tracking
async function uploadToCF(file: File, uploadURL: string, onProgress: (p: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)

    const xhr = new XMLHttpRequest()
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    })
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        reject(new Error(`Cloudflare upload epäonnistui: ${xhr.status}`))
      }
    })
    xhr.addEventListener('error', () => reject(new Error('Verkkovirhe ladattaessa')))
    xhr.open('POST', uploadURL)
    xhr.send(formData)
  })
}
