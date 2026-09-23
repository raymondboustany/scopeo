import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import * as RadixTooltip from '@radix-ui/react-tooltip'
import * as RadixSelect from '@radix-ui/react-select'
import * as RadixSwitch from '@radix-ui/react-switch'
import * as RadixSlider from '@radix-ui/react-slider'
import * as RadixTabs from '@radix-ui/react-tabs'
import * as RadixDialog from '@radix-ui/react-dialog'
import { Check, ChevronDown, X } from 'lucide-react'
import { Link as RouterLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

/* ==========================================================================
   Bouton
   ========================================================================== */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md'

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-ink border-accent hover:bg-accent-hover hover:border-accent-hover disabled:bg-overlay disabled:border-rule-2 disabled:text-ink-4 disabled:shadow-none',
  secondary:
    'bg-surface text-ink border-rule-2 shadow-card hover:bg-raised hover:border-rule-3 disabled:text-ink-4 disabled:hover:bg-surface',
  ghost:
    'bg-transparent text-ink-2 border-transparent hover:bg-raised hover:text-ink disabled:text-ink-4 disabled:hover:bg-transparent',
  danger:
    'bg-transparent text-critical border-critical-line hover:bg-critical-wash disabled:text-ink-4 disabled:border-rule',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
}

/** Variante lien : même apparence, sémantique de navigation. */
export function LinkButton({
  to,
  variant = 'secondary',
  size = 'md',
  icon,
  className,
  children,
}: {
  to: string
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <RouterLink
      to={to}
      className={cn(
        'inline-flex select-none items-center justify-center gap-1.5 rounded-md border font-medium transition-all active:scale-[0.98]',
        size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-4 text-sm',
        VARIANTS[variant],
        className,
      )}
    >
      {icon}
      {children}
    </RouterLink>
  )
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex select-none items-center justify-center gap-1.5 rounded-md border font-medium transition-all active:scale-[0.98]',
        'disabled:cursor-not-allowed',
        size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-4 text-sm',
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
})

/* ==========================================================================
   Infobulle
   ========================================================================== */

export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <RadixTooltip.Provider delayDuration={250} skipDelayDuration={400}>
      {children}
    </RadixTooltip.Provider>
  )
}

export function Tooltip({
  content,
  children,
  side = 'top',
}: {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
}) {
  if (!content) return <>{children}</>
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={6}
          collisionPadding={12}
          className="z-50 max-w-xs rounded-md bg-ink px-3 py-2 text-xs leading-relaxed text-paper shadow-pop"
        >
          {content}
          <RadixTooltip.Arrow className="fill-[var(--c-ink)]" width={10} height={5} />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  )
}

/* ==========================================================================
   Sélecteur
   ========================================================================== */

export function Select({
  value,
  onValueChange,
  options,
  placeholder = 'Sélectionner…',
  className,
  ariaLabel,
}: {
  value: string | undefined
  onValueChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  className?: string
  ariaLabel?: string
}) {
  return (
    <RadixSelect.Root value={value} onValueChange={onValueChange}>
      <RadixSelect.Trigger
        aria-label={ariaLabel}
        className={cn(
          'inline-flex h-9 w-full items-center justify-between gap-2 rounded-md border border-rule-2 bg-raised px-3 text-sm text-ink transition-colors',
          'hover:border-rule-3 data-[placeholder]:text-ink-3',
          className,
        )}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon>
          <ChevronDown size={14} className="text-ink-3" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          className="z-50 max-h-80 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-rule bg-surface shadow-pop"
        >
          <RadixSelect.Viewport className="p-1">
            {options.map((o) => (
              <RadixSelect.Item
                key={o.value}
                value={o.value}
                className="relative flex cursor-pointer select-none items-center rounded-sm py-2 pl-7 pr-2 text-sm text-ink-2 outline-none data-[highlighted]:bg-raised data-[state=checked]:text-ink"
              >
                <RadixSelect.ItemIndicator className="absolute left-2">
                  <Check size={13} className="text-accent" />
                </RadixSelect.ItemIndicator>
                <RadixSelect.ItemText>{o.label}</RadixSelect.ItemText>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  )
}

/* ==========================================================================
   Champ de saisie
   ========================================================================== */

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'h-9 w-full rounded-md border border-rule-2 bg-raised px-3 text-sm text-ink transition-colors focus:border-accent-line',
          'placeholder:text-ink-4 hover:border-rule-3',
          className,
        )}
        {...props}
      />
    )
  },
)

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full rounded-md border border-rule-2 bg-raised px-3 py-2 text-sm leading-relaxed text-ink transition-colors focus:border-accent-line',
        'placeholder:text-ink-4 hover:border-rule-3',
        className,
      )}
      {...props}
    />
  )
}

/* ==========================================================================
   Choix exclusif — dessiné comme une liste de cartes, pour que la réponse
   reste lisible quand l'intitulé est long.
   ========================================================================== */

