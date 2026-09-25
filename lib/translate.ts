import { getCachedTranslation, setCachedTranslation } from './db'

export type Translation = {
  translation: string
  kind?: string
  note?: string
}

const memory = new Map<string, Translation>()

export function parseTranslation(raw: string): Translation {
  const lines = raw.replace(/\r/g, '').split('\n')
  const noteIndex = lines.findIndex((l) => l.trimStart().startsWith('~'))
  const main = (noteIndex === -1 ? lines : lines.slice(0, noteIndex)).join('\n').trim()
  if (noteIndex === -1) return { translation: main }
  const noteLine = lines.slice(noteIndex).join(' ').trim().replace(/^~\s*/, '')
  const [kind, ...rest] = noteLine.split('·')
  return {
    translation: main,
    kind: kind?.trim() || undefined,
    note: rest.join('·').trim() || undefined,
  }
}

function cacheKey(text: string, context: string) {
  const sentence = context.slice(Math.max(0, context.indexOf('⟦') - 160), context.indexOf('⟧') + 160)
  return `${text.toLowerCase()}::${sentence}`
}

export async function translate(
  input: { text: string; context: string; title: string },
  onPartial: (t: Translation) => void,
  signal: AbortSignal,
): Promise<Translation> {
  const key = cacheKey(input.text, input.context)
  const hit = memory.get(key) ?? (await getCachedTranslation(key).catch(() => undefined))
  if (hit) {
    memory.set(key, hit)
    onPartial(hit)
    return hit
  }

  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal,
  })
  if (!res.ok || !res.body) throw new Error((await res.text().catch(() => '')) || 'No se pudo traducir')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let raw = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    raw += decoder.decode(value, { stream: true })
    onPartial(parseTranslation(raw))
  }
  const result = parseTranslation(raw)
  if (!result.translation) throw new Error('Respuesta vacía')
  memory.set(key, result)
  setCachedTranslation(key, result).catch(() => {})
  return result
}
