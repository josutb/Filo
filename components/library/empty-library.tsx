import { BookOpen, Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'

const STEPS = [
  { title: 'Importa tu EPUB', text: 'Tus libros se guardan en este dispositivo. Rápido, privado y sin conexión.' },
  { title: 'Selecciona al leer', text: 'Una palabra, un phrasal verb, un modismo o un párrafo entero.' },
  { title: 'Entiende el sentido', text: 'Folio traduce según la historia, no palabra por palabra.' },
]

export function EmptyLibrary({
  onPick,
  onSample,
  importing,
}: {
  onPick: () => void
  onSample: () => void
  importing: boolean
}) {
  return (
    <div className="grid items-center gap-14 pt-14 md:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-20">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-5">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Lector EPUB · Inglés → Español</p>
          <h1 className="font-serif text-4xl font-semibold leading-[1.08] tracking-tight text-balance md:text-6xl">
            Lee en inglés. Entiende cada matiz.
          </h1>
          <p className="max-w-lg text-lg leading-relaxed text-muted-foreground text-pretty">
            Selecciona cualquier fragmento del libro y Folio te muestra, justo ahí, lo que realmente significa en la
            historia. Sin salir de la página.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" onClick={onPick} disabled={importing} className="h-12 rounded-full px-6 text-base">
            {importing ? <Loader2 className="animate-spin" /> : <Upload />}
            Importar EPUB
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={onSample}
            disabled={importing}
            className="h-12 rounded-full bg-transparent px-6 text-base"
          >
            <BookOpen />
            Probar con Alice in Wonderland
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">También puedes arrastrar archivos .epub a esta ventana.</p>

        <ol className="mt-4 grid gap-6 border-t border-border pt-8 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-1.5">
              <span className="font-serif text-sm text-primary tabular-nums">0{i + 1}</span>
              <h2 className="text-sm font-medium">{step.title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>

      <DemoPage />
    </div>
  )
}

function DemoPage() {
  return (
    <figure aria-label="Ejemplo de traducción contextual" className="relative mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-border/70 bg-card px-8 pt-10 pb-28 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.3)]">
        <p className="mb-6 text-center text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Chapter I</p>
        <p className="font-serif text-lg leading-relaxed">
          Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do.
          She had{' '}
          <mark className="rounded-sm bg-highlight px-0.5 text-foreground">peeped into</mark> the book her sister was
          reading, but it had no pictures or conversations in it.
        </p>
      </div>
      <figcaption className="absolute inset-x-5 bottom-6 rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-[0_20px_40px_-12px_rgb(0_0_0/0.35)]">
        <p className="text-xs text-muted-foreground italic">peeped into</p>
        <p className="mt-1 font-serif text-xl leading-snug">había echado un vistazo a</p>
        <p className="mt-3 flex gap-2 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
          <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
            Phrasal verb
          </span>
          <span>Mirar algo rápida y discretamente; aquí, hojear el libro de su hermana.</span>
        </p>
      </figcaption>
    </figure>
  )
}
