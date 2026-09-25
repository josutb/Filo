export const maxDuration = 30

type Body = {
  text?: unknown
}

async function googleFree(text: string, signal: AbortSignal): Promise<string> {
  const url =
    'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=' +
    encodeURIComponent(text)
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`google ${res.status}`)
  const data = await res.json()
  const out = (data?.[0] ?? []).map((seg: unknown[]) => seg?.[0] ?? '').join('')
  if (!out) throw new Error('google empty')
  return out
}

async function myMemory(text: string, signal: AbortSignal): Promise<string> {
  const url =
    'https://api.mymemory.translated.net/get?langpair=en|es&q=' + encodeURIComponent(text.slice(0, 500))
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`mymemory ${res.status}`)
  const data = await res.json()
  const out = data?.responseData?.translatedText
  if (!out) throw new Error('mymemory empty')
  return out
}

export async function POST(req: Request) {
  let body: Body
  try {
    body = await req.json()
  } catch {
    return new Response('Solicitud inválida', { status: 400 })
  }

  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (!text || text.length > 2500) {
    return new Response('Selección vacía o demasiado larga', { status: 400 })
  }

  let translation: string
  try {
    translation = await googleFree(text, req.signal)
  } catch (error) {
    console.error('[folio] google translate error:', error)
    try {
      translation = await myMemory(text, req.signal)
    } catch (err) {
      console.error('[folio] mymemory error:', err)
      return new Response('El servicio de traducción no respondió. Inténtalo de nuevo.', { status: 502 })
    }
  }

  return new Response(translation.replace(/\n+/g, ' ').trim(), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
