import { useEffect, useRef, type ReactNode } from 'react'
import { animate, motion, useInView, useMotionValue, useTransform } from 'motion/react'
import { Scale } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CoverageLevel, MeasureStatus, RegulationId } from '@/types/domain'
import { LEVEL_STYLE, REG_LABEL, REG_STYLE } from './tokens'

/* ==========================================================================
   Étiquette de référentiel — une pastille ronde et un libellé en chasse fixe
   ========================================================================== */

export function RegChip({
  id,
  size = 'md',
  muted = false,
  className,
}: {
  id: RegulationId
  size?: 'sm' | 'md'
  muted?: boolean
  className?: string
}) {
  const s = REG_STYLE[id]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md font-semibold whitespace-nowrap',
        size === 'sm' ? 'h-5 px-1.5 text-[10px]' : 'h-6 px-2 text-2xs',
        muted ? 'bg-overlay text-ink-3' : cn(s.wash, s.text),
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', muted ? 'bg-ink-4' : s.bar)} aria-hidden />
      {REG_LABEL[id]}
    </span>
  )
}

/* ==========================================================================
   Étiquettes génériques
   ========================================================================== */

type Tone = 'neutral' | 'accent' | 'positive' | 'caution' | 'critical' | 'brass'

const TONE: Record<Tone, string> = {
  neutral: 'bg-overlay text-ink-2',
  accent: 'bg-accent-wash text-accent-strong',
  positive: 'bg-positive-wash text-positive',
  caution: 'bg-caution-wash text-caution',
  critical: 'bg-critical-wash text-critical',
  brass: 'bg-brass-wash text-brass',
}

export function Tag({
  children,
  tone = 'neutral',
  mono = false,
  className,
}: {
  children: ReactNode
  tone?: Tone
  mono?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-2xs font-medium whitespace-nowrap',
        mono && 'font-mono',
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Statut à trois états — vert en place, orange partiel, rouge absent. */
export function LevelPill({ level, className }: { level: CoverageLevel | MeasureStatus; className?: string }) {
  const s = LEVEL_STYLE[level]
  return (
    <span className={cn('inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-2xs font-semibold', s.wash, s.text, className)}>
      <span className={cn('size-1.5 rounded-full', s.dot)} aria-hidden />
      {s.label}
    </span>
  )
}

export function Ref({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('ref text-ink-3', className)}>{children}</span>
}

/* ==========================================================================
   LED — pulsation douce, uniquement pour une urgence réelle
   ========================================================================== */

export function Led({
  tone = 'critical',
  pulse = true,
  className,
  label,
}: {
  tone?: 'critical' | 'caution' | 'positive' | 'accent'
  pulse?: boolean
  className?: string
  label?: string
}) {
  const color = {
    critical: 'var(--c-critical)',
    caution: 'var(--c-caution)',
    positive: 'var(--c-positive)',
    accent: 'var(--c-accent)',
  }[tone]
  return (
    <span
      role={label ? 'status' : undefined}
      aria-label={label}
      className={cn('inline-block size-2 shrink-0 rounded-full', pulse && 'animate-led', className)}
      style={{ background: color, ['--led-color' as string]: color }}
    />
  )
}

/* ==========================================================================
   Surfaces
   ========================================================================== */

export function Card({
  children,
  className,
  as: Tag_ = 'div',
  interactive = false,
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'article' | 'section' | 'li'
  interactive?: boolean
}) {
  return (
    <Tag_
      className={cn(
        'card-glow rounded-lg transition-colors duration-150',
        interactive && 'hover:border-rule-3',
        className,
      )}
    >
      {children}
    </Tag_>
  )
}

export function CardHeader({
  title,
  subtitle,
  aside,
  icon,
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  aside?: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 border-b border-rule px-5 py-4', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? <IconTile>{icon}</IconTile> : null}
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-ink-3">{subtitle}</p> : null}
        </div>
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  )
}

/** Carré d'icône teinté — remplace les blocs de texte par un repère visuel. */
export function IconTile({
  children,
  color,
  size = 'md',
  className,
}: {
  children: ReactNode
  color?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-md border',
        size === 'sm' ? 'size-7' : size === 'lg' ? 'size-11' : 'size-9',
        !color && 'border-transparent bg-accent-wash text-accent-strong',
        className,
      )}
      style={
        color
          ? { borderColor: `color-mix(in srgb, ${color} 40%, transparent)`, background: `color-mix(in srgb, ${color} 14%, transparent)`, color }
          : undefined
      }
    >
      {children}
    </span>
  )
}

