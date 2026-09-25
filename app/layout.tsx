import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Literata } from 'next/font/google'
import { ThemeSync } from '@/components/theme-sync'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const literata = Literata({
  subsets: ['latin'],
  variable: '--font-literata',
  display: 'swap',
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  title: 'Folio — Lee en inglés, entiende en español',
  description:
    'Folio es un lector EPUB premium para aprender inglés leyendo. Selecciona cualquier palabra, expresión o frase y obtén al instante una traducción contextual y natural.',
  applicationName: 'Folio',
  generator: 'v0.app',
  appleWebApp: { capable: true, title: 'Folio', statusBarStyle: 'default' },
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f6f2ea',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" data-theme="paper" className={`${inter.variable} ${literata.variable}`}>
      <body className="min-h-dvh antialiased">
        <ThemeSync />
        {children}
        <Toaster position="top-center" />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
