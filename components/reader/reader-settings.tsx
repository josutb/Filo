'use client'

import { Minus, Plus, Type } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { ReaderSettings } from '@/lib/db'
import { useSettings } from '@/lib/hooks'
import { cn } from '@/lib/utils'

const THEMES: { value: ReaderSettings['theme']; label: string; swatch: string }[] = [
  { value: 'paper', label: 'Papel', swatch: 'bg-[#f6f2ea] text-[#2a2520]' },
  { value: 'sepia', label: 'Sepia', swatch: 'bg-[#ede1c9] text-[#4a3a28]' },
  { value: 'night', label: 'Noche', swatch: 'bg-[#1a1816] text-[#e3ddd2]' },
]

export function ReaderSettingsButton({ triggerClassName }: { triggerClassName?: string }) {
  const { settings, update } = useSettings()

  return (
    <Popover>
      <PopoverTrigger aria-label="Ajustes de lectura" className={triggerClassName}>
        <Type className="size-[18px]" />
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={10} className="w-80 gap-5 rounded-2xl p-4">
        <Group label="Tema">
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map((theme) => (
              <button
                key={theme.value}
                type="button"
                onClick={() => update({ theme: theme.value })}
                aria-pressed={settings.theme === theme.value}
                className={cn(
                  'flex h-14 flex-col items-center justify-center gap-0.5 rounded-xl border text-xs font-medium transition-shadow',
                  theme.swatch,
                  settings.theme === theme.value
                    ? 'border-primary ring-2 ring-primary/40'
                    : 'border-black/10',
                )}
              >
                <span className="font-serif text-base leading-none">Aa</span>
                {theme.label}
              </button>
            ))}
          </div>
        </Group>

        <Group label="Tipografía">
          <Segmented
            value={settings.font}
            onChange={(font) => update({ font })}
            options={[
              { value: 'serif', label: 'Literata', className: 'font-serif' },
              { value: 'sans', label: 'Inter', className: 'font-sans' },
            ]}
          />
        </Group>

        <Group label="Tamaño">
          <div className="flex items-center gap-2 rounded-xl bg-secondary p-1">
            <StepButton
              label="Reducir tamaño"
              disabled={settings.fontSize <= 14}
              onClick={() => update({ fontSize: settings.fontSize - 1 })}
            >
              <Minus className="size-4" />
            </StepButton>
            <span className="flex-1 text-center text-sm tabular-nums">{settings.fontSize} px</span>
            <StepButton
              label="Aumentar tamaño"
              disabled={settings.fontSize >= 32}
              onClick={() => update({ fontSize: settings.fontSize + 1 })}
            >
              <Plus className="size-4" />
            </StepButton>
          </div>
        </Group>

        <Group label="Interlineado">
          <Segmented
            value={String(settings.lineHeight)}
            onChange={(v) => update({ lineHeight: Number(v) })}
            options={[
              { value: '1.5', label: 'Compacto' },
              { value: '1.7', label: 'Normal' },
              { value: '1.95', label: 'Amplio' },
            ]}
          />
        </Group>

        <Group label="Ancho de columna">
          <Segmented
            value={settings.width}
            onChange={(width) => update({ width })}
            options={[
              { value: 'narrow', label: 'Estrecho' },
              { value: 'normal', label: 'Normal' },
              { value: 'wide', label: 'Amplio' },
            ]}
          />
        </Group>

        <Group label="Alineación">
          <Segmented
            value={settings.justify ? 'justify' : 'left'}
            onChange={(v) => update({ justify: v === 'justify' })}
            options={[
              { value: 'left', label: 'Izquierda' },
              { value: 'justify', label: 'Justificado' },
            ]}
          />
        </Group>
      </PopoverContent>
    </Popover>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; className?: string }[]
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-secondary p-1" role="group">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={cn(
            'h-9 flex-1 rounded-lg text-sm transition-colors',
            opt.className,
            value === opt.value
              ? 'bg-popover text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function StepButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-9 items-center justify-center rounded-lg bg-popover shadow-sm transition-opacity disabled:opacity-40"
    >
      {children}
    </button>
  )
}
