import JSZip from 'jszip'

export type TocItem = {
  label: string
  path: string
  fragment?: string
  chapter: number
  depth: number
}

type SpineItem = { path: string; mediaType: string }

const REMOVED_TAGS = [
  'script',
  'style',
  'link',
  'meta',
  'iframe',
  'object',
  'embed',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'noscript',
  'audio',
  'video',
  'title',
]

function dirname(path: string) {
  const i = path.lastIndexOf('/')
  return i === -1 ? '' : path.slice(0, i + 1)
}

function resolvePath(base: string, relative: string) {
  const clean = safeDecode(relative.split('#')[0].split('?')[0])
  if (!clean) return base
  const parts = (clean.startsWith('/') ? clean.slice(1) : dirname(base) + clean).split('/')
  const out: string[] = []
  for (const part of parts) {
    if (part === '..') out.pop()
    else if (part !== '.' && part !== '') out.push(part)
  }
  return out.join('/')
}

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

function parseXml(text: string) {
  return new DOMParser().parseFromString(text, 'application/xml')
}

function byTag(root: Document | Element, tag: string) {
  return Array.from(root.getElementsByTagNameNS('*', tag))
}

function textOf(el: Element | undefined) {
  return el?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
}

export class EpubBook {
  title = 'Sin título'
  author = ''
  spine: SpineItem[] = []
  toc: TocItem[] = []
  coverPath?: string

  private zip: JSZip
  private resourceUrls = new Map<string, string>()
  private chapterCache = new Map<number, string>()
  private pathToIndex = new Map<string, number>()
  private manifestTypes = new Map<string, string>()

  private constructor(zip: JSZip) {
    this.zip = zip
  }

  static async open(data: ArrayBuffer | Blob) {
    const zip = await JSZip.loadAsync(data)
    const book = new EpubBook(zip)
    await book.init()
    return book
  }

  private async readText(path: string) {
    const file = this.zip.file(path) ?? this.zip.file(safeDecode(path))
    if (!file) throw new Error(`Recurso no encontrado: ${path}`)
    return file.async('string')
  }

  private async init() {
    const container = parseXml(await this.readText('META-INF/container.xml'))
    const opfPath = byTag(container, 'rootfile')[0]?.getAttribute('full-path')
    if (!opfPath) throw new Error('EPUB inválido: falta el paquete OPF')

    const opf = parseXml(await this.readText(opfPath))
    this.title = textOf(byTag(opf, 'title')[0]) || this.title
    this.author = textOf(byTag(opf, 'creator')[0])

    const manifest = new Map<string, { path: string; type: string; props: string }>()
    for (const item of byTag(opf, 'item')) {
      const id = item.getAttribute('id') ?? ''
      const href = item.getAttribute('href') ?? ''
      const path = resolvePath(opfPath, href)
      const type = item.getAttribute('media-type') ?? ''
      manifest.set(id, { path, type, props: item.getAttribute('properties') ?? '' })
      this.manifestTypes.set(path, type)
    }

    for (const ref of byTag(opf, 'itemref')) {
      const item = manifest.get(ref.getAttribute('idref') ?? '')
      if (!item) continue
      if (!/html|xml/.test(item.type)) continue
      this.pathToIndex.set(item.path, this.spine.length)
      this.spine.push({ path: item.path, mediaType: item.type })
    }
    if (this.spine.length === 0) throw new Error('EPUB sin contenido legible')

    const coverItem =
      [...manifest.values()].find((m) => m.props.split(' ').includes('cover-image')) ??
      manifest.get(
        byTag(opf, 'meta')
          .find((m) => m.getAttribute('name') === 'cover')
          ?.getAttribute('content') ?? '',
      ) ??
      [...manifest.entries()].find(
        ([id, m]) => /cover/i.test(id + m.path) && m.type.startsWith('image/'),
      )?.[1]
    if (coverItem?.type.startsWith('image/')) this.coverPath = coverItem.path

    const navItem = [...manifest.values()].find((m) => m.props.split(' ').includes('nav'))
    const spineEl = byTag(opf, 'spine')[0]
    const ncxItem =
      manifest.get(spineEl?.getAttribute('toc') ?? '') ??
      [...manifest.values()].find((m) => m.type === 'application/x-dtbncx+xml')

    try {
      if (navItem) await this.parseNav(navItem.path)
      if (this.toc.length === 0 && ncxItem) await this.parseNcx(ncxItem.path)
    } catch {
      this.toc = []
    }
  }

