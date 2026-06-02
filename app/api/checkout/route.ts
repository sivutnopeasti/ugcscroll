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
  const priceId = process.env.STRIPE_PRICE_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ugc-scroll2.vercel.app'

  if (!stripeSecret || !priceId) {
    return NextResponse.json({ error: 'Stripe ei ole konfiguroitu' }, { status: 500 })
  }

  const stripe = new Stripe(stripeSecret)

  // Load existing profile to get stripe_customer_id
  const { data: profileData } = await supabase
    .from('profiles')
    .select('stripe_customer_id, name')
    .eq('user_id', user.id)
    .maybeSingle()

  const profile = profileData as Pick<Profile, 'stripe_customer_id' | 'name'> | null
  let customerId = profile?.stripe_customer_id ?? undefined

  // Create Stripe customer if not yet exists
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: profile?.name ?? undefined,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id

    // Save customer ID immediately so webhook can find the profile
    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId } as never)
      .eq('user_id', user.id)
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: user.id, // Supabase user UUID as fallback lookup
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/creator/dashboard?subscription=success`,
    cancel_url: `${appUrl}/creator/dashboard`,
    subscription_data: {
      metadata: { supabase_user_id: user.id },
    },
  })

  return NextResponse.json({ url: session.url })
}
