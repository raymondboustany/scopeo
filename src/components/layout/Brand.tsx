import { cn } from '@/lib/utils'

/**
 * Marque : un viseur de cadrage.
 *
 * Quatre coins délimitent le périmètre — cadrer, c'est d'abord décider ce qui
 * est dedans. À l'intérieur, les quatre textes (un nœud chacun, à sa couleur)
 * convergent vers un point commun : l'exigence unifiée qui les satisfait
 * ensemble. Le dessin tient sur une grille de 24 et reste lisible à 16 px.
 */
const MARK_GEOMETRY = {
  corners: ['M3 8V3h5', 'M16 3h5v5', 'M21 16v5h-5', 'M8 21H3v-5'],
  nodes: [
    { x: 12, y: 6.5, reg: 'rgpd' },
    { x: 17.5, y: 12, reg: 'nis2' },
    { x: 12, y: 17.5, reg: 'dora' },
    { x: 6.5, y: 12, reg: 'cra' },
  ],
  hub: { x: 12, y: 12 },
} as const

export function Mark({ size = 18, className, mono = false }: { size?: number; className?: string; mono?: boolean }) {
  const g = MARK_GEOMETRY
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={cn('shrink-0', className)} role="img" aria-label="Scopeo">
      <g fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className="text-ink">
        {g.corners.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <g stroke="var(--c-ink-3)" strokeWidth={1} opacity={0.7}>
        {g.nodes.map((n) => (
          <line key={n.reg} x1={n.x} y1={n.y} x2={g.hub.x} y2={g.hub.y} />
        ))}
      </g>
      {g.nodes.map((n) => (
        <circle key={n.reg} cx={n.x} cy={n.y} r={1.9} fill={mono ? 'currentColor' : `var(--c-${n.reg})`} />
      ))}
      <circle cx={g.hub.x} cy={g.hub.y} r={2.3} fill={mono ? 'currentColor' : 'var(--c-accent)'} />
    </svg>
  )
}

export function Wordmark({
  className,
  compact = false,
  collapsed = false,
}: {
  className?: string
  compact?: boolean
  collapsed?: boolean
}) {
  return (
    <span className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <Mark size={26} />
      {collapsed ? null : (
        <span className={cn('min-w-0 leading-tight', compact && 'hidden sm:block')}>
          <span className="block truncate text-sm font-semibold tracking-tight text-ink">Scopeo</span>
          <span className="block truncate font-mono text-[10px] uppercase tracking-[0.12em] text-ink-4">Cadrage réglementaire</span>
        </span>
      )}
    </span>
  )
}
