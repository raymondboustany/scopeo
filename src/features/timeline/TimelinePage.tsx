import { CORPUS_DATE_LONG } from '@/data/meta'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { scaleTime } from 'd3-scale'
import { select } from 'd3-selection'
import 'd3-transition'
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom'
import { CalendarClock, Crosshair, Minus, Plus, RotateCcw, X } from 'lucide-react'
import { Callout, Card, CardHeader, Led, PageHeader, RegChip, SectionRule, Tag } from '@/components/ui/primitives'
import { Button, Switch } from '@/components/ui/controls'
import { REG_STYLE } from '@/components/ui/tokens'
import { RECURRING_DUTIES, TIMELINE } from '@/data/timeline'
import { REGULATION_ORDER } from '@/data/regulations'
import { conditionsMet } from '@/engines/alerts'
import { useScoping } from '@/lib/hooks'
import { useEntityEditor } from '@/lib/queries'
import { cn, formatDate } from '@/lib/utils'
import type { RegulationId, TimelineEvent } from '@/types/domain'

type Lane = RegulationId | 'TRANSVERSE'
const LANES: Lane[] = [...REGULATION_ORDER, 'TRANSVERSE']
const LANE_LABEL: Record<Lane, string> = { RGPD: 'RGPD', NIS2: 'NIS 2', DORA: 'DORA', CRA: 'CRA', TRANSVERSE: 'Transverse' }
const laneColor = (l: Lane) => (l === 'TRANSVERSE' ? 'var(--c-ink-3)' : REG_STYLE[l].hex)

const KIND_LABEL: Record<TimelineEvent['kind'], { label: string; tone: 'neutral' | 'accent' | 'caution' | 'critical' | 'brass' }> = {
  application: { label: 'Entrée en application', tone: 'critical' },
  transposition: { label: 'Transposition', tone: 'caution' },
  acte: { label: "Texte d'application", tone: 'accent' },
  echeance: { label: 'Échéance', tone: 'brass' },
  surveillance: { label: 'Surveillance', tone: 'neutral' },
  projet: { label: 'En cours', tone: 'neutral' },
}

const DAY = 86_400_000
const LANE_H = 46
const TOP = 34
const LEFT = 92
const HEIGHT = TOP + LANES.length * LANE_H + 18

