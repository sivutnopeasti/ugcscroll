import type { Metadata, Viewport } from 'next'
import { Inter, Lexend_Deca } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const lexend = Lexend_Deca({
  subsets: ['latin'],
  variable: '--font-lexend',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'UGC Suomi — Löydä sisällöntuottajasi',
  description: 'Selaa UGC-sisällöntuottajien profiileja ja löydä täydellinen yhteistyökumppani brändillesi.',
  openGraph: {
    title: 'UGC Suomi',
    description: 'Löydä UGC-sisällöntuottajasi',
    siteName: 'UGC Suomi',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#F496A5',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fi" className={`${inter.variable} ${lexend.variable}`}>
      <body>{children}</body>
    </html>
  )
}
