import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { Profile, ContactInsert } from '@/lib/types'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { profileId, senderName, senderEmail, company, message } = body

  if (!profileId || !senderName || !senderEmail || !message) {
    return NextResponse.json({ error: 'Pakollisia kenttiä puuttuu' }, { status: 400 })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(senderEmail)) {
    return NextResponse.json({ error: 'Virheellinen sähköpostiosoite' }, { status: 400 })
  }

  const supabase = await createClient()

  // Fetch profile to verify it exists and get creator name
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('id', profileId)
    .single()

  if (profileError || !profileData) {
    return NextResponse.json({ error: 'Profiilia ei löydy' }, { status: 404 })
  }

  const profile = profileData as unknown as Pick<Profile, 'id' | 'name'>

  // Save to DB
  const contactInsert: ContactInsert = {
    profile_id: profileId,
    sender_name: senderName,
    sender_email: senderEmail,
    company: company || null,
    message,
  }

  const { error: insertError } = await supabase
    .from('contact_requests')
    .insert(contactInsert as never)

  if (insertError) {
    console.error('Contact insert error:', insertError)
    return NextResponse.json({ error: 'Tallennus epäonnistui' }, { status: 500 })
  }

  // Send email notification
  if (process.env.RESEND_API_KEY && process.env.CONTACT_TO_EMAIL) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'noreply@ugcsuomi.fi',
        to: process.env.CONTACT_TO_EMAIL,
        subject: `Uusi yhteydenotto: ${profile.name} / ${senderName}`,
        html: `
          <h2>Uusi yhteydenotto UGC Suomi -alustalta</h2>
          <p><strong>Sisällöntuottaja:</strong> ${profile.name}</p>
          <hr/>
          <p><strong>Lähettäjä:</strong> ${senderName}</p>
          <p><strong>Sähköposti:</strong> ${senderEmail}</p>
          ${company ? `<p><strong>Yritys:</strong> ${company}</p>` : ''}
          <p><strong>Viesti:</strong></p>
          <p>${message.replace(/\n/g, '<br/>')}</p>
        `,
      })
    } catch (emailErr) {
      console.error('Resend error (non-fatal):', emailErr)
    }
  }

  return NextResponse.json({ success: true })
}
