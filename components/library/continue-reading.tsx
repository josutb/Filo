import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { BookMeta } from '@/lib/db'
import { BookCover } from './book-cover'

export function ContinueReading({ book }: { book: BookMeta }) {
  const pct = Math.round(book.progress * 100)
  return (
    <section aria-labelledby="continue-heading">
      <Link
        href={`/read/${book.id}`}
        className="group flex items-center gap-6 rounded-2xl border border-border/70 bg-card p-5 transition-colors hover:border-primary/40 md:gap-8 md:p-7"
      >
        <BookCover title={book.title} author={book.author} blob={book.coverBlob} className="w-24 shrink-0 md:w-32" />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <p id="continue-heading" className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Continuar leyendo
          </p>
          <div>
            <h2 className="font-serif text-2xl font-semibold leading-tight tracking-tight text-balance md:text-3xl">
              {book.title}
            </h2>
            {book.author && <p className="mt-1 text-sm text-muted-foreground">{book.author}</p>}
          </div>
          <div className="flex max-w-sm items-center gap-3">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(pct, 1)}%` }} />
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
          </div>
        </div>
        <ArrowRight className="hidden size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground sm:block" />
      </Link>
    </section>
  )
}
