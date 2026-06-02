import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

// Disable body parsing — Stripe needs raw bytes for signature verification
export const config = { api: { bodyParser: false } }

// Helper: update WordPress ACF field via REST API
async function updateWpPremium(wpPostId: number, isPremium: boolean) {
  const siteUrl = process.env.WP_SITE_URL
  const appUser = process.env.WP_APP_USER
  const appPassword = process.env.WP_APP_PASSWORD
  const fieldKey = process.env.WP_ACF_FIELD_KEY ?? 'premium_tilaus_aktiivinen'

  if (!siteUrl || !appUser || !appPassword) {
    console.warn('WP credentials not configured — skipping ACF update')
    return
  }

  const credentials = Buffer.from(`${appUser}:${appPassword}`).toString('base64')

  const res = await fetch(`${siteUrl}/wp-json/wp/v2/ugc_sisallontuottaja/${wpPostId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify({
      acf: { [fieldKey]: isPremium ? '1' : '0' },
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error(`WP ACF update failed (post ${wpPostId}):`, res.status, text)
  } else {
    console.log(`WP ACF updated: post ${wpPostId} → premium=${isPremium}`)
  }
}

export async function POST(req: NextRequest) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!stripeSecret || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Supabase service role not configured' }, { status: 500 })
  }

  const stripe = new Stripe(stripeSecret)
  const supabase = createSupabaseAdmin(supabaseUrl, serviceRoleKey)

  // Verify Stripe signature
  const body = await req.text()
  const signature = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Stripe signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Helper: find profile by stripe_customer_id or client_reference_id (Supabase user UUID)
  async function findProfile(customerId?: string, supabaseUserId?: string) {
    if (customerId) {
      const { data } = await supabase
        .from('profiles')
        .select('id, user_id, wp_post_id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle()
      if (data) return data
    }
    if (supabaseUserId) {
      const { data } = await supabase
        .from('profiles')
        .select('id, user_id, wp_post_id')
        .eq('user_id', supabaseUserId)
        .maybeSingle()
      if (data) return data
    }
    return null
  }

  // Helper: set premium status in Supabase + WP
  async function setPremium(
    customerId: string | undefined,
    supabaseUserId: string | undefined,
    subscriptionId: string | undefined,
    isPremium: boolean
  ) {
    const profile = await findProfile(customerId, supabaseUserId)
    if (!profile) {
      console.warn('Profile not found for customer', customerId, '/ user', supabaseUserId)
      return
    }

    await supabase
      .from('profiles')
      .update({
        is_premium: isPremium,
        stripe_customer_id: customerId ?? null,
        stripe_subscription_id: isPremium ? (subscriptionId ?? null) : null,
      } as never)
      .eq('id', profile.id)

    if (profile.wp_post_id) {
      await updateWpPremium(profile.wp_post_id, isPremium)
    }
  }

  // Handle events
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode !== 'subscription') break
      await setPremium(
        session.customer as string | undefined,
        session.client_reference_id ?? undefined,
        session.subscription as string | undefined,
        true
      )
      break
    }

    case 'invoice.payment_succeeded': {
      // Renewal — keep premium active
      const invoice = event.data.object as Stripe.Invoice
      console.log('Invoice paid — subscription renewed for customer', invoice.customer)
      if (invoice.customer) {
        await setPremium(invoice.customer as string, undefined, undefined, true)
      }
      break
    }

    // Stripe v2 API: invoice_payment.paid (newer API version)
    case 'invoice_payment.paid': {
      const invoicePayment = event.data.object as { invoice: string; status: string }
      console.log('invoice_payment.paid received — fetching invoice to resolve customer')
      if (invoicePayment.invoice) {
        const fullInvoice = await stripe.invoices.retrieve(invoicePayment.invoice)
        if (fullInvoice.customer) {
          await setPremium(fullInvoice.customer as string, undefined, undefined, true)
        }
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      await setPremium(
        invoice.customer as string | undefined,
        undefined,
        undefined,
        false
      )
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await setPremium(
        sub.customer as string | undefined,
        (sub.metadata?.supabase_user_id) ?? undefined,
        undefined,
        false
      )
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      // Cancel at period end — still active, do nothing
      // Active → becomes isPremium based on status
      const isPremium = sub.status === 'active' || sub.status === 'trialing'
      await setPremium(
        sub.customer as string | undefined,
        (sub.metadata?.supabase_user_id) ?? undefined,
        sub.id,
        isPremium
      )
      break
    }

    default:
      // Ignore unhandled events
      break
  }

  return NextResponse.json({ received: true })
}
