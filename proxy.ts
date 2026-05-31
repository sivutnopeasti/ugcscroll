import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect creator dashboard — redirect to login if not authenticated
  if (request.nextUrl.pathname.startsWith('/creator/dashboard') && !user) {
    return NextResponse.redirect(new URL('/creator/login', request.url))
  }

  // Redirect logged-in users away from login page
  if (request.nextUrl.pathname === '/creator/login' && user) {
    return NextResponse.redirect(new URL('/creator/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/creator/:path*', '/auth/:path*'],
}