  private pushToc(label: string, basePath: string, href: string, depth: number) {
    if (!label || !href) return
    const path = resolvePath(basePath, href)
    const chapter = this.pathToIndex.get(path)
    if (chapter === undefined) return
    const hashIndex = href.indexOf('#')
    const fragment = hashIndex >= 0 ? safeDecode(href.slice(hashIndex + 1)) : undefined
    this.toc.push({ label, path, fragment, chapter, depth })
  }

  private async parseNav(path: string) {
    const doc = new DOMParser().parseFromString(await this.readText(path), 'application/xhtml+xml')
    const navs = byTag(doc, 'nav')
    const tocNav =
      navs.find((n) =>
        (n.getAttribute('epub:type') ?? n.getAttributeNS('*', 'type') ?? '').includes('toc'),
      ) ?? navs[0]
    if (!tocNav) return
    const walk = (list: Element, depth: number) => {
      for (const li of Array.from(list.children)) {
        if (li.localName !== 'li') continue
        const a = Array.from(li.children).find((c) => c.localName === 'a' || c.localName === 'span')
        if (a) this.pushToc(textOf(a), path, a.getAttribute('href') ?? '', depth)
        const sub = Array.from(li.children).find((c) => c.localName === 'ol' || c.localName === 'ul')
        if (sub) walk(sub, depth + 1)
      }
    }
    const root = Array.from(tocNav.children).find((c) => c.localName === 'ol' || c.localName === 'ul')
    if (root) walk(root, 0)
  }

  private async parseNcx(path: string) {
    const doc = parseXml(await this.readText(path))
    const navMap = byTag(doc, 'navMap')[0]
    if (!navMap) return
    const walk = (parent: Element, depth: number) => {
      for (const point of Array.from(parent.children)) {
        if (point.localName !== 'navPoint') continue
        const label = textOf(byTag(point, 'text')[0])
        const src = Array.from(point.children)
          .find((c) => c.localName === 'content')
          ?.getAttribute('src')
        this.pushToc(label, path, src ?? '', depth)
        walk(point, depth + 1)
      }
    }
    walk(navMap, 0)
  }

  async getCoverBlob(): Promise<Blob | undefined> {
    if (!this.coverPath) return undefined
    const file = this.zip.file(this.coverPath)
    if (!file) return undefined
    const data = await file.async('uint8array')
    return new Blob([data as BlobPart], { type: this.manifestTypes.get(this.coverPath) || 'image/jpeg' })
  }

  private async resourceUrl(path: string) {
    const cached = this.resourceUrls.get(path)
    if (cached) return cached
    const file = this.zip.file(path)
    if (!file) return undefined
    const data = await file.async('uint8array')
    const type = this.manifestTypes.get(path) || guessType(path)
    const url = URL.createObjectURL(new Blob([data as BlobPart], { type }))
    this.resourceUrls.set(path, url)
    return url
  }

  chapterLabel(index: number) {
    let label = ''
    for (const item of this.toc) {
      if (item.chapter <= index && item.depth === 0) label = item.label
      if (item.chapter > index) break
    }
    return label
  }

  locate(fromPath: string, href: string) {
    const path = resolvePath(fromPath, href)
    const chapter = this.pathToIndex.get(path)
    if (chapter === undefined) return null
    const hashIndex = href.indexOf('#')
    return {
      chapter,
      fragment: hashIndex >= 0 ? safeDecode(href.slice(hashIndex + 1)) : undefined,
    }
  }

