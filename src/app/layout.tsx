import type { Metadata } from 'next'
import { Cormorant_Garamond, Montserrat } from 'next/font/google'
import { AuthProvider } from '@/context/AuthContext'
import { CartProvider } from '@/context/CartContext'
import { WishlistProvider } from '@/context/WishlistContext'
import { SearchProvider } from '@/context/SearchContext'
import SiteShell from '@/components/layout/SiteShell'
import './globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
})

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-montserrat',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Minzoshop — Luxury Niche & Designer Perfumes',
    template: '%s | Minzoshop',
  },
  description:
    'Discover the world\'s most coveted niche and designer fragrances. Authentic scents, honest prices, always free shipping.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  ),
  openGraph: {
    type: 'website',
    siteName: 'Minzoshop',
    title: 'Minzoshop — Luxury Niche & Designer Perfumes',
    description:
      'Authentic niche and designer fragrances, curated for the discerning few.',
  },
  twitter: { card: 'summary_large_image' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${montserrat.variable}`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/remixicon@4.5.0/fonts/remixicon.css"
        />
        <script
          type="text/javascript"
          src="https://sandbox.web.squarecdn.com/v1/square.js"
          async
        />
      </head>
      <body className="font-sans bg-white text-ink antialiased">
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <SearchProvider>
                <SiteShell>{children}</SiteShell>
              </SearchProvider>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
