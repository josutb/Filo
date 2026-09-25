'use client'

import useSWR from 'swr'
import {
  DEFAULT_SETTINGS,
  getSettings,
  listBooks,
  listVocab,
  saveSettings,
  type ReaderSettings,
} from './db'

export function useBooks() {
  return useSWR('books', listBooks, { revalidateOnFocus: false })
}

export function useVocab() {
  return useSWR('vocab', listVocab, { revalidateOnFocus: false })
}

export function useSettings() {
  const { data, mutate, isLoading } = useSWR('settings', getSettings, {
    revalidateOnFocus: false,
  })
  const settings = data ?? DEFAULT_SETTINGS
  const update = (patch: Partial<ReaderSettings>) => {
    const next = { ...settings, ...patch }
    mutate(next, { revalidate: false })
    saveSettings(next).catch(() => {})
  }
  return { settings, update, ready: !isLoading }
}