export default function TimelinePage() {
  const scoping = useScoping()
  const { entity, applicable, qualified, readOnly } = scoping
  const edit = useEntityEditor()
  const [params, setParams] = useSearchParams()
  const [hidden, setHidden] = useState<Lane[]>([])
  const [scopeOnly, setScopeOnly] = useState(true)
  const [seenLocal, setSeenLocal] = useState<string[]>([])
  const selectedId = params.get('event')
  const now = useMemo(() => new Date(), [])

  const concerns = (e: TimelineEvent) =>
    !qualified || !entity ? true : (e.regulation === 'TRANSVERSE' || applicable.includes(e.regulation)) && conditionsMet(e, entity.answers)

  const events = useMemo(
    () =>
      TIMELINE.filter((e) => !hidden.includes(e.regulation))
        .filter((e) => (scopeOnly && qualified ? concerns(e) : true))
        .sort((a, b) => a.date.localeCompare(b.date)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hidden, scopeOnly, qualified, applicable, entity?.answers],
  )

  // Le prochain jalon qui concerne l'entité clignote tant qu'il n'a pas été consulté.
  const seen = [...(entity?.seen_alerts ?? []), ...seenLocal]
  const nearest = TIMELINE.filter(concerns)
    .filter((e) => new Date(e.date).getTime() >= now.getTime() - DAY / 2)
    .sort((a, b) => a.date.localeCompare(b.date))[0]
  const nearestPulses = nearest ? !seen.includes(`TL:${nearest.id}`) : false

  const markSeen = (id: string) => {
    const key = `TL:${id}`
    if (seen.includes(key)) return
    if (readOnly || !entity) setSeenLocal((s) => [...s, key])
    else edit((cur) => ({ seen_alerts: [...cur.seen_alerts, key] }))
  }

  const select_ = (id: string | null) => {
    if (id) markSeen(id)
    setParams(id ? { event: id } : {}, { replace: true })
  }

  const selected = TIMELINE.find((e) => e.id === selectedId) ?? null

  return (
    <>
      <PageHeader
        eyebrow="Pilotage"
        title="Échéancier réglementaire"
        lead="Les dates qui structurent le dispositif, y compris celles qui pèsent sur les États membres. Faites défiler pour zoomer, glissez pour vous déplacer, cliquez sur un jalon pour son détail."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {LANES.map((l) => {
          const off = hidden.includes(l)
          return (
            <button
              key={l}
              onClick={() => setHidden((h) => (off ? h.filter((x) => x !== l) : [...h, l]))}
              aria-pressed={!off}
              className={cn(
                'inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs transition-all',
                off ? 'border-rule-2 text-ink-4' : 'border-rule-3 bg-raised text-ink',
              )}
            >
              <span className="size-2 rounded-full transition-opacity" style={{ background: laneColor(l), opacity: off ? 0.3 : 1 }} />
              {LANE_LABEL[l]}
            </button>
          )
        })}
        {qualified ? (
          <label className="ml-auto inline-flex items-center gap-2 text-xs text-ink-2">
            <Switch checked={scopeOnly} onCheckedChange={setScopeOnly} label="Ce qui concerne l'entité" />
            Ce qui concerne l'entité
          </label>
        ) : null}
      </div>

      <TimelineChart
        events={events}
        now={now}
        selectedId={selectedId}
        nearestId={nearestPulses ? nearest?.id ?? null : null}
        onSelect={select_}
        hiddenLanes={hidden}
      />

      {nearest ? (
        <button
          onClick={() => select_(nearest.id)}
          className="mt-3 flex w-full items-center gap-3 rounded-md border border-accent-line bg-accent-wash px-4 py-2.5 text-left text-sm transition-colors hover:bg-accent-wash/80"
        >
          {nearestPulses ? <Led tone="accent" label="Prochain jalon non consulté" /> : <CalendarClock size={14} className="text-accent" />}
          <span className="text-ink-2">Prochain jalon pour {entity?.name ?? 'vous'} :</span>
          <span className="font-medium text-ink">{nearest.title}</span>
          <span className="ml-auto font-mono text-2xs text-accent">
            {formatDate(nearest.date)} · dans {Math.max(0, Math.round((new Date(nearest.date).getTime() - now.getTime()) / DAY))} j
          </span>
        </button>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-4">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div key={selected.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                <EventDetail event={selected} now={now} concerns={concerns(selected)} qualified={qualified} onClose={() => select_(null)} />
              </motion.div>
            ) : null}
          </AnimatePresence>

          <Card>
            <CardHeader title="Liste chronologique" subtitle={`${events.length} jalon${events.length > 1 ? 's' : ''} affiché${events.length > 1 ? 's' : ''}`} />
            <ol className="divide-y divide-rule">
              {events.map((e) => {
                const past = new Date(e.date).getTime() < now.getTime() - DAY / 2
                return (
                  <li key={e.id}>
                    <button
                      onClick={() => select_(e.id)}
                      className={cn('flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-raised/60', e.id === selectedId && 'bg-accent-wash')}
                    >
                      <span className={cn('w-24 shrink-0 font-mono text-2xs', past ? 'text-ink-4' : 'text-ink-2')}>{formatDate(e.date)}</span>
                      {e.regulation === 'TRANSVERSE' ? <Tag>Transverse</Tag> : <RegChip id={e.regulation} size="sm" />}
                      <span className={cn('min-w-0 flex-1 truncate text-sm', past ? 'text-ink-3' : 'text-ink')}>{e.title}</span>
                      {e.id === nearest?.id && nearestPulses ? <Led tone="accent" /> : null}
                    </button>
                  </li>
                )
              })}
            </ol>
          </Card>
        </div>

        <aside className="min-w-0">
          <SectionRule>Charges récurrentes</SectionRule>
          <p className="mt-2 text-xs leading-relaxed text-ink-3">Ces obligations reviennent à échéance fixe, indépendamment du calendrier législatif.</p>
          <ul className="mt-3 space-y-2">
            {RECURRING_DUTIES.filter((d) => (scopeOnly && qualified ? applicable.includes(d.regulation) : true)).map((d) => (
              <li key={d.id}>
                <Card className="p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <RegChip id={d.regulation} size="sm" />
                    <span className="ref text-brass">{d.cadence}</span>
                  </div>
                  <h3 className="mt-1.5 text-sm font-medium text-ink">{d.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-ink-2">{d.detail}</p>
                  <p className="ref mt-1.5 text-ink-4">{d.basis}</p>
                </Card>
              </li>
            ))}
          </ul>
          <Callout tone="caution" className="mt-4" title="NIS 2 toujours pas transposée">
            La directive devait être transposée au 17 octobre 2024. Au {CORPUS_DATE_LONG}, le projet de loi résilience n'est pas promulgué ;
            l'examen en séance publique s'ouvre le 7 octobre. Le ReCyF publié en mars 2026 fixe déjà le contenu attendu : le délai de mise en
            conformité se réduira d'autant.
          </Callout>
        </aside>
      </div>
    </>
  )
}

/* ==========================================================================
   Frise zoomable
   ========================================================================== */

function TimelineChart({
  events,
  now,
  selectedId,
  nearestId,
  onSelect,
  hiddenLanes,
}: {
  events: TimelineEvent[]
  now: Date
  selectedId: string | null
  nearestId: string | null
  onSelect: (id: string) => void
  hiddenLanes: Lane[]
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const [width, setWidth] = useState(900)
  const [t, setT] = useState<ZoomTransform>(zoomIdentity)
  const [hover, setHover] = useState<string | null>(null)

  useLayoutEffect(() => {
    if (!wrapRef.current) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(360, Math.floor(e.contentRect.width))))
    ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [])

  // Domaine : tout le calendrier, avec une marge d'un semestre de part et d'autre.
  const base = useMemo(() => {
    const dates = TIMELINE.map((e) => new Date(e.date).getTime())
    return scaleTime()
      .domain([new Date(Math.min(...dates) - 180 * DAY), new Date(Math.max(...dates) + 180 * DAY)])
      .range([LEFT, width - 16])
  }, [width])
  const x = useMemo(() => t.rescaleX(base), [t, base])

  useEffect(() => {
    if (!svgRef.current) return
    const svg = select(svgRef.current)
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 40])
      .translateExtent([
        [0, 0],
        [width, HEIGHT],
      ])
      .extent([
        [LEFT, 0],
        [width - 16, HEIGHT],
      ])
      .on('zoom', (ev) => setT(ev.transform))
    zoomRef.current = z
    svg.call(z).on('dblclick.zoom', null)
    return () => {
      svg.on('.zoom', null)
    }
  }, [width])

  const zoomBy = (k: number) => {
    if (svgRef.current && zoomRef.current) select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, k)
  }
  const reset = () => {
    if (svgRef.current && zoomRef.current) select(svgRef.current).transition().duration(400).call(zoomRef.current.transform, zoomIdentity)
  }
  const focusOn = (date: Date, k = 6) => {
    if (!svgRef.current || !zoomRef.current) return
    const target = zoomIdentity
      .translate((LEFT + width - 16) / 2, 0)
      .scale(k)
      .translate(-base(date), 0)
    select(svgRef.current).transition().duration(600).call(zoomRef.current.transform, target)
  }

  // Au premier affichage : cadrer sur les deux ans autour d'aujourd'hui.
  const framed = useRef(false)
  useEffect(() => {
    if (framed.current || width < 400) return
    framed.current = true
    const span = base.domain()[1].getTime() - base.domain()[0].getTime()
    const k = Math.min(8, Math.max(1, span / (3 * 365 * DAY)))
    focusOn(new Date(now.getTime() + 180 * DAY), k)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width])

  // Arrivée sur un événement désigné : le centrer.
  const lastFocused = useRef<string | null>(null)
  useEffect(() => {
    if (!selectedId || selectedId === lastFocused.current) return
    const e = TIMELINE.find((x) => x.id === selectedId)
    if (!e) return
    lastFocused.current = selectedId
    focusOn(new Date(e.date), Math.max(t.k, 4))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  const span = x.domain()[1].getTime() - x.domain()[0].getTime()
  const ticks = x.ticks(Math.max(4, Math.floor(width / 110)))
  const fmt = new Intl.DateTimeFormat('fr-FR', span > 5 * 365 * DAY ? { year: 'numeric' } : span > 400 * DAY ? { month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' })
  const visibleLanes = LANES.filter((l) => !hiddenLanes.includes(l))
  const laneY = (l: Lane) => TOP + visibleLanes.indexOf(l) * LANE_H + LANE_H / 2
  const nowX = x(now)
  const hovered = events.find((e) => e.id === hover)
  const h = TOP + visibleLanes.length * LANE_H + 18

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-4 py-2">
        <span className="text-2xs text-ink-3">Molette ou pincement pour zoomer · glisser pour se déplacer</span>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" icon={<Crosshair size={12} />} onClick={() => focusOn(now, Math.max(t.k, 4))}>
            Aujourd'hui
          </Button>
          <Button size="sm" variant="ghost" aria-label="Dézoomer" onClick={() => zoomBy(1 / 1.6)}>
            <Minus size={13} />
          </Button>
          <Button size="sm" variant="ghost" aria-label="Zoomer" onClick={() => zoomBy(1.6)}>
            <Plus size={13} />
          </Button>
          <Button size="sm" variant="ghost" icon={<RotateCcw size={12} />} onClick={reset}>
            Tout
          </Button>
        </div>
      </div>
      <div ref={wrapRef} className="relative">
        <svg
          ref={svgRef}
          width={width}
          height={h}
          className="block cursor-grab touch-none select-none active:cursor-grabbing"
          role="img"
          aria-label={`Frise de ${events.length} jalons réglementaires`}
        >
          <defs>
            <clipPath id="tl-clip">
              <rect x={LEFT} y={0} width={Math.max(0, width - LEFT - 16)} height={h} />
            </clipPath>
          </defs>

          {/* Couloirs */}
          {visibleLanes.map((l, i) => (
            <g key={l}>
              <rect x={0} y={TOP + i * LANE_H} width={width} height={LANE_H} fill={i % 2 ? 'transparent' : 'var(--c-sunken)'} />
              <circle cx={16} cy={laneY(l)} r={4} fill={laneColor(l)} />
              <text x={26} y={laneY(l)} dy="0.35em" style={{ fill: 'var(--c-ink-2)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                {LANE_LABEL[l]}
              </text>
            </g>
          ))}

          <g clipPath="url(#tl-clip)">
            {/* Graduations */}
            {ticks.map((d) => (
              <g key={d.getTime()} transform={`translate(${x(d)},0)`}>
                <line y1={TOP - 6} y2={h - 12} stroke="var(--c-rule)" strokeDasharray="2 4" />
                <text y={TOP - 12} textAnchor="middle" style={{ fill: 'var(--c-ink-3)', fontSize: 10 }}>
                  {fmt.format(d)}
                </text>
              </g>
            ))}

            {/* Aujourd'hui */}
            <g transform={`translate(${nowX},0)`}>
              <line y1={TOP - 4} y2={h - 12} stroke="var(--c-accent)" strokeWidth={1.5} />
              <rect x={-30} y={h - 16} width={60} height={14} rx={7} fill="var(--c-accent)" />
              <text y={h - 6} textAnchor="middle" style={{ fill: 'var(--c-accent-ink)', fontSize: 9, fontWeight: 600 }}>
                aujourd'hui
              </text>
            </g>

            {/* Jalons */}
            {events.map((e, i) => {
              if (!visibleLanes.includes(e.regulation)) return null
              const cx = x(new Date(e.date))
              const cy = laneY(e.regulation)
              const past = new Date(e.date).getTime() < now.getTime() - DAY / 2
              const color = laneColor(e.regulation)
              const isSel = e.id === selectedId
              const isNear = e.id === nearestId
              const major = e.kind === 'application'
              return (
                <g
                  key={e.id}
                  transform={`translate(${cx},${cy})`}
                  className="cursor-pointer"
                  onClick={(ev) => {
                    ev.stopPropagation()
                    onSelect(e.id)
                  }}
                  onMouseEnter={() => setHover(e.id)}
                  onMouseLeave={() => setHover(null)}
                >
                  <g className="svg-pop" style={{ animationDelay: `${Math.min(i, 30) * 25}ms` }}>
                    {isNear ? <circle r={9} fill={color} className="svg-halo" /> : null}
                    {isSel ? <circle r={13} fill="none" stroke="var(--c-accent)" strokeWidth={1.5} /> : null}
                    {major ? (
                      <rect x={-7} y={-7} width={14} height={14} transform="rotate(45)" rx={2} fill={past ? 'var(--c-overlay)' : color} stroke={color} strokeWidth={2} />
                    ) : (
                      <circle r={6.5} fill={past ? 'var(--c-overlay)' : color} stroke={color} strokeWidth={2} />
                    )}
                    <circle r={14} fill="transparent" />
                  </g>
                </g>
              )
            })}
          </g>
        </svg>

        {/* Infobulle */}
        {hovered && visibleLanes.includes(hovered.regulation) ? (
          <div
            className="pointer-events-none absolute z-10 w-64 -translate-x-1/2 rounded-md border border-rule-2 bg-overlay px-3 py-2 shadow-pop"
            style={{
              left: Math.min(width - 136, Math.max(136, x(new Date(hovered.date)))),
              top: laneY(hovered.regulation) + 16,
            }}
          >
            <div className="font-mono text-[10px] text-ink-3">{formatDate(hovered.date)}</div>
            <div className="text-xs font-medium text-ink">{hovered.title}</div>
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-4 border-t border-rule px-4 py-2 text-2xs text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rotate-45 rounded-[2px] bg-ink-3" /> Entrée en application
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-ink-3" /> Autre jalon
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border-2 border-ink-3 bg-overlay" /> Passé
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Led tone="accent" /> Prochain jalon non consulté
        </span>
      </div>
    </Card>
  )
}

function EventDetail({
  event: e,
  now,
  concerns,
  qualified,
  onClose,
}: {
  event: TimelineEvent
  now: Date
  concerns: boolean
  qualified: boolean
  onClose: () => void
}) {
  const days = Math.round((new Date(e.date).getTime() - now.getTime()) / DAY)
  const kind = KIND_LABEL[e.kind]
  return (
    <Card className="overflow-hidden">
      <div className="h-1" style={{ background: laneColor(e.regulation) }} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {e.regulation === 'TRANSVERSE' ? <Tag>Transverse</Tag> : <RegChip id={e.regulation} />}
            <Tag tone={kind.tone}>{kind.label}</Tag>
            {qualified ? concerns ? <Tag tone="accent">Concerne l'entité</Tag> : <Tag>Ne concerne pas l'entité</Tag> : null}
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-ink-3 hover:bg-raised hover:text-ink" aria-label="Fermer le détail">
            <X size={14} />
          </button>
        </div>
        <h2 className="mt-3 text-lg font-semibold text-ink">{e.title}</h2>
        <div className="mt-1 flex items-center gap-2 font-mono text-xs">
          <span className="text-ink-2">{formatDate(e.date)}</span>
          <span className={days >= 0 ? 'text-accent' : 'text-ink-4'}>
            {days === 0 ? "aujourd'hui" : days > 0 ? `dans ${days} jour${days > 1 ? 's' : ''}` : `il y a ${-days} jour${days < -1 ? 's' : ''}`}
          </span>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-2">{e.detail}</p>
        {e.appliesWhen?.length ? (
          <p className="mt-3 text-2xs text-ink-3">Condition : {e.appliesWhen.map((c) => c.label).join(' ; ')}</p>
        ) : null}
        {e.source ? (
          <a href={e.source} target="_blank" rel="noreferrer" className="ref mt-3 inline-block text-accent hover:underline">
            Source ↗
          </a>
        ) : null}
      </div>
    </Card>
  )
}