export function SectionRule({
  children,
  aside,
  className,
}: {
  children: ReactNode
  aside?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="label-caps shrink-0">{children}</span>
      <span className="h-px flex-1 bg-rule" aria-hidden />
      {aside ? <span className="shrink-0 text-2xs text-ink-3">{aside}</span> : null}
    </div>
  )
}

/* ==========================================================================
   Citation du texte officiel
   ========================================================================== */

export function Citation({
  regulation,
  reference,
  children,
  className,
}: {
  regulation?: RegulationId
  reference?: string
  children: ReactNode
  className?: string
}) {
  return (
    <figure className={cn('space-y-2', className)}>
      {reference ? (
        <figcaption className="flex items-center gap-2 text-2xs text-ink-3">
          {regulation ? <RegChip id={regulation} size="sm" /> : null}
          <span className="font-mono">{reference}</span>
        </figcaption>
      ) : null}
      <blockquote className="citation" style={regulation ? { borderColor: REG_STYLE[regulation].hex } : undefined}>
        « {children} »
      </blockquote>
    </figure>
  )
}

/* ==========================================================================
   Encadré
   ========================================================================== */

export function Callout({
  tone = 'neutral',
  title,
  children,
  icon,
  className,
}: {
  tone?: Tone
  title?: ReactNode
  children: ReactNode
  icon?: ReactNode
  className?: string
}) {
  const style: Record<Tone, string> = {
    neutral: 'bg-sunken',
    accent: 'bg-accent-wash',
    positive: 'bg-positive-wash',
    caution: 'bg-caution-wash',
    critical: 'bg-critical-wash',
    brass: 'bg-brass-wash',
  }
  return (
    <div className={cn('rounded-lg px-4 py-3', style[tone], className)}>
      {title ? (
        <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
          {icon}
          {title}
        </div>
      ) : null}
      <div className="text-sm leading-relaxed text-ink-2">{children}</div>
    </div>
  )
}

/** Mention de non-substitution — présente partout où l'outil conclut. */
export function Disclaimer({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-lg bg-sunken text-ink-3',
        compact ? 'px-3 py-2 text-2xs' : 'px-4 py-3 text-xs',
        className,
      )}
    >
      <Scale size={compact ? 12 : 14} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />
      <p>
        <strong className="font-medium text-ink-2">Outil d'aide au cadrage, pas un avis juridique.</strong>{' '}
        {compact
          ? 'Les conclusions reposent sur les éléments déclarés.'
          : "Les conclusions reposent sur les éléments déclarés et sur l'état du droit à la date du corpus ; elles ne remplacent ni l'analyse d'un conseil, ni la position de l'autorité compétente."}
      </p>
    </div>
  )
}

/* ==========================================================================
   Échelle de couverture — trois états
   ========================================================================== */

export function Ladder({ level, size = 'md', className }: { level: CoverageLevel; size?: 'sm' | 'md'; className?: string }) {
  const order: CoverageLevel[] = ['absent', 'partiel', 'en_place']
  const reached = level === 'non_evalue' ? -1 : order.indexOf(level)
  const tone = level === 'en_place' ? 'bg-positive' : level === 'partiel' ? 'bg-caution' : level === 'absent' ? 'bg-critical' : 'bg-rule-3'
  return (
    <span className={cn('inline-flex items-end gap-[3px]', className)} aria-hidden>
      {order.map((l, i) => (
        <span
          key={l}
          className={cn(
            'rounded-full transition-colors duration-300',
            size === 'sm' ? 'w-[4px]' : 'w-[5px]',
            i === 0 && (size === 'sm' ? 'h-2' : 'h-2.5'),
            i === 1 && (size === 'sm' ? 'h-3' : 'h-3.5'),
            i === 2 && (size === 'sm' ? 'h-4' : 'h-5'),
            i <= reached ? tone : 'bg-rule-2',
          )}
        />
      ))}
    </span>
  )
}

/* ==========================================================================
   Chiffres animés
   ========================================================================== */

