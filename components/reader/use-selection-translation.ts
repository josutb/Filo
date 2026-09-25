'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { translate, type Translation } from '@/lib/translate'

export type TranslationStatus = 'loading' | 'streaming' | 'done' | 'error'

export type SelectionTranslation = {
  id: number
  text: string
  context: string
  range: Range
  status: TranslationStatus
  result: Translation
  error?: string
}

const BLOCK_SELECTOR = 'p,li,blockquote,h1,h2,h3,h4,h5,h6,dd,dt,td,th,figcaption,pre'
const MAX_CHARS = 2000
const WORD_CHAR = /[\p{L}\p{N}]/u
const HIGHLIGHT_NAME = 'folio-selection'

function expandToWords(range: Range) {
  const r = range.cloneRange()
  if (r.startContainer.nodeType === Node.TEXT_NODE) {
    const text = r.startContainer.textContent ?? ''
    let i = r.startOffset
    if (i > 0 && WORD_CHAR.test(text[i - 1] ?? '') && WORD_CHAR.test(text[i] ?? '')) {
      while (i > 0 && WORD_CHAR.test(text[i - 1])) i--
      r.setStart(r.startContainer, i)
    }
  }
  if (r.endContainer.nodeType === Node.TEXT_NODE) {
    const text = r.endContainer.textContent ?? ''
    let i = r.endOffset
    if (i < text.length && WORD_CHAR.test(text[i] ?? '') && WORD_CHAR.test(text[i - 1] ?? '')) {
      while (i < text.length && WORD_CHAR.test(text[i])) i++
      r.setEnd(r.endContainer, i)
    }
  }
  return r
}

function blockOf(node: Node, container: HTMLElement): Element {
  const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement
  const block = el?.closest(BLOCK_SELECTOR)
  if (block && container.contains(block)) return block
  return el && container.contains(el) ? el : container
}

function clean(s: string) {
  return s.replace(/\s+/g, ' ')
}

function buildContext(range: Range, container: HTMLElement, selected: string) {
  const startBlock = blockOf(range.startContainer, container)
  const endBlock = blockOf(range.endContainer, container)

  const before = document.createRange()
  before.selectNodeContents(startBlock)
  before.setEnd(range.startContainer, range.startOffset)

  const after = document.createRange()
  after.selectNodeContents(endBlock)
  after.setStart(range.endContainer, range.endOffset)

  const previous = clean(startBlock.previousElementSibling?.textContent ?? '').slice(-400)
  const prefix = clean(before.toString()).slice(-700)
  const suffix = clean(after.toString()).slice(0, 500)

  return [previous, `${prefix}⟦${selected}⟧${suffix}`].filter(Boolean).join('\n').trim()
}

function setHighlight(range: Range | null) {
  if (typeof CSS === 'undefined' || !('highlights' in CSS)) return
  const registry = (CSS as unknown as { highlights: Map<string, unknown> }).highlights
  if (!range) {
    registry.delete(HIGHLIGHT_NAME)
    return
  }
  const HighlightCtor = (window as unknown as { Highlight?: new (...r: Range[]) => unknown }).Highlight
  if (HighlightCtor) registry.set(HIGHLIGHT_NAME, new HighlightCtor(range))
}

export function useSelectionTranslation(containerRef: RefObject<HTMLElement | null>, title: string) {
  const [state, setState] = useState<SelectionTranslation | null>(null)
  const stateRef = useRef<SelectionTranslation | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const idRef = useRef(0)
  const mouseDownRef = useRef(false)
  const debounceRef = useRef<number | undefined>(undefined)
  const titleRef = useRef(title)
  titleRef.current = title

  const commit = useCallback((next: SelectionTranslation | null) => {
    stateRef.current = next
    setState(next)
  }, [])

  const run = useCallback(
    (text: string, context: string, range: Range) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      const id = ++idRef.current

      commit({ id, text, context, range, status: 'loading', result: { translation: '' } })
      setHighlight(range)

      translate(
        { text, context, title: titleRef.current },
        (partial) => {
          if (idRef.current !== id || !stateRef.current) return
          commit({ ...stateRef.current, status: 'streaming', result: partial })
        },
        controller.signal,
      )
        .then((result) => {
          if (idRef.current !== id || !stateRef.current) return
          commit({ ...stateRef.current, status: 'done', result })
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted || idRef.current !== id || !stateRef.current) return
          commit({
            ...stateRef.current,
            status: 'error',
            error: err instanceof Error ? err.message : 'No se pudo traducir',
          })
        })
    },
    [commit],
  )

  const close = useCallback(
    (clearSelection = true) => {
      abortRef.current?.abort()
      idRef.current++
      setHighlight(null)
      commit(null)
      if (clearSelection) window.getSelection()?.removeAllRanges()
    },
    [commit],
  )

  const retry = useCallback(() => {
    const current = stateRef.current
    if (current) run(current.text, current.context, current.range)
  }, [run])

  const evaluate = useCallback(() => {
    const container = containerRef.current
    const selection = window.getSelection()
    if (!container || !selection || selection.isCollapsed || selection.rangeCount === 0) return

    const raw = selection.getRangeAt(0)
    if (!container.contains(raw.commonAncestorContainer)) return

    const range = expandToWords(raw)
    const text = clean(range.toString()).trim()
    if (!text || !/[a-zA-Z]/.test(text)) return

    const current = stateRef.current
    if (current && current.text === text && current.range.compareBoundaryPoints(Range.START_TO_START, range) === 0) {
      return
    }

    if (text.length > MAX_CHARS) {
      abortRef.current?.abort()
      idRef.current++
      commit({
        id: idRef.current,
        text: `${text.slice(0, 80)}…`,
        context: '',
        range,
        status: 'error',
        result: { translation: '' },
        error: 'Selecciona un fragmento más corto (máx. unos párrafos).',
      })
      return
    }

    run(text, buildContext(range, container, text), range)
  }, [commit, containerRef, run])

  useEffect(() => {
    const schedule = (delay: number) => {
      window.clearTimeout(debounceRef.current)
      debounceRef.current = window.setTimeout(evaluate, delay)
    }

    const onSelectionChange = () => {
      if (mouseDownRef.current) return
      schedule(380)
    }

    const onPointerDown = (e: PointerEvent) => {
      if ((e.target as Element | null)?.closest('[data-folio-card]')) return
      if (e.pointerType === 'mouse') mouseDownRef.current = true
    }

    const onPointerUp = (e: PointerEvent) => {
      if ((e.target as Element | null)?.closest('[data-folio-card]')) return
      const wasMouse = e.pointerType === 'mouse'
      mouseDownRef.current = false
      window.setTimeout(
        () => {
          const selection = window.getSelection()
          if (!selection || selection.isCollapsed) {
            if (stateRef.current) close(false)
            return
          }
          if (wasMouse) schedule(0)
        },
        wasMouse ? 10 : 260,
      )
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stateRef.current) close()
    }

    document.addEventListener('selectionchange', onSelectionChange)
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('pointerup', onPointerUp)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(debounceRef.current)
      document.removeEventListener('selectionchange', onSelectionChange)
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('pointerup', onPointerUp)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [close, evaluate])

  useEffect(() => () => {
    abortRef.current?.abort()
    setHighlight(null)
  }, [])

  return { state, close, retry }
}
