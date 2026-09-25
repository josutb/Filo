'use client'

import Link from 'next/link'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { ArrowLeft, ChevronLeft, ChevronRight, Maximize, Minimize } from 'lucide-react'
import { updateBook, type BookMeta } from '@/lib/db'
import type { EpubBook } from '@/lib/epub'
import { useBooks, useSettings } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import { ReaderSettingsButton } from './reader-settings'
import { TocSheet } from './toc-sheet'
import { TranslationCard } from './translation-card'
import { useSelectionTranslation } from './use-selection-translation'

type PendingScroll = { type: 'ratio'; value: number } | { type: 'fragment'; id: string } | { type: 'top' }

const WIDTHS = { narrow: '34rem', normal: '40rem', wide: '48rem' } as const

const iconButton =
  'flex size-10 items-center justify-center rounded-full text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2'

export function ReaderSession({ bookId, book, meta }: { bookId: string; book: EpubBook; meta: BookMeta }) {
  const total = book.spine.length
  const initialChapter = Math.min(meta.location?.chapter ?? 0, total - 1)
  const [chapter, setChapter] = useState(initialChapter)
  const [ratio, setRatio] = useState(meta.location?.ratio ?? 0)
  const [chromeVisible, setChromeVisible] = useState(true)
  const pendingScroll = useRef<PendingScroll>({ type: 'ratio', value: meta.location?.ratio ?? 0 })
  const proseRef = useRef<HTMLDivElement>(null)
  const saveTimer = useRef<number | undefined>(undefined)
  const { settings } = useSettings()
  const { mutate: mutateBooks } = useBooks()

  const { data: html, error } = useSWR(['chapter', bookId, chapter], () => book.getChapterHtml(chapter), {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    revalidateOnReconnect: false,
  })

  const { state: translation, close, retry } = useSelectionTranslation(proseRef, book.title)

  const persist = useCallback(
    (ch: number, r: number) => {
      window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => {
        const location = { chapter: ch, ratio: r }
        const progress = Math.min(1, (ch + r) / total)
        meta.location = location
        meta.progress = progress
        updateBook(bookId, { location, progress, lastOpenedAt: Date.now() })
          .then(() => mutateBooks())
          .catch(() => {})
      }, 500)
    },
    [bookId, meta, mutateBooks, total],
  )

  const goTo = useCallback(
    (next: number, fragment?: string) => {
      if (next < 0 || next >= total) return
      close()
      if (next === chapter) {
        if (fragment) document.getElementById(`epub-${fragment}`)?.scrollIntoView({ block: 'start' })
        else window.scrollTo({ top: 0 })
        return
      }
      pendingScroll.current = fragment ? { type: 'fragment', id: fragment } : { type: 'top' }
      setChapter(next)
      setRatio(0)
      setChromeVisible(true)
      persist(next, 0)
    },
    [chapter, close, persist, total],
  )

  useLayoutEffect(() => {
    if (html === undefined) return
    const pending = pendingScroll.current
    const apply = () => {
      if (pending.type === 'fragment') {
        const el = document.getElementById(`epub-${pending.id}`)
        if (el) {
          el.scrollIntoView({ block: 'start' })
          window.scrollBy({ top: -72 })
          return
        }
        window.scrollTo({ top: 0 })
      } else if (pending.type === 'ratio') {
        const max = document.documentElement.scrollHeight - window.innerHeight
        window.scrollTo({ top: Math.max(0, pending.value * max) })
      } else {
        window.scrollTo({ top: 0 })
      }
    }
    apply()
    requestAnimationFrame(apply)
    pendingScroll.current = { type: 'top' }

    if (chapter + 1 < total) {
      const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 400))
      idle(() => {
        book.getChapterHtml(chapter + 1).catch(() => {})
      })
    }
  }, [html, chapter, book, total])

  useEffect(() => {
    let lastY = window.scrollY
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const y = window.scrollY
        const max = document.documentElement.scrollHeight - window.innerHeight
        const r = max > 0 ? Math.min(1, Math.max(0, y / max)) : 1
        setRatio(r)
        persist(chapter, r)
        const delta = y - lastY
        if (y < 60 || y >= max - 4) setChromeVisible(true)
        else if (delta > 8) setChromeVisible(false)
        else if (delta < -8) setChromeVisible(true)
        lastY = y
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
    }
  }, [chapter, persist])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || translation) return
      const target = e.target as HTMLElement
      if (target.closest('input, textarea, [role="dialog"]')) return
      if (e.key === 'ArrowRight') goTo(chapter + 1)
      if (e.key === 'ArrowLeft') goTo(chapter - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [chapter, goTo, translation])

  useEffect(() => () => window.clearTimeout(saveTimer.current), [])

  const [immersive, setImmersive] = useState(false)

  const enterImmersive = () => {
    setImmersive(true)
    document.documentElement.requestFullscreen?.().catch(() => {})
  }

  const exitImmersive = () => {
    setImmersive(false)
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  }

  useEffect(() => {
    const onFullscreen = () => {
      if (!document.fullscreenElement) setImmersive(false)
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) setImmersive(false)
    }
    document.addEventListener('fullscreenchange', onFullscreen)
    window.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreen)
      window.removeEventListener('keydown', onEsc)
    }
  }, [])

  const onContentClick = (e: React.MouseEvent) => {
    const link = (e.target as Element).closest('a')
    if (!link) return
    const target = link.getAttribute('data-chapter')
    if (target !== null) {
      e.preventDefault()
      goTo(Number(target), link.getAttribute('data-fragment') ?? undefined)
    } else if (link.getAttribute('href') === '#') {
      e.preventDefault()
    }
  }

  const overall = Math.round(Math.min(1, (chapter + ratio) / total) * 100)
  const chapterLabel = book.chapterLabel(chapter)
  const nextLabel = book.chapterLabel(chapter + 1)

  return (
    <div className="min-h-dvh">
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-30 border-b border-border/50 bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl transition-transform duration-300 ease-out',
          (!chromeVisible || immersive) && '-translate-y-full',
        )}
      >
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-1 px-2 sm:px-4">
          <Link href="/" aria-label="Volver a la biblioteca" className={iconButton}>
            <ArrowLeft className="size-[18px]" />
          </Link>
          <TocSheet book={book} chapter={chapter} onNavigate={goTo} triggerClassName={iconButton} />
          <div className="min-w-0 flex-1 px-2 text-center">
            <p className="truncate text-sm font-medium">{book.title}</p>
            {chapterLabel && <p className="truncate text-xs text-muted-foreground">{chapterLabel}</p>}
          </div>
          <Link href="/vocabulario" className="hidden rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:block">
            Vocabulario
          </Link>
          <button type="button" onClick={enterImmersive} aria-label="Lectura inmersiva" className={iconButton}>
            <Maximize className="size-[18px]" />
          </button>
          <ReaderSettingsButton triggerClassName={iconButton} />
        </div>
      </header>

      {immersive && (
        <button
          type="button"
          onClick={exitImmersive}
          aria-label="Salir de lectura inmersiva"
          className="fixed top-[calc(env(safe-area-inset-top)+0.75rem)] right-3 z-40 flex size-10 items-center justify-center rounded-full bg-background/70 text-foreground/80 opacity-0 backdrop-blur transition-opacity hover:opacity-100 focus-visible:opacity-100 active:opacity-100"
        >
          <Minimize className="size-[18px]" />
        </button>
      )}

      <main
        className="mx-auto px-6 pt-[calc(env(safe-area-inset-top)+6rem)] pb-40 sm:px-10"
        style={{ maxWidth: `calc(${WIDTHS[settings.width]} + 5rem)` }}
      >
        {error ? (
          <p className="py-20 text-center text-muted-foreground">No se pudo cargar esta sección del libro.</p>
        ) : html === undefined ? (
          <ChapterSkeleton />
        ) : (
          <>
            <article
              ref={proseRef}
              lang="en"
              onClick={onContentClick}
              className="folio-prose animate-in fade-in-0 duration-300"
              style={
                {
                  '--reader-font': settings.font === 'sans' ? 'var(--font-sans)' : 'var(--font-serif)',
                  '--reader-size': `${settings.fontSize}px`,
                  '--reader-leading': settings.lineHeight,
                  '--reader-align': settings.justify ? 'justify' : 'left',
                } as React.CSSProperties
              }
              dangerouslySetInnerHTML={{ __html: html }}
            />
            <ChapterNav
              chapter={chapter}
              total={total}
              nextLabel={nextLabel}
              onPrev={() => goTo(chapter - 1)}
              onNext={() => goTo(chapter + 1)}
            />
          </>
        )}
      </main>

      <footer
        className={cn(
          'pointer-events-none fixed inset-x-0 bottom-0 z-20 pb-[env(safe-area-inset-bottom)] transition-opacity duration-300',
          chromeVisible && !immersive ? 'opacity-100' : 'opacity-0',
        )}
      >
        <div className="bg-gradient-to-t from-background via-background/90 to-transparent pt-6">
          <div className="mx-auto flex max-w-5xl items-center gap-4 px-5 pb-3 text-[11px] tabular-nums text-muted-foreground">
            <span className="shrink-0">
              {chapter + 1} / {total}
            </span>
            <div className="h-0.5 flex-1 overflow-hidden rounded-full bg-border" role="progressbar" aria-label="Progreso del libro" aria-valuenow={overall} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${overall}%` }} />
            </div>
            <span className="shrink-0">{overall}%</span>
          </div>
        </div>
      </footer>

      {translation && (
        <TranslationCard
          key={translation.id}
          data={translation}
          bookId={bookId}
          bookTitle={book.title}
          onClose={() => close()}
          onRetry={retry}
        />
      )}
    </div>
  )
}

function ChapterNav({
  chapter,
  total,
  nextLabel,
  onPrev,
  onNext,
}: {
  chapter: number
  total: number
  nextLabel: string
  onPrev: () => void
  onNext: () => void
}) {
  const isLast = chapter >= total - 1
  return (
    <nav aria-label="Navegación entre capítulos" className="mt-16 flex flex-col items-center gap-4 border-t border-border pt-10">
      {isLast ? (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="font-serif text-2xl">Fin</p>
          <Link href="/" className="text-sm text-primary underline underline-offset-4">
            Volver a la biblioteca
          </Link>
        </div>
      ) : (
        <button
          type="button"
          onClick={onNext}
          className="group flex w-full max-w-md items-center justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-4 text-left transition-colors hover:border-primary/40"
        >
          <span className="min-w-0">
            <span className="block text-xs text-muted-foreground">Siguiente</span>
            <span className="block truncate font-serif text-lg">{nextLabel || `Sección ${chapter + 2}`}</span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </button>
      )}
      {chapter > 0 && (
        <button
          type="button"
          onClick={onPrev}
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Anterior
        </button>
      )}
    </nav>
  )
}

function ChapterSkeleton() {
  return (
    <div className="flex flex-col gap-3 py-4" aria-busy aria-label="Cargando capítulo">
      <div className="folio-shimmer mx-auto mb-8 h-7 w-1/2 rounded" />
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="folio-shimmer h-4 rounded" style={{ width: `${88 + ((i * 7) % 12)}%` }} />
      ))}
    </div>
  )
}
