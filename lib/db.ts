import { createStore, del, entries, get, set, type UseStore } from 'idb-keyval'

export type BookMeta = {
  id: string
  title: string
  author: string
  coverBlob?: Blob
  size: number
  addedAt: number
  lastOpenedAt?: number
  progress: number
  location?: ReadingLocation
  chapterCount: number
}

export type ReadingLocation = {
  chapter: number
  ratio: number
}

export type VocabEntry = {
  id: string
  text: string
  translation: string
  kind?: string
  note?: string
  context?: string
  bookId?: string
  bookTitle?: string
  createdAt: number
}

export type ReaderTheme = 'paper' | 'sepia' | 'night'
export type ReaderFont = 'serif' | 'sans'

export type ReaderSettings = {
  theme: ReaderTheme
  font: ReaderFont
  fontSize: number
  lineHeight: number
  width: 'narrow' | 'normal' | 'wide'
  justify: boolean
}

export const DEFAULT_SETTINGS: ReaderSettings = {
  theme: 'paper',
  font: 'serif',
  fontSize: 20,
  lineHeight: 1.7,
  width: 'normal',
  justify: false,
}

let stores: {
  books: UseStore
  files: UseStore
  vocab: UseStore
  cache: UseStore
  prefs: UseStore
} | null = null

function getStores() {
  if (!stores) {
    stores = {
      books: createStore('folio-books', 'kv'),
      files: createStore('folio-files', 'kv'),
      vocab: createStore('folio-vocab', 'kv'),
      cache: createStore('folio-translations', 'kv'),
      prefs: createStore('folio-prefs', 'kv'),
    }
  }
  return stores
}

export async function listBooks(): Promise<BookMeta[]> {
  const all = await entries<string, BookMeta>(getStores().books)
  return all
    .map(([, v]) => v)
    .sort((a, b) => (b.lastOpenedAt ?? b.addedAt) - (a.lastOpenedAt ?? a.addedAt))
}

export function getBook(id: string) {
  return get<BookMeta>(id, getStores().books)
}

export async function saveBook(meta: BookMeta, file?: ArrayBuffer) {
  if (file) await set(meta.id, file, getStores().files)
  await set(meta.id, meta, getStores().books)
}

export async function updateBook(id: string, patch: Partial<BookMeta>) {
  const current = await getBook(id)
  if (!current) return
  await set(id, { ...current, ...patch }, getStores().books)
}

export function getBookFile(id: string) {
  return get<ArrayBuffer>(id, getStores().files)
}

export async function deleteBook(id: string) {
  await Promise.all([del(id, getStores().books), del(id, getStores().files)])
}

export async function listVocab(): Promise<VocabEntry[]> {
  const all = await entries<string, VocabEntry>(getStores().vocab)
  return all.map(([, v]) => v).sort((a, b) => b.createdAt - a.createdAt)
}

export function saveVocab(entry: VocabEntry) {
  return set(entry.id, entry, getStores().vocab)
}

export function deleteVocab(id: string) {
  return del(id, getStores().vocab)
}

export function getCachedTranslation(key: string) {
  return get<{ translation: string; kind?: string; note?: string }>(key, getStores().cache)
}

export function setCachedTranslation(
  key: string,
  value: { translation: string; kind?: string; note?: string },
) {
  return set(key, value, getStores().cache)
}

export async function getSettings(): Promise<ReaderSettings> {
  const stored = await get<Partial<ReaderSettings>>('settings', getStores().prefs)
  return { ...DEFAULT_SETTINGS, ...stored }
}

export function saveSettings(settings: ReaderSettings) {
  return set('settings', settings, getStores().prefs)
}
