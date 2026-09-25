'use client'

import { useState } from 'react'
import { List } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import type { EpubBook } from '@/lib/epub'
import { cn } from '@/lib/utils'

export function TocSheet({
  book,
  chapter,
  onNavigate,
  triggerClassName,
}: {
  book: EpubBook
  chapter: number
  onNavigate: (chapter: number, fragment?: string) => void
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const items =
    book.toc.length > 0
      ? book.toc
      : book.spine.map((_, i) => ({ label: `Sección ${i + 1}`, chapter: i, depth: 0, fragment: undefined, path: '' }))

  const activeIndex = items.reduce((acc, item, i) => (item.chapter <= chapter ? i : acc), 0)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger aria-label="Índice" className={triggerClassName}>
        <List className="size-[18px]" />
      </SheetTrigger>
      <SheetContent side="left" className="w-[88vw] gap-0 bg-background sm:max-w-sm">
        <SheetHeader className="border-b border-border px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-5">
          <SheetTitle className="font-serif text-xl leading-tight font-semibold text-balance">{book.title}</SheetTitle>
          {book.author && <SheetDescription>{book.author}</SheetDescription>}
        </SheetHeader>
        <nav aria-label="Índice del libro" className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
          <ol className="flex flex-col">
            {items.map((item, i) => (
              <li key={`${item.chapter}-${item.fragment ?? ''}-${i}`}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    onNavigate(item.chapter, item.fragment)
                  }}
                  aria-current={i === activeIndex ? 'true' : undefined}
                  style={{ paddingLeft: `${0.75 + item.depth * 1}rem` }}
                  className={cn(
                    'flex w-full items-center rounded-lg py-2.5 pr-3 text-left text-sm leading-snug transition-colors',
                    i === activeIndex
                      ? 'bg-secondary font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                  )}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
