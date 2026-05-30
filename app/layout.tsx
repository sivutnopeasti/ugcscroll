import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

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
  themeColor: '#000000',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fi" className={geist.variable}>
      <body>{children}</body>
    </html>
  )
}
