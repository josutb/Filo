import { getBook, saveBook, type BookMeta } from './db'
import { EpubBook, hashBuffer } from './epub'

export async function importEpub(buffer: ArrayBuffer): Promise<{ meta: BookMeta; existed: boolean }> {
  const id = await hashBuffer(buffer)
  const existing = await getBook(id)
  if (existing) return { meta: existing, existed: true }

  const book = await EpubBook.open(buffer)
  try {
    const coverBlob = await book.getCoverBlob().catch(() => undefined)
    const meta: BookMeta = {
      id,
      title: book.title,
      author: book.author,
      coverBlob,
      size: buffer.byteLength,
      addedAt: Date.now(),
      progress: 0,
      chapterCount: book.spine.length,
    }
    await saveBook(meta, buffer)
    return { meta, existed: false }
  } finally {
    book.destroy()
  }
}
