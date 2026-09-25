'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const FALLBACK_TONES = [
  'bg-[oklch(0.42_0.09_32)] text-[oklch(0.95_0.02_80)]',
  'bg-[oklch(0.35_0.05_240)] text-[oklch(0.95_0.02_80)]',
  'bg-[oklch(0.4_0.06_150)] text-[oklch(0.95_0.02_80)]',
  'bg-[oklch(0.3_0.02_60)] text-[oklch(0.92_0.03_80)]',
]

export function BookCover({
  title,
  author,
  blob,
  className,
}: {
  title: string
  author?: string
  blob?: Blob
  className?: string
}) {
  const [url, setUrl] = useState<string>()

  useEffect(() => {
    if (!blob) return
    const next = URL.createObjectURL(blob)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [blob])

  const tone = FALLBACK_TONES[(title.charCodeAt(0) || 0) % FALLBACK_TONES.length]

  return (
    <div
      className={cn(
        'relative aspect-[2/3] w-full overflow-hidden rounded-md shadow-[0_1px_2px_rgb(0_0_0/0.08),0_8px_24px_-8px_rgb(0_0_0/0.25)]',
        className,
      )}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={`Portada de ${title}`} className="size-full object-cover" />
      ) : (
        <div className={cn('flex size-full flex-col justify-between p-4', tone)}>
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] opacity-70">Folio</span>
          <div className="flex flex-col gap-2">
            <p className="font-serif text-lg font-semibold leading-tight text-balance">{title}</p>
            {author && <p className="text-xs opacity-75">{author}</p>}
          </div>
        </div>
      )}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/20 to-transparent"
      />
    </div>
  )
}
