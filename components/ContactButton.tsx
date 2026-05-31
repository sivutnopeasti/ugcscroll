'use client'

import { useState } from 'react'
import type { Profile } from '@/lib/types'
import ContactModal from './ContactModal'

export default function ContactButton({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3.5 rounded-2xl font-semibold text-white text-base flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg, #F47B8A, #C084FC)' }}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        Ota yhteyttä
      </button>
      {open && <ContactModal profile={profile} onClose={() => setOpen(false)} />}
    </>
  )
}
