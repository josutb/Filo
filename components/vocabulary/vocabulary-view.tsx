'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Search, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { SiteHeader } from '@/components/site-header'
import { deleteVocab } from '@/lib/db'
import { useVocab } from '@/lib/hooks'

const dateFormat = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' })

export function VocabularyView() {
  const { data: entries, isLoading, mutate } = useVocab()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!entries) return []
    if (!q) return entries
    return entries.filter(
      (e) => e.text.toLowerCase().includes(q) || e.translation.toLowerCase().includes(q),
    )
  }, [entries, query])

  const remove = async (id: string) => {
    await deleteVocab(id)
    mutate()
  }

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 pt-12 pb-24 md:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-4xl font-semibold tracking-tight">Vocabulario</h1>
            <p className="mt-2 text-muted-foreground">
              Palabras y expresiones que has guardado mientras leías.
            </p>
          </div>
          {entries && entries.length > 0 && (
            <label className="relative block sm:w-64">
              <span className="sr-only">Buscar en tu vocabulario</span>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar…"
                className="h-10 rounded-full bg-card pl-9"
              />
            </label>
          )}
        </div>

        {isLoading ? (
          <div className="mt-10 flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="folio-shimmer h-24 rounded-2xl" />
            ))}
          </div>
        ) : !entries || entries.length === 0 ? (
          <div className="mt-14 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
            <p className="font-serif text-xl">Aún no has guardado nada</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Mientras lees, selecciona una expresión y pulsa «Guardar» en la traducción para repasarla aquí.
            </p>
            <Link href="/" className="mt-6 inline-block text-sm font-medium text-primary underline underline-offset-4">
              Ir a la biblioteca
            </Link>
          </div>
        ) : (
          <ul className="mt-10 flex flex-col divide-y divide-border border-y border-border">
            {filtered.map((entry) => (
              <li key={entry.id} className="group flex gap-4 py-6">
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p lang="en" className="font-serif text-xl font-semibold">
                      {entry.text}
                    </p>
                    {entry.kind && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                        {entry.kind}
                      </span>
                    )}
                  </div>
                  <p lang="es" className="text-base">{entry.translation}</p>
                  {entry.note && <p className="text-sm leading-relaxed text-muted-foreground">{entry.note}</p>}
                  {entry.context && (
                    <p lang="en" className="mt-1 line-clamp-2 border-l-2 border-border pl-3 font-serif text-sm text-muted-foreground italic">
                      {entry.context}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {entry.bookId ? (
                      <Link href={`/read/${entry.bookId}`} className="hover:text-foreground hover:underline">
                        {entry.bookTitle}
                      </Link>
                    ) : (
                      entry.bookTitle
                    )}
                    {' · '}
                    {dateFormat.format(entry.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(entry.id)}
                  aria-label={`Eliminar ${entry.text}`}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="py-10 text-center text-sm text-muted-foreground">Sin resultados para «{query}».</li>
            )}
          </ul>
        )}
      </main>
    </div>
  )
}
