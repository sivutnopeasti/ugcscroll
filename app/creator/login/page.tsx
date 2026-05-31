'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CreatorLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('signup')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setMessage('')

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) {
        setStatus('error')
        setMessage(error.message)
      } else {
        setStatus('success')
        setMessage('Tarkista sähköpostisi — klikkaa linkkiä niin pääset suoraan sovellukseen sisään.')
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
      <Link href="/" className="mb-6 flex items-center gap-2">
        <span className="font-bold text-2xl" style={{ color: '#1a1a1a' }}>UGC Suomi</span>
      </Link>

      {/* Free badge — shown only on signup */}
      {mode === 'signup' && (
        <div className="flex items-center gap-2 mb-5 px-4 py-2 rounded-full"
          style={{ background: 'rgba(244,123,138,0.12)', border: '1px solid rgba(244,123,138,0.3)' }}>
          <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#F47B8A' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          <span className="text-sm font-semibold" style={{ color: '#E25C6E' }}>
            Ilmainen profiili — ei luottokorttia
          </span>
        </div>
      )}

      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {mode === 'signup' ? 'Luo profiili' : 'Kirjaudu sisään'}
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          {mode === 'signup'
            ? 'Lisää esittelyvideosi ja tavoita yrityksiä'
            : 'Hallinnoi profiiliasi ja yhteydenottoja'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Sähköposti</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sinä@esimerkki.fi"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Salasana</label>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none text-sm"
            />
          </div>

          {message && (
            <p className={`text-sm ${status === 'error' ? 'text-red-500' : 'text-green-600'}`}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={status === 'loading' || status === 'success'}
            className="w-full py-3.5 rounded-xl font-bold text-white mt-1 transition-opacity disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #F47B8A 0%, #E25C6E 100%)' }}
          >
            {status === 'loading'
              ? 'Ladataan...'
              : mode === 'signup' ? 'Luo ilmainen profiili' : 'Kirjaudu'}
          </button>
        </form>

        {/* What you get — shown on signup */}
        {mode === 'signup' && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Mitä saat</p>
            <ul className="flex flex-col gap-1.5">
              {[
                'Profiilisivu feedissä (nimi, ikä, kaupunki, bio)',
                'Esittelyvideo — vaihda milloin tahansa',
                'Yritykset voivat ottaa sinuun yhteyttä',
                'Näe kaikki yhteydenotot dashboardilla',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-gray-500">
                  <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#F47B8A' }} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

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
            {mode === 'signup'
              ? 'Onko sinulla jo tili? Kirjaudu'
              : 'Ei tiliä? Luo ilmainen profiili'}
          </button>
        </div>
      </div>

      <Link href="/" className="mt-6 text-sm text-gray-500 hover:text-gray-700">
        ← Takaisin feediin
      </Link>
    </div>
  )
}