export function AnimatedNumber({ value, suffix = '', className }: { value: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const inView = useInView(ref, { once: true })
  const mv = useMotionValue(0)
  const rounded = useTransform(mv, (v) => `${Math.round(v).toLocaleString('fr-FR')}${suffix}`)
  useEffect(() => {
    if (!inView) return
    const c = animate(mv, value, { duration: 0.9, ease: [0.22, 1, 0.36, 1] })
    return () => c.stop()
  }, [inView, value, mv])
  return <motion.span ref={ref} className={className}>{rounded}</motion.span>
}

export function Stat({
  label,
  value,
  unit,
  hint,
  tone,
  icon,
  className,
}: {
  label: ReactNode
  value: ReactNode
  unit?: string
  hint?: ReactNode
  tone?: 'default' | 'accent' | 'critical' | 'caution' | 'positive'
  icon?: ReactNode
  className?: string
}) {
  const color =
    tone === 'accent'
      ? 'text-accent'
      : tone === 'critical'
        ? 'text-critical'
        : tone === 'caution'
          ? 'text-caution'
          : tone === 'positive'
            ? 'text-positive'
            : 'text-ink'
  return (
    <div className={cn('min-w-0', className)}>
      <div className="flex items-center gap-2">
        {icon ? <span className="text-ink-3">{icon}</span> : null}
        <span className="label-caps truncate">{label}</span>
      </div>
      <div className={cn('mt-1.5 flex items-baseline gap-1 tabular font-semibold', color)}>
        <span className="text-2xl leading-none tracking-tight">{value}</span>
        {unit ? <span className="text-xs font-normal text-ink-3">{unit}</span> : null}
      </div>
      {hint ? <div className="mt-1.5 text-2xs leading-snug text-ink-3">{hint}</div> : null}
    </div>
  )
}

export function Bar({
  ratio,
  tone = 'accent',
  className,
  label,
  color,
}: {
  ratio: number
  tone?: 'accent' | 'positive' | 'caution' | 'critical'
  className?: string
  label?: string
  color?: string
}) {
  const bg = tone === 'positive' ? 'bg-positive' : tone === 'caution' ? 'bg-caution' : tone === 'critical' ? 'bg-critical' : 'bg-accent'
  const pct = Math.max(0, Math.min(1, ratio)) * 100
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-overlay', className)} role="img" aria-label={label ?? `${Math.round(pct)} %`}>
      <motion.div
        className={cn('h-full rounded-full', !color && bg)}
        style={color ? { background: color } : undefined}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  )
}

/* ==========================================================================
   Anneau de score
   ========================================================================== */

export function ScoreRing({
  value,
  size = 168,
  stroke = 12,
  label,
  sublabel,
  color = 'var(--c-accent)',
}: {
  value: number
  size?: number
  stroke?: number
  label?: ReactNode
  sublabel?: ReactNode
  color?: string
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, value))
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--c-overlay)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="tabular text-3xl font-semibold tracking-tight text-ink">
          <AnimatedNumber value={Math.round(pct * 100)} />
          <span className="text-lg text-ink-3"> %</span>
        </span>
        {label ? <span className="mt-0.5 text-2xs text-ink-3">{label}</span> : null}
        {sublabel ? <span className="text-2xs text-ink-4">{sublabel}</span> : null}
      </div>
    </div>
  )
}

/* ==========================================================================
   États vides, en-têtes, apparitions
   ========================================================================== */

export function EmptyState({
  title,
  children,
  action,
  icon,
  className,
}: {
  title: ReactNode
  children?: ReactNode
  action?: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('card-glow rounded-lg px-6 py-12 text-center', className)}>
      {icon ? <div className="mb-4 flex justify-center"><IconTile size="lg">{icon}</IconTile></div> : null}
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {children ? <div className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-3">{children}</div> : null}
      {action ? <div className="mt-6 flex justify-center gap-2">{action}</div> : null}
    </div>
  )
}

export function PageHeader({
  eyebrow,
  title,
  lead,
  actions,
  className,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  lead?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn('mb-7', className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          {eyebrow ? <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-4">{eyebrow}</div> : null}
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
          {lead ? <p className="mt-2 text-base leading-relaxed text-ink-2">{lead}</p> : null}
        </div>
        {actions ? <div className="no-print flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </motion.header>
  )
}

/** Apparition échelonnée d'une liste : un léger glissé, jamais spectaculaire. */
export function Reveal({ children, index = 0, className }: { children: ReactNode; index?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index, 12) * 0.035, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