  async getChapterHtml(index: number): Promise<string> {
    const cached = this.chapterCache.get(index)
    if (cached !== undefined) return cached

    const { path, mediaType } = this.spine[index]
    const raw = await this.readText(path)
    let doc = new DOMParser().parseFromString(
      raw,
      mediaType.includes('xhtml') || path.endsWith('xhtml') ? 'application/xhtml+xml' : 'text/html',
    )
    if (doc.getElementsByTagName('parsererror').length > 0) {
      doc = new DOMParser().parseFromString(raw, 'text/html')
    }
    const body = doc.body ?? doc.getElementsByTagName('body')[0]
    if (!body) return ''

    const root = document.createElement('div')
    for (const node of Array.from(body.childNodes)) {
      root.appendChild(document.importNode(node, true))
    }

    for (const tag of REMOVED_TAGS) {
      root.querySelectorAll(tag).forEach((el) => el.remove())
    }

    const pending: Promise<void>[] = []

    root.querySelectorAll('*').forEach((el) => {
      for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase()
        if (
          name.startsWith('on') ||
          name === 'style' ||
          name === 'class' ||
          name === 'contenteditable' ||
          /^\s*(javascript|vbscript|data:text\/html)/i.test(attr.value)
        ) {
          el.removeAttribute(attr.name)
        }
      }
      if (el.id) el.id = `epub-${el.id}`

      const tag = el.localName
      if (tag === 'img') {
        const src = el.getAttribute('src')
        el.removeAttribute('src')
        el.removeAttribute('srcset')
        el.setAttribute('loading', 'lazy')
        el.setAttribute('decoding', 'async')
        if (!el.hasAttribute('alt')) el.setAttribute('alt', '')
        if (src && !/^(data:|https?:)/.test(src)) {
          pending.push(
            this.resourceUrl(resolvePath(path, src)).then((url) => {
              if (url) el.setAttribute('src', url)
            }),
          )
        }
      } else if (tag === 'image') {
        const href =
          el.getAttribute('href') ?? el.getAttributeNS('http://www.w3.org/1999/xlink', 'href')
        if (href) {
          pending.push(
            this.resourceUrl(resolvePath(path, href)).then((url) => {
              if (!url) return
              el.setAttribute('href', url)
              el.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', url)
            }),
          )
        }
      } else if (tag === 'a') {
        const href = el.getAttribute('href')
        if (!href) return
        if (/^(https?:|mailto:)/i.test(href)) {
          el.setAttribute('target', '_blank')
          el.setAttribute('rel', 'noopener noreferrer')
        } else if (/^javascript:/i.test(href)) {
          el.removeAttribute('href')
        } else {
          const target = href.startsWith('#') ? { chapter: index, fragment: href.slice(1) } : this.locate(path, href)
          el.setAttribute('href', '#')
          if (target) {
            el.setAttribute('data-chapter', String(target.chapter))
            if (target.fragment) el.setAttribute('data-fragment', target.fragment)
          }
        }
      }
    })

    await Promise.all(pending)
    const html = root.innerHTML
    this.chapterCache.set(index, html)
    if (this.chapterCache.size > 6) {
      const oldest = this.chapterCache.keys().next().value
      if (oldest !== undefined && oldest !== index) this.chapterCache.delete(oldest)
    }
    return html
  }

  destroy() {
    for (const url of this.resourceUrls.values()) URL.revokeObjectURL(url)
    this.resourceUrls.clear()
    this.chapterCache.clear()
  }
}

function guessType(path: string) {
  const ext = path.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'png':
      return 'image/png'
    case 'gif':
      return 'image/gif'
    case 'svg':
      return 'image/svg+xml'
    case 'webp':
      return 'image/webp'
    default:
      return 'image/jpeg'
  }
}

export async function hashBuffer(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest).slice(0, 12))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
