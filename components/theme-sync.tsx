'use client'

import { useEffect } from 'react'
import { useSettings } from '@/lib/hooks'

const THEME_COLORS = {
  paper: '#f6f2ea',
  sepia: '#ede1c9',
  night: '#1a1816',
} as const

export function ThemeSync() {
  const { settings } = useSettings()

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'theme-color'
      document.head.appendChild(meta)
    }
    meta.content = THEME_COLORS[settings.theme]
  }, [settings.theme])

  return null
}
