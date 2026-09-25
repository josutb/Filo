import type { Metadata } from 'next'
import { VocabularyView } from '@/components/vocabulary/vocabulary-view'

export const metadata: Metadata = {
  title: 'Vocabulario — Folio',
  description: 'Las palabras y expresiones que has guardado mientras leías.',
}

export default function VocabularyPage() {
  return <VocabularyView />
}
