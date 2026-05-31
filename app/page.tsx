import { createClient } from '@/lib/supabase/server'
import VideoFeed from '@/components/VideoFeed'
import type { Profile } from '@/lib/types'

export const revalidate = 0 // always fresh — random order changes every load

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default async function HomePage() {
  const supabase = await createClient()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .not('cloudflare_video_id', 'is', null)
    .limit(200)

  return <VideoFeed initialProfiles={shuffle((profiles ?? []) as Profile[])} />
}