export function OptionList({
  value,
  onChange,
  options,
  name,
  multiple = false,
  values,
  onToggle,
}: {
  value?: string
  onChange?: (v: string) => void
  options: { value: string; label: string; hint?: string }[]
  name: string
  multiple?: boolean
  values?: string[]
  onToggle?: (v: string) => void
}) {
  return (
    <div className="space-y-1.5" role={multiple ? 'group' : 'radiogroup'}>
      {options.map((o) => {
        const selected = multiple ? (values ?? []).includes(o.value) : value === o.value
        return (
          <button
            key={o.value}
            type="button"
            role={multiple ? 'checkbox' : 'radio'}
            aria-checked={selected}
            name={name}
            onClick={() => (multiple ? onToggle?.(o.value) : onChange?.(o.value))}
            className={cn(
              'flex w-full items-start gap-3 rounded-md border px-3.5 py-3 text-left transition-all',
              selected
                ? 'border-accent-line bg-accent-wash'
                : 'border-rule-2 bg-raised hover:border-rule-3 hover:bg-overlay',
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex size-4 shrink-0 items-center justify-center border',
                multiple ? 'rounded-xs' : 'rounded-full',
                selected ? 'border-accent bg-accent' : 'border-rule-3 bg-paper',
              )}
              aria-hidden
            >
              {selected ? (
                multiple ? (
                  <Check size={11} className="text-accent-ink" strokeWidth={3} />
                ) : (
                  <span className="size-1.5 rounded-full bg-accent-ink" />
                )
              ) : null}
            </span>
            <span className="min-w-0">
              <span className={cn('block text-sm', selected ? 'font-medium text-ink' : 'text-ink-2')}>
                {o.label}
              </span>
              {o.hint ? <span className="mt-0.5 block text-xs text-ink-3">{o.hint}</span> : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ==========================================================================
   Interrupteur, curseur, onglets
   ========================================================================== */

export function Switch({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean
  onCheckedChange: (v: boolean) => void
  label: string
}) {
  return (
    <RadixSwitch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={label}
      className="relative h-5 w-9 shrink-0 rounded-full border border-rule-2 bg-overlay transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent"
    >
      <RadixSwitch.Thumb className="block size-3.5 translate-x-0.5 rounded-full bg-ink transition-transform data-[state=checked]:translate-x-[17px]" />
    </RadixSwitch.Root>
  )
}

export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 5,
  label,
}: {
  value: number
  onValueChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  label: string
}) {
  return (
    <RadixSlider.Root
      value={[value]}
      onValueChange={([v]) => onValueChange(v)}
      min={min}
      max={max}
      step={step}
      aria-label={label}
      className="relative flex h-4 w-full touch-none select-none items-center"
    >
      <RadixSlider.Track className="relative h-1.5 w-full grow rounded-full bg-overlay">
        <RadixSlider.Range className="absolute h-full rounded-full bg-accent" />
      </RadixSlider.Track>
      <RadixSlider.Thumb className="block size-4 rounded-full border-2 border-accent bg-ink transition-transform hover:scale-110" />
    </RadixSlider.Root>
  )
}

export const Tabs = RadixTabs.Root

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <RadixTabs.List className={cn('flex items-center gap-0.5 border-b border-rule', className)}>
      {children}
    </RadixTabs.List>
  )
}

export function TabTrigger({
  value,
  children,
  count,
}: {
  value: string
  children: ReactNode
  count?: number
}) {
  return (
    <RadixTabs.Trigger
      value={value}
      className={cn(
        '-mb-px inline-flex items-center gap-1.5 border-b-2 border-transparent px-3.5 py-2.5 text-sm text-ink-3 transition-colors',
        'hover:text-ink data-[state=active]:border-accent data-[state=active]:font-medium data-[state=active]:text-ink',
      )}
    >
      {children}
      {typeof count === 'number' ? (
        <span className="font-mono text-2xs text-ink-4">{count}</span>
      ) : null}
    </RadixTabs.Trigger>
  )
}

export const TabPanel = RadixTabs.Content

/* ==========================================================================
   Boîte de dialogue
   ========================================================================== */

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  wide = false,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-[rgb(16_20_28_/_0.5)]" />
        <RadixDialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-auto',
            'rounded-lg border border-rule-2 bg-surface shadow-modal',
            wide ? 'max-w-3xl' : 'max-w-lg',
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-rule px-5 py-3.5">
            <div>
              <RadixDialog.Title className="text-base font-semibold text-ink">{title}</RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className="mt-0.5 text-xs text-ink-3">
                  {description}
                </RadixDialog.Description>
              ) : null}
            </div>
            <RadixDialog.Close asChild>
              <button className="rounded-md p-1.5 text-ink-3 hover:bg-raised hover:text-ink" aria-label="Fermer">
                <X size={15} />
              </button>
            </RadixDialog.Close>
          </div>
          <div className="px-5 py-4">{children}</div>
          {footer ? (
            <div className="flex items-center justify-end gap-2 border-t border-rule bg-sunken px-5 py-3">
              {footer}
            </div>
          ) : null}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}

export const DialogClose = RadixDialog.Close

/* ==========================================================================
   Barre de filtres — segments exclusifs, denses.
   ========================================================================== */

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode; count?: number }[]
  ariaLabel: string
  className?: string
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        /*
         * Sur petit écran le groupe occupe la ligne entière et défile
         * horizontalement : des segments qui rétrécissent deviendraient
         * illisibles, et un repli sur plusieurs lignes casserait la lecture
         * du groupe comme choix exclusif.
         */
        'flex w-full min-w-0 items-center gap-0.5 overflow-x-auto rounded-md border border-rule-2 bg-sunken p-1',
        'sm:inline-flex sm:w-auto sm:max-w-full',
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-sm px-2.5 text-xs transition-colors',
              active ? 'bg-surface font-medium text-ink shadow-card' : 'text-ink-3 hover:text-ink',
            )}
          >
            {o.label}
            {typeof o.count === 'number' ? (
              <span className="font-mono text-2xs text-ink-4">{o.count}</span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
