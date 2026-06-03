import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'magiclink' | 'email' | null

  const next = searchParams.get('next') ?? '/creator/dashboard'
  const redirectTo = `${origin}${next.startsWith('/') ? next : '/' + next}`

  const supabase = await createClient()

  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  } else if (token_hash && type) {
    // Used by WordPress SSO flow (/auth/wp)
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (error) {
      console.error('SSO callback verifyOtp error:', error.message)
      return NextResponse.redirect(`${origin}/creator/login?error=sso_failed`)
    }
  }

  return NextResponse.redirect(redirectTo)
}
