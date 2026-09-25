'use client'

import Link from 'next/link'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteBook, type BookMeta } from '@/lib/db'
import { useBooks } from '@/lib/hooks'
import { BookCover } from './book-cover'

export function BookGrid({ books, onAdd }: { books: BookMeta[]; onAdd: () => void }) {
  const { mutate } = useBooks()

  const remove = async (book: BookMeta) => {
    if (!window.confirm(`¿Eliminar “${book.title}” de tu biblioteca?`)) return
    await deleteBook(book.id)
    await mutate()
    toast(`“${book.title}” eliminado`)
  }

  return (
    <ul className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {books.map((book) => (
        <li key={book.id} className="group relative flex flex-col gap-3">
          <Link
            href={`/read/${book.id}`}
            className="flex flex-col gap-3 rounded-md outline-offset-4 transition-transform active:scale-[0.98]"
          >
            <BookCover
              title={book.title}
              author={book.author}
              blob={book.coverBlob}
              className="transition-transform duration-300 group-hover:-translate-y-1"
            />
            <div className="flex flex-col gap-1 pr-8">
              <h3 className="line-clamp-2 text-sm font-medium leading-snug">{book.title}</h3>
              {book.author && <p className="line-clamp-1 text-xs text-muted-foreground">{book.author}</p>}
              <ProgressLine value={book.progress} />
            </div>
          </Link>
          <button
            type="button"
            onClick={() => remove(book)}
            className="absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
            aria-label={`Eliminar ${book.title}`}
          >
            <Trash2 className="size-4" />
          </button>
        </li>
      ))}
      <li>
        <button
          type="button"
          onClick={onAdd}
          className="flex aspect-[2/3] w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          <Plus className="size-6" />
          <span className="text-sm">Añadir EPUB</span>
        </button>
      </li>
    </ul>
  )
}

function ProgressLine({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  if (pct === 0) return <p className="text-xs text-muted-foreground">Nuevo</p>
  return (
    <div className="mt-1 flex items-center gap-2">
      <div className="h-0.5 flex-1 overflow-hidden rounded-full bg-border">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  )
}
