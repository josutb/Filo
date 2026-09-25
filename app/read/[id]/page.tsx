import type { Metadata } from 'next'
import { Reader } from '@/components/reader/reader'

export const metadata: Metadata = {
  title: 'Leyendo — Folio',
}

export default async function ReadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <Reader id={id} />
}
