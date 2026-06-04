import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

// POST /api/sync-creator
// Called by WordPress save_post hook when a ugc_sisallontuottaja CPT is saved.
// Upserts creator data into the profiles table keyed on wp_user_id.
//
// Required header: X-Sync-Secret: <SYNC_SECRET env var>
// Body JSON: { wp_user_id, wp_post_id, email, name, is_premium? }

export async function POST(req: NextRequest) {
  // Verify shared secret
  const secret = process.env.SYNC_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'SYNC_SECRET not configured' }, { status: 500 })
  }
  if (req.headers.get('x-sync-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Supabase service role not configured' }, { status: 500 })
  }

  let body: {
    wp_user_id: number; wp_post_id: number; email: string; name: string
    is_premium?: boolean; age?: number | null; city?: string | null; bio?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { wp_user_id, wp_post_id, email, name, is_premium, age, city, bio } = body
  if (!wp_user_id || !wp_post_id || !email || !name) {
    return NextResponse.json({ error: 'Missing required fields: wp_user_id, wp_post_id, email, name' }, { status: 400 })
  }

  // Build optional profile fields — only include keys that were explicitly sent
  const profileFields: Record<string, unknown> = {}
  if (age !== undefined)        profileFields.age  = age  ?? null
  if (city !== undefined)       profileFields.city = city ?? null
  if (bio !== undefined)        profileFields.bio  = bio  ?? null

  const supabase = createSupabaseAdmin(supabaseUrl, serviceRoleKey)

  // Try to find existing profile by wp_user_id first, then by email
  const { data: existingByWp } = await supabase
    .from('profiles')
    .select('id, user_id')
    .eq('wp_user_id', wp_user_id)
    .maybeSingle()

  if (existingByWp) {
    await supabase
      .from('profiles')
      .update({
        wp_post_id, name,
        ...(is_premium !== undefined ? { is_premium } : {}),
        ...profileFields,
      } as never)
      .eq('id', existingByWp.id)

    return NextResponse.json({ ok: true, action: 'updated', profile_id: existingByWp.id })
  }

  // No profile with this wp_user_id — check by email via auth.users
  // (Creator may have signed up on Supabase before being synced from WP)
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  const matchedUser = authUsers?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())

  if (matchedUser) {
    // Found Supabase auth user — upsert their profile
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', matchedUser.id)
      .maybeSingle()

    if (existingProfile) {
      await supabase
        .from('profiles')
        .update({ wp_user_id, wp_post_id, name, ...(is_premium !== undefined ? { is_premium } : {}), ...profileFields } as never)
        .eq('id', existingProfile.id)
      return NextResponse.json({ ok: true, action: 'linked', profile_id: existingProfile.id })
    } else {
      // Auth user exists but no profile row yet
      const { data: inserted } = await supabase
        .from('profiles')
        .insert({ user_id: matchedUser.id, wp_user_id, wp_post_id, name, is_premium: is_premium ?? false, ...profileFields } as never)
        .select('id')
        .single()
      return NextResponse.json({ ok: true, action: 'created', profile_id: inserted?.id })
    }
  }

  // No match at all — store minimal record without user_id
  // (Creator will be linked when they sign up on Supabase)
  // NOTE: profiles requires user_id (NOT NULL), so we log and return OK
  // The profile will be created on Supabase signup via the handle_new_user trigger
  console.log(`sync-creator: no Supabase user found for wp_user_id=${wp_user_id} email=${email} — will link on signup`)
  return NextResponse.json({ ok: true, action: 'pending_signup', note: 'Creator must sign up on UGC portal to complete link' })
}
