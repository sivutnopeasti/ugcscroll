# UGC Scroll — ugcsuomi.fi

TikTok-tyylinen vertikaalinen videofeed UGC-sisällöntuottajille. Rakennettu Next.js 16 + Supabase + Cloudflare Stream -teknologioilla.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **Tailwind CSS v4**
- **Supabase** — Auth + PostgreSQL
- **Cloudflare Stream** — HLS-videostreaming
- **Resend** — yhteydenottosähköpostit
- **Vercel** — hosting

## Ominaisuudet

- TikTok-tyylinen snap-scroll feed (`scroll-snap-type: y mandatory`)
- HLS-videotoisto HLS.js:llä (natiivi HLS Safarissa/iOS:ssa)
- Tykkäykset tallentuvat localStorageen — ei kirjautumista vaadittu
- Yhteydenottolomake modal
- Creator-dashboard: profiilin hallinta + videon lataus Cloudflare Streamiin
- Supabase Auth -kirjautuminen sisällöntuottajille

## Käynnistys

```bash
npm install
cp .env.local.example .env.local
# Täytä ympäristömuuttujat
npm run dev
```

## Ympäristömuuttujat

| Muuttuja | Kuvaus |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase projektin URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |
| `CLOUDFLARE_STREAM_API_TOKEN` | Cloudflare Stream API Token |
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM_EMAIL` | Lähettäjän sähköposti |
| `CONTACT_TO_EMAIL` | Yhteydenottosähköpostien vastaanottaja |

## Supabase-migraatio

Aja `supabase/migrations/001_initial.sql` Supabase SQL editorissa.

## Cloudflare Stream

1. Luo Cloudflare-tili ja ota Stream käyttöön
2. Luo API Token: Account Settings → API Tokens → "Edit Cloudflare Stream" -oikeudet
3. Kopioi Account ID Cloudflare dashboardista
