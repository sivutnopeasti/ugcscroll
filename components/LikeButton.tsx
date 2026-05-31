'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface LikeButtonProps {
  profileId: string
  initialCount: number
}

const STORAGE_KEY = 'ugc_liked_profiles'

function getLiked(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function setLiked(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
}

export function isLikedProfile(profileId: string): boolean {
  return getLiked().includes(profileId)
}

export default function LikeButton({ profileId, initialCount }: LikeButtonProps) {
  const [liked, setLikedState] = useState(false)
  const [count, setCount] = useState(initialCount)
  const [pending, setPending] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    setLikedState(getLiked().includes(profileId))
  }, [profileId])

  const toggle = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (pending) return

    setPending(true)
    const liked_ids = getLiked()
    const isCurrentlyLiked = liked_ids.includes(profileId)
    const newLiked = !isCurrentlyLiked

    // Optimistic UI
    setLikedState(newLiked)
    setCount((c) => c + (newLiked ? 1 : -1))

    // Update localStorage
    if (newLiked) {
      setLiked([...liked_ids, profileId])
    } else {
      setLiked(liked_ids.filter((id) => id !== profileId))
    }

    // Update Supabase
    const { error } = await supabase.rpc('increment_likes', {
      p_id: profileId,
      delta: newLiked ? 1 : -1,
    } as never)

    if (error) {
      // Revert on error
      setLikedState(isCurrentlyLiked)
      setCount((c) => c + (isCurrentlyLiked ? 1 : -1))
      if (isCurrentlyLiked) {
        setLiked([...getLiked(), profileId])
      } else {
        setLiked(getLiked().filter((id) => id !== profileId))
      }
    }

    setPending(false)
  }, [pending, profileId, supabase])

  return (
    <button
      onClick={toggle}
      className="flex flex-col items-center gap-1"
      aria-label={liked ? 'Poista tykkäys' : 'Tykkää'}
      disabled={pending}
    >
      <div className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all duration-200 ${
        liked
          ? 'border-brand-pink bg-brand-pink/30'
          : 'border-white/30 bg-white/20 backdrop-blur-sm'
      }`}>
        <svg
          className={`w-6 h-6 transition-transform duration-200 ${liked ? 'scale-110' : 'scale-100'}`}
          style={{ color: liked ? '#F47B8A' : 'white' }}
          fill={liked ? 'currentColor' : 'none'}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={liked ? 0 : 2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      </div>
      <span className="text-white text-xs font-medium" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
        Tykkää
      </span>
    </button>
  )
}
