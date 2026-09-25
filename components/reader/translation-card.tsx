'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Bookmark, BookmarkCheck, Check, Copy, RotateCcw, X } from 'lucide-react'
import { toast } from 'sonner'
import { saveVocab } from '@/lib/db'
import { useVocab } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import type { SelectionTranslation } from './use-selection-translation'

type Placement = { top: number; left: number; width: number; docked: boolean; hidden: boolean }

const GAP = 14
const MARGIN = 12

function computePlacement(range: Range, cardHeight: number, long: boolean): Placement {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const docked = vw < 640
  const width = Math.min(long ? 460 : 380, vw - MARGIN * 2)

  if (docked) return { top: 0, left: 0, width, docked: true, hidden: false }

  const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0)
  const box = range.getBoundingClientRect()
  const first = rects[0] ?? box
  const last = rects[rects.length - 1] ?? box

  const hidden = box.bottom < 0 || box.top > vh

  let top = last.bottom + GAP
  let anchorX = rects.length > 1 ? box.left + box.width / 2 : last.left + last.width / 2
  if (top + cardHeight > vh - MARGIN) {
    const above = first.top - GAP - cardHeight
    if (above >= MARGIN) {
      top = above
      anchorX = first.left + first.width / 2
    } else {
      top = Math.max(MARGIN, vh - cardHeight - MARGIN)
    }
  }
  const left = Math.min(Math.max(anchorX - width / 2, MARGIN), vw - width - MARGIN)
  return { top, left, width, docked: false, hidden }
}

export function TranslationCard({
  data,
  bookId,
  bookTitle,
  onClose,
  onRetry,
}: {
  data: SelectionTranslation
  bookId: string
  bookTitle: string
  onClose: () => void
  onRetry: () => void
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = useState<Placement | null>(null)
  const [savedId, setSavedId] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const { mutate } = useVocab()
  const long = data.text.length > 120

  useLayoutEffect(() => {
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const h = cardRef.current?.offsetHeight ?? 160
        setPlacement(computePlacement(data.range, h, long))
      })
    }
    update()
    const observer = new ResizeObserver(update)
    if (cardRef.current) observer.observe(cardRef.current)
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
    }
  }, [data.range, long])

  useEffect(() => {
    setCopied(false)
  }, [data.id])

  const done = data.status === 'done'
  const saved = savedId === data.id
  const { translation, kind, note } = data.result

  const save = async () => {
    if (saved) return
    const sentence = data.context.split('\n').pop() ?? ''
    await saveVocab({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: data.text,
      translation,
      kind,
      note,
      context: sentence.replace(/[⟦⟧]/g, '').slice(0, 400),
      bookId,
      bookTitle,
      createdAt: Date.now(),
    })
    setSavedId(data.id)
    mutate()
    toast.success('Guardado en tu vocabulario')
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(translation)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  return (
    <div
      ref={cardRef}
      data-folio-card
      role="dialog"
      aria-label="Traducción"
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest('button')) e.preventDefault()
      }}
      style={
        placement && !placement.docked
          ? { top: placement.top, left: placement.left, width: placement.width }
          : undefined
      }
      className={cn(
        'fixed z-40 flex flex-col rounded-2xl border border-border bg-popover text-popover-foreground shadow-[0_24px_48px_-16px_rgb(0_0_0/0.35),0_2px_6px_rgb(0_0_0/0.06)] transition-opacity duration-150 ease-out animate-in fade-in-0 zoom-in-[0.97]',
        placement?.docked &&
          'inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] slide-in-from-bottom-4',
        (!placement || placement.hidden) && 'pointer-events-none opacity-0',
      )}
    >
      <div className="flex items-start gap-3 px-4 pt-3.5">
        <p className="line-clamp-2 flex-1 pt-0.5 font-serif text-sm leading-snug text-muted-foreground italic">
          {data.text}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar traducción"
          className="-mt-1 -mr-2 flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <div aria-live="polite" className="max-h-[45vh] overflow-y-auto overscroll-contain px-4 pt-1 pb-4">
        {data.status === 'error' ? (
          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-sm text-destructive">{data.error}</p>
            {data.context && (
              <button
                type="button"
                onClick={onRetry}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium"
              >
                <RotateCcw className="size-3.5" />
                Reintentar
              </button>
            )}
          </div>
        ) : !translation ? (
          <div className="flex flex-col gap-2 pt-1.5" aria-label="Traduciendo">
            <div className="folio-shimmer h-4 w-4/5 rounded" />
            {long && <div className="folio-shimmer h-4 w-3/5 rounded" />}
          </div>
        ) : (
          <>
            <p
              lang="es"
              className={cn(
                'font-serif leading-snug text-pretty',
                long ? 'text-[1.05rem] leading-relaxed' : 'text-xl',
              )}
            >
              {translation}
              {data.status === 'streaming' && (
                <span aria-hidden className="ml-0.5 inline-block h-[1em] w-px translate-y-[0.15em] animate-pulse bg-primary" />
              )}
            </p>
            {(kind || note) && (
              <div className="mt-3 flex flex-wrap items-start gap-x-2 gap-y-1.5 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
                {kind && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
                    {kind}
                  </span>
                )}
                {note && <span className="min-w-0 flex-1 basis-40">{note}</span>}
              </div>
            )}
          </>
        )}
      </div>

      {done && (
        <div className="flex items-center gap-1 border-t border-border px-2 py-1.5 animate-in fade-in-0">
          <CardAction onClick={save} active={saved} label={saved ? 'Guardado' : 'Guardar'}>
            {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
          </CardAction>
          <CardAction onClick={copy} label={copied ? 'Copiado' : 'Copiar'}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </CardAction>
        </div>
      )}
    </div>
  )
}

function CardAction({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors hover:bg-secondary',
        active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
      {label}
    </button>
  )
}
