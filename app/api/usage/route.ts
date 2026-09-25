export const maxDuration = 30

type Example = { en: string; es?: string }
type Meaning = { partOfSpeech: string; definition: string; example?: string }
type Usage = { meanings: Meaning[]; examples: Example[] }

const cache = new Map<string, Usage>()
const CACHE_HEADERS = { 'Cache-Control': 'public, max-age=86400, s-maxage=604800' }

async function dictionary(text: string, signal: AbortSignal): Promise<Meaning[]> {
  if (text.split(/\s+/).length > 3) return []
  const res = await fetch(
    'https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(text.toLowerCase()),
    { signal },
  )
  if (!res.ok) return []
  const data = await res.json()
  const out: Meaning[] = []
  const seen = new Set<string>()
  for (const entry of Array.isArray(data) ? data : []) {
    for (const m of entry?.meanings ?? []) {
      for (const d of (m?.definitions ?? []).slice(0, 2)) {
        const def = d?.definition?.trim()
        if (!def || seen.has(def.toLowerCase()) || /^\(?(obsolete|archaic|dated|rare)\b/i.test(def)) continue
        seen.add(def.toLowerCase())
        out.push({ partOfSpeech: m.partOfSpeech ?? '', definition: def, example: d.example })
      }
    }
  }
  return out.slice(0, 6)
}

async function tatoeba(text: string, signal: AbortSignal): Promise<Example[]> {
  const url =
    'https://tatoeba.org/en/api_v0/search?from=eng&to=spa&orphans=no&unapproved=no&sort=relevance&query=' +
    encodeURIComponent(`"${text}"`)
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) return []
  const data = await res.json()
  const phrase = new RegExp(`\\b${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')}\\b`, 'i')
  const seen = new Set<string>()
  const ranked: { ex: Example; score: number }[] = []
  for (const r of data?.results ?? []) {
    if (!r?.text || !phrase.test(r.text)) continue
    const key = r.text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const [direct = [], indirect = []] = r.translations ?? []
    const isSpa = (t: { lang?: string }) => t?.lang === 'spa'
    const directEs = direct.find(isSpa)?.text
    const es = directEs ?? indirect.find(isSpa)?.text
    const words = r.text.split(/\s+/).length
    let score = 0
    if (directEs) score += 3
    else if (es) score += 1
    if (words >= 4 && words <= 14) score += 2
    else if (words > 20) score -= 2
    ranked.push({ ex: { en: r.text, es }, score })
  }
  return ranked
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((r) => r.ex)
}

export async function POST(req: Request) {
  let text = ''
  try {
    const body = await req.json()
    text =
      typeof body.text === 'string'
        ? body.text
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
            .replace(/\s+/g, ' ')
            .trim()
        : ''
  } catch {
    return new Response('Solicitud inválida', { status: 400 })
  }
  if (!text || text.length > 120) return new Response('Selección vacía o demasiado larga', { status: 400 })

  const key = text.toLowerCase()
  const cached = cache.get(key)
  if (cached) return Response.json(cached, { headers: CACHE_HEADERS })

  const [meanings, examples] = await Promise.all([
    dictionary(text, AbortSignal.timeout(2500)).catch(() => []),
    tatoeba(text, AbortSignal.timeout(3000)).catch(() => []),
  ])
  const usage: Usage = { meanings, examples }
  if (meanings.length || examples.length) {
    if (cache.size > 500) cache.delete(cache.keys().next().value as string)
    cache.set(key, usage)
  }
  return Response.json(usage, { headers: CACHE_HEADERS })
}
