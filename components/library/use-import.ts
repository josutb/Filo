'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useBooks } from '@/lib/hooks'
import { importEpub } from '@/lib/import-book'

export function useImport() {
  const { mutate } = useBooks()
  const router = useRouter()
  const [importing, setImporting] = useState(false)

  const importBuffers = async (items: { name: string; load: () => Promise<ArrayBuffer> }[], open = false) => {
    if (items.length === 0) return
    setImporting(true)
    let lastId: string | undefined
    try {
      for (const item of items) {
        try {
          const { meta, existed } = await importEpub(await item.load())
          lastId = meta.id
          toast.success(existed ? `“${meta.title}” ya estaba en tu biblioteca` : `“${meta.title}” añadido`)
        } catch (err) {
          console.error('[v0] import failed', err)
          toast.error(`No se pudo abrir ${item.name}`, {
            description: 'Asegúrate de que es un archivo EPUB válido y sin DRM.',
          })
        }
      }
      await mutate()
      if (open && lastId) router.push(`/read/${lastId}`)
    } finally {
      setImporting(false)
    }
  }

  const importFiles = (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => /\.epub$/i.test(f.name) || f.type === 'application/epub+zip')
    if (list.length === 0) {
      toast.error('Solo se admiten archivos .epub')
      return
    }
    return importBuffers(
      list.map((f) => ({ name: f.name, load: () => f.arrayBuffer() })),
      list.length === 1,
    )
  }

  const importSample = () =>
    importBuffers(
      [
        {
          name: 'Alice in Wonderland',
          load: async () => {
            const res = await fetch('/samples/alice.epub')
            if (!res.ok) throw new Error('sample unavailable')
            return res.arrayBuffer()
          },
        },
      ],
      true,
    )

  return { importFiles, importSample, importing }
}
