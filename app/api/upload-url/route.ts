import { createDirectUpload } from '@/lib/cloudflare'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { uploadURL, uid } = await createDirectUpload()
    return NextResponse.json({ uploadURL, uid })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload URL creation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
