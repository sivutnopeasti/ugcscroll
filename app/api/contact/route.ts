import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import type { Profile, ContactInsert } from '@/lib/types'

// HTML-sähköpostipohjana käytetty ugcsuomi.fi-brändiä (vaaleanpunainen, Arial, footer)
function buildContactEmail({
  creatorName,
  senderName,
  senderEmail,
  company,
  message,
}: {
  creatorName: string
  senderName: string
  senderEmail: string
  company: string | null
  message: string
}): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const companyRow = company
    ? `<p><strong>Yritys:</strong> ${esc(company)}</p>`
    : ''

  return `<!DOCTYPE html>
<html lang="fi">
<head>
  <meta charset="UTF-8">
  <title>Uusi yhteydenotto – UGC Suomi</title>
  <style>
    body { font-family: Arial, sans-serif; background-color: #ffffff; color: #000000; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 24px; border-radius: 12px; }
    h1 { color: #000000; font-size: 24px; margin-bottom: 12px; }
    p { line-height: 1.6; font-size: 15px; margin-bottom: 16px; }
    a { color: #F496A4; text-decoration: underline; }
    .highlight-box {
      background-color: #fff5f6;
      border-radius: 12px;
      padding: 20px;
      margin-top: 24px;
      border: 1px solid #f3c5cb;
    }
    .highlight-box p { margin: 6px 0; }
    .message-box {
      background-color: #f9f9f9;
      border-left: 4px solid #F496A4;
      border-radius: 4px;
      padding: 16px 20px;
      margin-top: 8px;
      font-style: italic;
      white-space: pre-wrap;
    }
    .cta-button {
      display: inline-block;
      background-color: #F496A4;
      color: #ffffff;
      padding: 12px 24px;
      border-radius: 24px;
      text-decoration: none;
      font-weight: bold;
      margin-top: 12px;
    }
    .footer {
      background-color: #F496A4;
      color: #ffffff;
      text-align: center;
      padding: 24px;
      font-size: 13px;
      margin-top: 40px;
      border-radius: 0 0 12px 12px;
    }
    .social-icons img { width: 28px; height: 28px; margin: 0 6px; }
    .logo img { width: 90px; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Hei ${esc(creatorName)} 👋</h1>
    <p>Sinulle on saapunut uusi yhteydenotto <strong>UGC Scroll</strong> -alustalta.</p>

    <div class="highlight-box">
      <p><strong>Lähettäjä:</strong> ${esc(senderName)}</p>
      <p><strong>Sähköposti:</strong> <a href="mailto:${esc(senderEmail)}">${esc(senderEmail)}</a></p>
      ${companyRow}
      <p style="margin-top:12px;"><strong>Viesti:</strong></p>
      <div class="message-box">${esc(message)}</div>
    </div>

    <p style="margin-top: 24px;">
      Voit vastata suoraan lähettäjälle klikkaamalla alla olevaa nappia tai vastaamalla tähän sähköpostiin.
    </p>
    <a href="mailto:${esc(senderEmail)}?subject=Re%3A%20UGC%20Scroll%20-yhteydenotto" class="cta-button">
      Vastaa ${esc(senderName)}:lle →
    </a>

    <p style="font-size:13px; margin-top:32px; color:#666;">
      Tämä viesti on lähetetty automaattisesti <a href="https://ugc-scroll2.vercel.app">UGC Scroll</a> -alustan kautta.
    </p>
  </div>
  <div class="footer">
    <div class="social-icons">
      <a href="https://www.instagram.com/ugcsuomi/"><img src="https://ugcsuomi.fi/wp-content/uploads/2025/08/instagram-new-v2.png" alt="Instagram"></a>
      <a href="https://www.facebook.com/profile.php?id=61572335522966"><img src="https://ugcsuomi.fi/wp-content/uploads/2025/08/facebook-app-round-white-icon.png" alt="Facebook"></a>
    </div>
    <div class="logo">
      <a href="https://ugcsuomi.fi"><img src="https://ugcsuomi.fi/wp-content/uploads/2024/12/2-5.png" alt="UGC Suomi logo"></a>
    </div>
    <p style="margin-top:12px;">© UGC Suomi | <a href="https://ugcsuomi.fi" style="color:#fff;">ugcsuomi.fi</a></p>
  </div>
</body>
</html>`
}

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

  // Hae profiili (nimi + user_id)
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, user_id')
    .eq('id', profileId)
    .single()

  if (profileError || !profileData) {
    return NextResponse.json({ error: 'Profiilia ei löydy' }, { status: 404 })
  }

  const profile = profileData as unknown as Pick<Profile, 'id' | 'name'> & { user_id: string }

  // Tallenna yhteydenotto kantaan
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

  // Hae sisällöntuottajan sähköposti Supabase Auth:sta (service role)
  let creatorEmail: string | null = null
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (supabaseUrl && serviceKey) {
      const admin = createAdmin(supabaseUrl, serviceKey)
      const { data: authUser } = await admin.auth.admin.getUserById(profile.user_id)
      creatorEmail = authUser?.user?.email ?? null
    }
  } catch (e) {
    console.error('Could not fetch creator email:', e)
  }

  // Lähetä sähköposti SMTP:n kautta
  const smtpHost = process.env.SMTP_HOST
  const smtpPort = parseInt(process.env.SMTP_PORT ?? '465', 10)
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS
  const smtpFrom = process.env.SMTP_FROM ?? 'tuki@ugcsuomi.fi'
  const copyTo   = process.env.SMTP_COPY_TO ?? 'tuki@ugcsuomi.fi'

  if (smtpHost && smtpUser && smtpPass && creatorEmail) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      })

      const html = buildContactEmail({
        creatorName: profile.name ?? 'Sisällöntuottaja',
        senderName,
        senderEmail,
        company: company || null,
        message,
      })

      await transporter.sendMail({
        from: `"UGC Suomi" <${smtpFrom}>`,
        to: creatorEmail,
        cc: copyTo,
        replyTo: senderEmail,
        subject: `Uusi yhteydenotto – ${company ? company + ' / ' : ''}${senderName}`,
        html,
      })
    } catch (emailErr) {
      console.error('SMTP send error (non-fatal):', emailErr)
    }
  } else {
    if (!creatorEmail) console.warn('contact: creator email not found for user_id', profile.user_id)
    if (!smtpHost)   console.warn('contact: SMTP_HOST not configured')
  }

  return NextResponse.json({ success: true })
}
