'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/', label: 'Biblioteca' },
  { href: '/vocabulario', label: 'Vocabulario' },
]

export function SiteHeader({ actions }: { actions?: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5 md:px-8">
        <Link href="/" className="flex items-baseline gap-1.5" aria-label="Folio, inicio">
          <span className="font-serif text-2xl font-semibold tracking-tight">Folio</span>
          <span aria-hidden className="size-1.5 rounded-full bg-primary" />
        </Link>
        <nav aria-label="Principal" className="flex items-center gap-1">
          {LINKS.map((link) => {
            const active = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-full px-3 py-1.5 text-sm transition-colors',
                  active ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      </div>
    </header>
  )
}
