'use client'

import { useState, useRef, useEffect } from 'react'
import type { Profile } from '@/lib/types'

interface ContactModalProps {
  profile: Profile
  onClose: () => void
}

export default function ContactModal({ profile, onClose }: ContactModalProps) {
  const [form, setForm] = useState({ senderName: '', senderEmail: '', company: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const firstInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    firstInputRef.current?.focus()
    document.body.style.overflow = 'hidden'
    document.body.classList.add('modal-open')
    return () => {
      document.body.style.overflow = ''
      document.body.classList.remove('modal-open')
    }
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
        body: JSON.stringify({ profileId: profile.id, ...form }),
      })
      const data = await res.json()
      if (!res.ok) { setErrorMsg(data.error || 'Jokin meni pieleen'); setStatus('error'); return }
      setStatus('success')
    } catch {
      setErrorMsg('Verkkovirhe. Yritä uudelleen.')
      setStatus('error')
    }
  }

  // Initiaali-avatar tekijälle
  const initial = (profile.name ?? 'U').charAt(0).toUpperCase()

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div
        className="relative w-full max-w-lg rounded-t-2xl flex flex-col"
        style={{ background: '#ffffff', zIndex: 51 }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
          <div className="w-9 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 flex-shrink-0"
          style={{ borderBottom: '1px solid #f0f0f0' }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #F496A5 0%, #81BFD4 100%)' }}
            >
              {initial}
            </div>
            <div>
              <p className="text-gray-900 font-semibold text-sm leading-tight">{profile.name}</p>
              <p className="text-gray-400 text-xs">Lähetä yhteydenotto</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
            style={{ background: '#f5f5f5' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Sisältö */}
        <div className="px-4 py-3 flex-shrink-0">
          {status === 'success' ? (
            <div className="flex flex-col items-center py-6 gap-3">
              <div className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(244,150,165,0.15)', border: '1.5px solid #F496A5' }}>
                <svg className="w-7 h-7" style={{ color: '#F496A5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-gray-900 font-semibold">Viesti lähetetty!</p>
                <p className="text-gray-400 text-sm mt-1">Viestisi on välitetty {profile.name}:lle!</p>
              </div>
              <button
                onClick={onClose}
                className="mt-1 px-8 py-2 rounded-full font-semibold text-white text-sm"
                style={{ background: '#F496A5' }}
              >
                Sulje
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-0">
              {/* Kentät listana kuten TikTokin kommenttisyöte */}
              {[
                { ref: firstInputRef, type: 'text',  placeholder: 'Nimesi', key: 'senderName',  required: true,  icon: '👤' },
                { ref: undefined,     type: 'email', placeholder: 'Sähköpostisi', key: 'senderEmail', required: true,  icon: '✉️' },
                { ref: undefined,     type: 'text',  placeholder: 'Yritys (valinnainen)', key: 'company', required: false, icon: '🏢' },
              ].map((field) => (
                <div key={field.key} className="flex items-center gap-3 py-3"
                  style={                { borderBottom: '1px solid #f0f0f0' }}>
                  <span className="text-base w-5 flex-shrink-0 text-center leading-none select-none">{field.icon}</span>
                  <input
                    ref={field.ref as React.RefObject<HTMLInputElement> | undefined}
                    type={field.type}
                    placeholder={field.placeholder}
                    required={field.required}
                    value={form[field.key as keyof typeof form]}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 text-sm focus:outline-none"
                  />
                </div>
              ))}

              {/* Viestikenttä + lähetä — TikTok add-comment tyylisenä */}
              <div className="flex items-end gap-3 mt-3 p-3 rounded-xl"
                style={{ background: '#f5f5f5' }}>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 self-end"
                  style={{ background: 'linear-gradient(135deg, #F496A5 0%, #81BFD4 100%)' }}
                >
                  {(form.senderName || 'S').charAt(0).toUpperCase()}
                </div>
                <textarea
                  placeholder="Kirjoita viestisi…"
                  required
                  rows={3}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 text-sm focus:outline-none resize-none"
                />
                <button
                  type="submit"
                  disabled={status === 'loading' || !form.message.trim()}
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 self-end transition-opacity disabled:opacity-30"
                  style={{ background: 'linear-gradient(135deg, #F496A5 0%, #D25A6C 100%)' }}
                  aria-label="Lähetä"
                >
                  {status === 'loading' ? (
                    <svg className="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>

              {status === 'error' && (
                <p className="text-red-400 text-xs mt-2 text-center">{errorMsg}</p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
