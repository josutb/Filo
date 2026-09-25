'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { getBook, getBookFile, updateBook, type BookMeta } from '@/lib/db'
import { EpubBook } from '@/lib/epub'
import { ReaderSession } from './reader-session'

async function loadBook(id: string): Promise<{ meta: BookMeta; book: EpubBook }> {
  const [meta, file] = await Promise.all([getBook(id), getBookFile(id)])
  if (!meta || !file) throw new Error('not-found')
  const book = await EpubBook.open(file)
  updateBook(id, { lastOpenedAt: Date.now() }).catch(() => {})
  return { meta, book }
}

export function Reader({ id }: { id: string }) {
  const { data, error } = useSWR(['epub', id], () => loadBook(id), {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
  })

  if (error) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-serif text-2xl font-semibold">
          {error.message === 'not-found' ? 'Este libro ya no está en tu biblioteca' : 'No se pudo abrir el libro'}
        </h1>
        <p className="max-w-sm text-muted-foreground">
          Vuelve a la biblioteca e impórtalo de nuevo. Folio solo admite EPUB sin DRM.
        </p>
        <Link href="/" className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
          <ArrowLeft className="size-4" />
          Biblioteca
        </Link>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 text-muted-foreground" aria-busy>
        <Loader2 className="size-5 animate-spin" />
        <p className="text-sm">Abriendo libro…</p>
      </main>
    )
  }

  return <ReaderSession key={id} bookId={id} book={data.book} meta={data.meta} />
}
