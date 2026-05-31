import { createDirectUpload } from '@/lib/cloudflare'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Kirjaudu sisään ensin — sessio vanhentunut' }, { status: 401 })
  }

  if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_STREAM_API_TOKEN) {
    return NextResponse.json({ error: 'Cloudflare-ympäristömuuttujat puuttuvat palvelimelta' }, { status: 500 })
  }

  try {
    const { uploadURL, uid } = await createDirectUpload()
    return NextResponse.json({ uploadURL, uid })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload URL creation failed'
    console.error('upload-url error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
