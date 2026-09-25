'use client'

import { useRef, useState } from 'react'
import { Loader2, Plus, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SiteHeader } from '@/components/site-header'
import { useBooks } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import { BookGrid } from './book-grid'
import { ContinueReading } from './continue-reading'
import { EmptyLibrary } from './empty-library'
import { useImport } from './use-import'

export function LibraryView() {
  const { data: books, isLoading } = useBooks()
  const { importFiles, importSample, importing } = useImport()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const dragDepth = useRef(0)

  const openPicker = () => inputRef.current?.click()
  const recent = books?.find((b) => b.lastOpenedAt && b.progress < 0.999)

  return (
    <div
      className="relative min-h-dvh"
      onDragEnter={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return
        dragDepth.current += 1
        setDragging(true)
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1)
        if (dragDepth.current === 0) setDragging(false)
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        dragDepth.current = 0
        setDragging(false)
        if (e.dataTransfer.files.length) importFiles(e.dataTransfer.files)
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".epub,application/epub+zip"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          if (e.target.files?.length) importFiles(e.target.files)
          e.target.value = ''
        }}
      />

      <SiteHeader
        actions={
          books && books.length > 0 ? (
            <Button onClick={openPicker} disabled={importing} className="rounded-full">
              {importing ? <Loader2 className="animate-spin" /> : <Plus />}
              <span className="hidden sm:inline">Añadir EPUB</span>
              <span className="sr-only sm:hidden">Añadir EPUB</span>
            </Button>
          ) : null
        }
      />

      <main className="mx-auto max-w-6xl px-5 pb-24 md:px-8">
        {isLoading ? (
          <LibrarySkeleton />
        ) : !books || books.length === 0 ? (
          <EmptyLibrary onPick={openPicker} onSample={importSample} importing={importing} />
        ) : (
          <div className="flex flex-col gap-14 pt-10">
            {recent && <ContinueReading book={recent} />}
            <section aria-labelledby="library-heading" className="flex flex-col gap-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 id="library-heading" className="font-serif text-2xl font-semibold tracking-tight">
                    Tu biblioteca
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {books.length} {books.length === 1 ? 'libro' : 'libros'} · guardados en este dispositivo
                  </p>
                </div>
              </div>
              <BookGrid books={books} onAdd={openPicker} />
            </section>
          </div>
        )}
      </main>

      <div
        aria-hidden={!dragging}
        className={cn(
          'pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity',
          dragging ? 'opacity-100' : 'opacity-0',
        )}
      >
        <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary/50 px-16 py-12 text-center">
          <Upload className="size-8 text-primary" />
          <p className="font-serif text-xl">Suelta tu EPUB para añadirlo</p>
        </div>
      </div>
    </div>
  )
}

function LibrarySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-10 pt-12 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="folio-shimmer aspect-[2/3] rounded-md" />
          <div className="folio-shimmer h-3 w-3/4 rounded" />
        </div>
      ))}
    </div>
  )
}
