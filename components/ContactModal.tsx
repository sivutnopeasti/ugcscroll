'use client'

import { useState, useRef, useEffect } from 'react'
import type { Profile } from '@/lib/types'

interface ContactModalProps {
  profile: Profile
  onClose: () => void
}

export default function ContactModal({ profile, onClose }: ContactModalProps) {
  const [form, setForm] = useState({
    senderName: '',
    senderEmail: '',
    company: '',
    message: '',
  })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const firstInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    firstInputRef.current?.focus()
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (status === 'loading') return

    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: profile.id,
          ...form,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error || 'Jokin meni pieleen')
        setStatus('error')
        return
      }

      setStatus('success')
    } catch {
      setErrorMsg('Verkkovirhe. Yritä uudelleen.')
      setStatus('error')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet — max 90% ruudun korkeudesta, sisältö scrollaa */}
      <div
        className="relative w-full max-w-lg rounded-t-3xl flex flex-col"
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          zIndex: 51,
          maxHeight: '90dvh',
        }}
      >
        {/* Handle */}
        <div className="flex-shrink-0 flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="overflow-y-auto px-5 pt-2" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px) + 1.5rem)' }}>
          {status === 'success' ? (
            <div className="flex flex-col items-center py-8 gap-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(244,150,165,0.2)', border: '2px solid #F496A5' }}>
                <svg className="w-8 h-8 text-brand-pink" style={{ color: '#F496A5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-center">
                <h3 className="text-white font-bold text-lg">Viesti lähetetty!</h3>
                <p className="text-white/60 text-sm mt-1">
                  Viestisi on välitetty {profile.name}:lle!
                </p>
              </div>
              <button
                onClick={onClose}
                className="mt-2 px-8 py-2.5 rounded-full font-semibold text-white"
                style={{ background: '#F496A5' }}
              >
                Sulje
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-white font-bold text-lg">Ota yhteyttä</h3>
                  <p className="text-white/50 text-sm">{profile.name}</p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <input
                  ref={firstInputRef}
                  type="text"
                  placeholder="Nimesi *"
                  required
                  value={form.senderName}
                  onChange={(e) => setForm({ ...form, senderName: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-brand-pink text-sm"
                  style={{ '--tw-ring-color': '#F496A5' } as React.CSSProperties}
                />
                <input
                  type="email"
                  placeholder="Sähköpostisi *"
                  required
                  value={form.senderEmail}
                  onChange={(e) => setForm({ ...form, senderEmail: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-brand-pink text-sm"
                />
                <input
                  type="text"
                  placeholder="Yritys (valinnainen)"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-brand-pink text-sm"
                />
                <textarea
                  placeholder="Viestisi *"
                  required
                  rows={3}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-brand-pink text-sm resize-none"
                />

                {status === 'error' && (
                  <p className="text-red-400 text-sm">{errorMsg}</p>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full py-3.5 rounded-xl font-bold text-white mt-1 transition-opacity disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #F496A5 0%, #D25A6C 100%)' }}
                >
                  {status === 'loading' ? 'Lähetetään...' : 'Lähetä viesti'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
