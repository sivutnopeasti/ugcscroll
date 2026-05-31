import { createClient } from '@/lib/supabase/server'
import VideoFeed from '@/components/VideoFeed'
import type { Profile } from '@/lib/types'

export const revalidate = 60 // ISR — revalidate every 60 seconds

export default async function HomePage() {
  const supabase = await createClient()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .not('cloudflare_video_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(8)

  return <VideoFeed initialProfiles={(profiles ?? []) as Profile[]} />
}
