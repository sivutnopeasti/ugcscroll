'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CreatorLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setMessage('')

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setStatus('error')
        setMessage(error.message)
      } else {
        setStatus('success')
        setMessage('Tarkista sähköpostisi vahvistaaksesi tilin.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setStatus('error')
        setMessage('Virheellinen sähköposti tai salasana.')
      } else {
        router.push('/creator/dashboard')
        router.refresh()
      }
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5"
      style={{ background: 'linear-gradient(135deg, #FDF2F4 0%, #F3E8FF 100%)' }}>

      {/* Logo */}
      <Link href="/" className="mb-8 flex items-center gap-2">
        <span className="font-bold text-2xl" style={{ color: '#1a1a1a' }}>UGC Suomi</span>
      </Link>

      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {mode === 'login' ? 'Kirjaudu sisään' : 'Luo tili'}
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          {mode === 'login' ? 'Hallinnoi profiiliasi' : 'Aloita sisällöntuottajana'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Sähköposti
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sinä@esimerkki.fi"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-pink text-sm"
              style={{ '--tw-ring-color': '#F47B8A' } as React.CSSProperties}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Salasana
            </label>
            <input
              type="password"
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-pink text-sm"
            />
          </div>

          {message && (
            <p className={`text-sm ${status === 'error' ? 'text-red-500' : 'text-green-600'}`}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full py-3.5 rounded-xl font-bold text-white mt-1 transition-opacity disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #F47B8A 0%, #E25C6E 100%)' }}
          >
            {status === 'loading'
              ? 'Ladataan...'
              : mode === 'login' ? 'Kirjaudu' : 'Luo tili'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login')
              setMessage('')
              setStatus('idle')
            }}
            className="text-sm font-medium"
            style={{ color: '#F47B8A' }}
          >
            {mode === 'login'
              ? 'Ei tiliä vielä? Rekisteröidy'
              : 'Onko sinulla jo tili? Kirjaudu'}
          </button>
        </div>
      </div>

      <Link href="/" className="mt-6 text-sm text-gray-500 hover:text-gray-700">
        ← Takaisin feediin
      </Link>
    </div>
  )
}
