import type { Metadata } from 'next'
import './globals.css'
import { SITE_NAME, SITE_DESCRIPTION } from '@/lib/constants'

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vendor-uiu3.vercel.app'

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} — Discover Deals You'll Love`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  metadataBase: new URL(siteUrl),
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: `${SITE_NAME} — Discover Deals You'll Love`,
    description: 'Curated finds from independent brands at prices you won\'t believe. New drops daily.',
    type: 'website',
    url: siteUrl,
    siteName: SITE_NAME,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Vender — Discover Deals You\'ll Love',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Discover Deals You'll Love`,
    description: 'Curated finds from independent brands at prices you won\'t believe. New drops daily.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  )
}
