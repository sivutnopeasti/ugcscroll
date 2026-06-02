import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types'

export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Kirjautuminen vaaditaan' }, { status: 401 })
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ugc-scroll2.vercel.app'

  if (!stripeSecret) {
    return NextResponse.json({ error: 'Stripe ei ole konfiguroitu' }, { status: 500 })
  }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const profile = profileData as Pick<Profile, 'stripe_customer_id'> | null
  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: 'Stripe-asiakastunnusta ei löydy' }, { status: 404 })
  }

  const stripe = new Stripe(stripeSecret)
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${appUrl}/creator/dashboard`,
  })

  return NextResponse.json({ url: session.url })
}
