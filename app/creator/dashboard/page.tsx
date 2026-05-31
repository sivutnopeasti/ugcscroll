'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Profile, ProfileInsert, ProfileUpdate } from '@/lib/types'
import Link from 'next/link'

type UploadStage = 'idle' | 'uploading' | 'processing' | 'done' | 'error'

export default function CreatorDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [form, setForm] = useState({ name: '', age: '', city: '', bio: '' })
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [uploadStage, setUploadStage] = useState<UploadStage>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState('')
  const [loading, setLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
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
      const update: ProfileUpdate = {
        name: form.name,
        age,
        city: form.city || null,
        bio: form.bio || null,
      }
      ;({ error } = await supabase.from('profiles').update(update as never).eq('user_id', user.id))
    } else {
      const insert: ProfileInsert = {
        user_id: user.id,
        name: form.name,
        age,
        city: form.city || null,
        bio: form.bio || null,
      }
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Ei kirjautunut')

      const ext = file.name.split('.').pop() ?? 'mp4'
      const fileName = `${user.id}/${Date.now()}.${ext}`

      // Upload to Supabase Storage with XHR for progress
      const publicUrl = await uploadToStorage(supabase, file, fileName, (p) => setUploadProgress(p))

      setUploadStage('processing')

      const videoUpdate: ProfileUpdate = {
        cloudflare_video_id: publicUrl,
        video_thumbnail_url: null,
      }

      const { error } = await supabase
        .from('profiles')
        .update(videoUpdate as never)
        .eq('user_id', user.id)

      if (error) throw error

      const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle()
      if (data) setProfile(data as unknown as Profile)

      setUploadStage('done')
      setTimeout(() => setUploadStage('idle'), 3000)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Lähetys epäonnistui')
      setUploadStage('error')
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #FDF2F4 0%, #F3E8FF 100%)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-white/40 animate-spin"
          style={{ borderTopColor: '#F47B8A' }} />
      </div>
    )
  }

  const videoUrl = profile?.cloudflare_video_id ?? null

  return (
    <div className="min-h-dvh pb-12"
      style={{ background: 'linear-gradient(135deg, #FDF2F4 0%, #F3E8FF 100%)' }}>

      {/* Header */}
      <div className="px-5 pt-safe pt-12 pb-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-bold text-xl text-gray-900">UGC Suomi</span>
        </Link>
        <button
          onClick={handleSignOut}
          className="text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          Kirjaudu ulos
        </button>
      </div>

      <div className="px-5 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Oma profiili</h1>
        <p className="text-sm text-gray-500 mb-6">
          {profile?.is_premium
            ? '✓ Premium-tili aktiivinen — profiilisi näkyy feedissä'
            : 'Premium-tilaus vaaditaan feedinäkyvyyteen'}
        </p>

        {/* Video section */}
        <div className="bg-white rounded-3xl p-5 shadow-sm mb-4">
          <h2 className="font-semibold text-gray-900 mb-3">Esittelyvideo</h2>

          {videoUrl && uploadStage !== 'uploading' && uploadStage !== 'processing' ? (
            <div className="relative rounded-2xl overflow-hidden mb-4 bg-black" style={{ aspectRatio: '9/16', maxHeight: 280 }}>
              <video
                src={videoUrl}
                className="absolute inset-0 w-full h-full object-cover"
                muted
                playsInline
                preload="metadata"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </div>
          ) : null}

          {(uploadStage === 'uploading' || uploadStage === 'processing') && (
            <div className="mb-4 p-4 rounded-2xl bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {uploadStage === 'uploading' ? 'Ladataan videota...' : 'Cloudflare käsittelee videota...'}
                </span>
                {uploadStage === 'uploading' && (
                  <span className="text-sm text-gray-500">{uploadProgress}%</span>
                )}
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                {uploadStage === 'uploading' ? (
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%`, background: 'linear-gradient(90deg, #F47B8A, #C084FC)' }}
                  />
                ) : (
                  <div
                    className="h-full rounded-full animate-pulse"
                    style={{ width: '100%', background: 'linear-gradient(90deg, #F47B8A, #C084FC)' }}
                  />
                )}
              </div>
            </div>
          )}

          {uploadStage === 'done' && (
            <div className="mb-4 p-3 rounded-2xl bg-green-50 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-green-700 font-medium">Video ladattu onnistuneesti!</span>
            </div>
          )}

          {uploadError && (
            <p className="mb-3 text-sm text-red-500">{uploadError}</p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleVideoSelect}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadStage === 'uploading' || uploadStage === 'processing'}
            className="w-full py-3 rounded-xl border-2 border-dashed font-medium text-sm transition-colors disabled:opacity-50"
            style={{ borderColor: '#F47B8A', color: '#F47B8A' }}
          >
            {videoUrl ? 'Vaihda video' : '+ Lisää esittelyvideo'}
          </button>
          <p className="text-xs text-gray-400 mt-2 text-center">MP4, MOV — max 500 MB, max 5 min</p>
        </div>

        {/* Profile form */}
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
              style={{ background: 'linear-gradient(135deg, #F47B8A 0%, #E25C6E 100%)' }}
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
      <h2 className="font-semibold text-gray-900 mb-4">
        Yhteydenotot ({requests.length})
      </h2>
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
                style={{ background: 'rgba(244,123,138,0.15)', color: '#E25C6E' }}
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

async function uploadToStorage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  file: File,
  fileName: string,
  onProgress: (p: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const storageUrl = `${supabaseUrl}/storage/v1/object/videos/${fileName}`

    supabase.auth.getSession().then(({ data: { session } }: { data: { session: { access_token: string } | null } }) => {
      if (!session) { reject(new Error('Ei sessiota')); return }

      const xhr = new XMLHttpRequest()
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
      })
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/videos/${fileName}`
          resolve(publicUrl)
        } else {
          reject(new Error(`Tallennus epäonnistui: ${xhr.status} ${xhr.responseText}`))
        }
      })
      xhr.addEventListener('error', () => reject(new Error('Verkkovirhe ladattaessa')))
      xhr.open('POST', storageUrl)
      xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`)
      xhr.setRequestHeader('Content-Type', file.type)
      xhr.setRequestHeader('x-upsert', 'true')
      xhr.send(file)
    })
  })
}
