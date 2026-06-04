'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Profile, ProfileInsert, ProfileUpdate } from '@/lib/types'
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
  const [form, setForm] = useState({ name: '', age: '', city: '', bio: '' })
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [uploadStage, setUploadStage] = useState<UploadStage>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState('')
  const [checkoutLoading, setCheckoutLoading] = useState(false)
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
        const p = data as unknown as Profile
        setProfile(p)
        setForm({
          name: p.name ?? '',
          age: p.age?.toString() ?? '',
          city: p.city ?? '',
          bio: p.bio ?? '',
        })
      }
      setLoading(false)
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveStatus('saving')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const age = form.age ? parseInt(form.age) : null
    let error

    if (profile) {
      const update: ProfileUpdate = { name: form.name, age, city: form.city || null, bio: form.bio || null }
      ;({ error } = await supabase.from('profiles').update(update as never).eq('user_id', user.id))
    } else {
      const insert: ProfileInsert = { user_id: user.id, name: form.name, age, city: form.city || null, bio: form.bio || null }
      ;({ error } = await supabase.from('profiles').insert(insert as never))
    }

    if (error) {
      setSaveStatus('error')
    } else {
      setSaveStatus('saved')
      const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle()
      if (data) setProfile(data as unknown as Profile)
      setTimeout(() => setSaveStatus('idle'), 2000)
    }
  }

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

  const handleBuyPremium = async () => {
    setCheckoutLoading(true)
    try {
      const res = await fetch('/api/checkout', { method: 'POST' })
      if (!res.ok) throw new Error('Checkout epäonnistui')
      const { url } = await res.json()
      window.location.href = url
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Virhe kassalla')
      setCheckoutLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    setCheckoutLoading(true)
    try {
      const res = await fetch('/api/customer-portal', { method: 'POST' })
      if (!res.ok) throw new Error('Portaali epäonnistui')
      const { url } = await res.json()
      window.location.href = url
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Virhe portaalissa')
      setCheckoutLoading(false)
    }
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
  const subscriptionSuccess = searchParams.get('subscription') === 'success'

  return (
    <div className="min-h-dvh pb-12"
      style={{ background: 'linear-gradient(135deg, #FFD7DD 0%, #D5EFF7 100%)' }}>

      {/* Header */}
      <div className="px-5 pt-safe pt-12 pb-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-bold text-xl text-gray-900">UGC Suomi</span>
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

        {/* Stripe subscription success banner */}
        {subscriptionSuccess && (
          <div className="mb-4 p-4 rounded-2xl bg-green-50 border border-green-200 flex items-center gap-3">
            <svg className="w-6 h-6 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold text-green-800 text-sm">Premium aktivoitu!</p>
              <p className="text-green-700 text-xs mt-0.5">Lataa nyt esittelyvideo niin profiilisi ilmestyy feediin.</p>
            </div>
          </div>
        )}

        {/* ── PREMIUM SUBSCRIPTION SECTION ── */}
        <div className="bg-white rounded-3xl p-5 shadow-sm mb-4">
          {isPremium ? (
            /* Active premium */
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900">Premium-tilaus</h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{ background: 'rgba(244,150,165,0.12)', color: '#D25A6C' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  Aktiivinen
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Profiilisi näkyy feedissä niin kauan kuin tilaus on voimassa.
              </p>
              <button
                onClick={handleManageSubscription}
                disabled={checkoutLoading}
                className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {checkoutLoading ? 'Ohjataan...' : 'Hallitse tilausta / peruuta'}
              </button>
            </div>
          ) : (
            /* Upsell */
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">Tilaa Premium</h2>
              <p className="text-sm text-gray-500 mb-3">
                Osta kuukausitilaus ja pääse UGC-feediin yritysten löydettäväksi.
              </p>
              <ul className="text-sm text-gray-600 mb-4 space-y-1.5">
                {['Näyt UGC-feedissä yrityksille', 'Lataa esittelyvideo', 'Vastaanota yhteydenottoja', 'Peruutettavissa milloin tahansa'].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#F496A5' }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={handleBuyPremium}
                disabled={checkoutLoading}
                className="w-full py-3.5 rounded-xl font-bold text-white transition-opacity disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #F496A5 0%, #81BFD4 100%)' }}
              >
                {checkoutLoading ? 'Ohjataan kassalle...' : 'Osta Premium →'}
              </button>
            </div>
          )}
        </div>

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

        {/* ── PROFILE FORM ── */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Perustiedot</h2>

          <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nimi *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Esim. Emma K."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ikä</label>
                <input
                  type="number"
                  min={13}
                  max={100}
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  placeholder="25"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Kaupunki</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Helsinki"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio</label>
              <textarea
                rows={3}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Kerro lyhyesti itsestäsi ja siitä, millaista UGC-sisältöä teet..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none text-sm resize-none"
              />
            </div>

            {saveStatus === 'error' && (
              <p className="text-sm text-red-500">Tallennus epäonnistui. Yritä uudelleen.</p>
            )}

            <button
              type="submit"
              disabled={saveStatus === 'saving'}
              className="w-full py-3.5 rounded-xl font-bold text-white transition-opacity disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #F496A5 0%, #D25A6C 100%)' }}
            >
              {saveStatus === 'saving' ? 'Tallennetaan...' : saveStatus === 'saved' ? '✓ Tallennettu!' : 'Tallenna profiili'}
            </button>
          </form>
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
