import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { ChevronRight, ExternalLink, Search, SlidersHorizontal, X } from 'lucide-react'
import {
  Callout,
  Card,
  Citation,
  EmptyState,
  PageHeader,
  RegChip,
  Tag,
} from '@/components/ui/primitives'
import { Button, Input, SegmentedControl, Switch, Tooltip } from '@/components/ui/controls'
import { useScoping } from '@/lib/hooks'
import { NoteButton } from '@/components/notes/NoteButton'
import { ALL_OBLIGATIONS, CORPUS_STATS, recyfForObligation, type ScopedObligation } from '@/engines/corpus'
import { RecyfPanel } from '@/components/recyf/RecyfPanel'
import { REGULATIONS, REGULATION_ORDER } from '@/data/regulations'
import { CROSSWALK_BY_ID } from '@/data/crosswalk'
import { cn, formatDelay } from '@/lib/utils'
import type { MeasureStatus, Obligation, RegulationId, RequirementType } from '@/types/domain'

type RegFilter = 'tous' | RegulationId

const BINDING_LABEL: Record<Obligation['binding'], { label: string; tone: 'critical' | 'caution' | 'neutral' }> = {
  obligatoire: { label: 'Obligation', tone: 'critical' },
  conditionnelle: { label: 'Conditionnelle', tone: 'caution' },
  recommandee: { label: 'Recommandation', tone: 'neutral' },
}

const REQ_TYPE_LABEL: Record<RequirementType, string> = {
  gouvernance: 'Gouvernance',
  organisationnel: 'Organisationnel',
  technique: 'Technique',
  documentaire: 'Documentaire',
  notification: 'Notification',
  contractuel: 'Contractuel',
}

export default function CorpusPage() {
  const scoping = useScoping()
  const [params, setParams] = useSearchParams()
  const [reg, setReg] = useState<RegFilter>('tous')
  const [query, setQuery] = useState('')
  const [scopeOnly, setScopeOnly] = useState(true)

  const recyfParam = params.get('recyf') ? Number(params.get('recyf')) : null
  // Un objectif ReCyF s'ouvre sous la première exigence NIS 2 qu'il détaille.
  const recyfTarget = recyfParam ? ALL_OBLIGATIONS.find((o) => o.recyf?.includes(recyfParam))?.id ?? null : null
  const selectedId = recyfTarget ?? params.get('obligation')

  // Sans qualification, le filtre de périmètre n'a rien à filtrer.
  const canScope = scoping.qualified
  const effectiveScopeOnly = canScope && scopeOnly

  const source: ScopedObligation[] = useMemo(() => {
    if (scoping.entity) return scoping.obligations
    return ALL_OBLIGATIONS.map((o) => ({ ...o, inScope: true, unmetConditions: [] }))
  }, [scoping.entity, scoping.obligations])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return source
      .filter((o) => (reg === 'tous' ? true : o.regulation === reg))
      .filter((o) => (effectiveScopeOnly ? o.inScope || o.id === recyfTarget : true))
      .filter((o) => {
        if (!q) return true
        return (
          o.title.toLowerCase().includes(q) ||
          o.article.toLowerCase().includes(q) ||
          o.statement.toLowerCase().includes(q) ||
          o.id.toLowerCase().includes(q) ||
          o.requirements.some((r) => r.text.toLowerCase().includes(q))
        )
      })
      .sort((a, b) =>
        a.regulation === b.regulation
          ? a.order - b.order
          : REGULATION_ORDER.indexOf(a.regulation) - REGULATION_ORDER.indexOf(b.regulation),
      )
  }, [source, reg, query, effectiveScopeOnly, recyfTarget])

  const selected = useMemo(
    () => filtered.find((o) => o.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId],
  )

  // Garde la sélection valide quand les filtres changent.
  useEffect(() => {
    if (selected && selected.id !== selectedId) {
      setParams((p) => {
        const next = new URLSearchParams(p)
        next.set('obligation', selected.id)
        return next
      }, { replace: true })
    }
  }, [selected, selectedId, setParams])

  useEffect(() => {
    if (!recyfParam) return
    const t = setTimeout(() => document.getElementById(`recyf-${recyfParam}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 350)
    return () => clearTimeout(t)
  }, [recyfParam])

  const counts = useMemo(() => {
    const base = effectiveScopeOnly ? source.filter((o) => o.inScope) : source
    return REGULATION_ORDER.reduce(
      (acc, id) => {
        acc[id] = base.filter((o) => o.regulation === id).length
        return acc
      },
      { tous: base.length } as Record<string, number>,
    )
  }, [source, effectiveScopeOnly])

  return (
    <>
      <PageHeader
        eyebrow="Référentiel"
        title="Corpus réglementaire"
        lead={`${CORPUS_STATS.obligations} obligations reprises des quatre textes, décomposées en ${CORPUS_STATS.requirements} exigences élémentaires, avec les preuves attendues en contrôle.`}
      />

      {/* Barre de filtres — une seule ligne, au-dessus du contenu. */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SegmentedControl<RegFilter>
          ariaLabel="Filtrer par règlement"
          value={reg}
          onChange={setReg}
          options={[
            { value: 'tous', label: 'Tous', count: counts.tous },
            ...REGULATION_ORDER.map((id) => ({
              value: id as RegFilter,
              label: id === 'NIS2' ? 'NIS 2' : id,
              count: counts[id],
            })),
          ]}
        />

        <div className="relative w-full min-w-0 basis-full sm:w-auto sm:flex-1 sm:basis-auto sm:min-w-[13rem]">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-4" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Article, exigence, mot-clé…"
            className="pl-8"
            aria-label="Rechercher dans le corpus"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink"
              aria-label="Effacer la recherche"
            >
              <X size={13} />
            </button>
          ) : null}
        </div>

        {canScope ? (
          <label className="inline-flex items-center gap-2 rounded-sm border border-rule bg-surface px-2.5 py-1.5 text-xs text-ink-2">
            <Switch checked={scopeOnly} onCheckedChange={setScopeOnly} label="Périmètre de l'entité" />
            <span className="flex items-center gap-1">
              <SlidersHorizontal size={11} className="text-ink-4" />
              Périmètre de l'entité
            </span>
          </label>
        ) : null}
      </div>

      {!scoping.qualified ? (
        <Callout tone="accent" className="mb-4">
          Le corpus est affiché dans son intégralité.{' '}
          <Link to="/app/qualification" className="font-medium text-accent underline underline-offset-2">
            Qualifiez l'entité
          </Link>{' '}
          pour le restreindre aux obligations réellement applicables et voir, pour chaque obligation
          écartée, le motif de son exclusion.
        </Callout>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState title="Aucune obligation ne correspond" action={<Button onClick={() => { setQuery(''); setReg('tous') }}>Réinitialiser les filtres</Button>}>
          Élargissez la recherche ou désactivez le filtrage par périmètre.
        </EmptyState>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[20rem_1fr] xl:grid-cols-[24rem_1fr]">
          {/* Liste ---------------------------------------------------- */}
          <div className="min-w-0">
            <div className="max-h-[74vh] overflow-y-auto rounded-lg border border-rule bg-surface shadow-card">
              {REGULATION_ORDER.filter((r) => filtered.some((o) => o.regulation === r)).map((r) => {
                const group = filtered.filter((o) => o.regulation === r)
                return (
                  <section key={r}>
                    <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-rule bg-surface/95 px-4 py-2.5 backdrop-blur">
                      <span className="flex min-w-0 items-center gap-2">
                        <RegChip id={r} size="sm" />
                        <span className="truncate text-xs text-ink-3">{REGULATIONS[r].reference}</span>
                      </span>
                      <span className="text-2xs text-ink-4">{group.length}</span>
                    </header>
                    <ul className="p-1.5">
                      {group.map((o) => {
                        const isSel = selected?.id === o.id
                        return (
                          <li key={o.id}>
                            <button
                              onClick={() =>
                                setParams((prev) => {
                                  const next = new URLSearchParams(prev)
                                  next.set('obligation', o.id)
                                  next.delete('recyf')
                                  return next
                                })
                              }
                              className={cn(
                                'w-full rounded-md px-3 py-2 text-left transition-colors',
                                isSel ? 'bg-accent-wash' : 'hover:bg-raised',
                              )}
                            >
                              <span className={cn('block text-sm leading-snug', isSel ? 'font-medium text-accent-strong' : o.inScope ? 'text-ink' : 'text-ink-3')}>
                                {o.title}
                              </span>
                              <span className="mt-0.5 flex items-center gap-1.5 text-2xs text-ink-4">
                                {o.shortRef ?? o.article}
                                {!o.inScope ? <span className="text-ink-4">· hors périmètre</span> : null}
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                )
              })}
            </div>
          </div>

          {/* Détail --------------------------------------------------- */}
          {selected ? (
            <ObligationDetail
              key={selected.id}
              obligation={selected}
              recyf={recyfForObligation(selected, scoping.nis2Category)}
              statuses={scoping.entity?.measures}
              openObjective={recyfParam ?? undefined}
            />
          ) : null}
        </div>
      )}
    </>
  )
}

/* ========================================================================== */

function ObligationDetail({
  obligation: o,
  recyf,
  statuses,
  openObjective,
}: {
  obligation: ScopedObligation
  recyf: ReturnType<typeof recyfForObligation>
  statuses?: Record<string, MeasureStatus>
  openObjective?: number
}) {
  const reg = REGULATIONS[o.regulation]
  const tier = reg.sanctions.find((s) => s.id === o.sanctionTier)
  const binding = BINDING_LABEL[o.binding]

  return (
    <article className="min-w-0">
      <Card>
        {/* En-tête : où l'on est, de quoi il s'agit, ce que cela pèse */}
        <div className="border-b border-rule px-6 py-5">
          <nav aria-label="Emplacement dans le texte" className="flex flex-wrap items-center gap-1.5 text-xs text-ink-3">
            <RegChip id={o.regulation} size="sm" />
            <ChevronRight size={12} className="text-ink-4" />
            <span className="truncate">{o.chapter}</span>
          </nav>
          <div className="mt-3 flex items-start justify-between gap-3">
            <h2 className="text-xl font-semibold tracking-tight text-ink">{o.title}</h2>
            <NoteButton anchor={{ kind: 'obligation', id: o.id, label: `${REGULATION_SHORT[o.regulation]} · ${o.shortRef ?? o.article} — ${o.title}` }} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Tag>{o.article}</Tag>
            <Tag tone={binding.tone}>{binding.label}</Tag>
            <span className="inline-flex items-center gap-1.5 text-2xs text-ink-3">
              Effort
              <span className="flex gap-0.5" aria-label={`Effort ${o.effort} sur 5`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} className={cn('h-1.5 w-3 rounded-full', n <= o.effort ? 'bg-accent' : 'bg-overlay')} />
                ))}
              </span>
            </span>
          </div>
        </div>

        {!o.inScope && o.unmetConditions.length > 0 ? (
          <div className="border-b border-rule px-5 py-3">
            <Callout tone="neutral" title="Hors du périmètre de cette entité">
              <ul className="list-inside list-disc space-y-1">
                {o.unmetConditions.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </Callout>
          </div>
        ) : null}

        <div className="space-y-6 px-6 py-5">
          {/* Ce qu'il faut faire */}
          <section>
            <DetailHeading>Ce que le texte impose</DetailHeading>
            <p className="mt-2.5 text-base leading-relaxed text-ink">{o.statement}</p>
          </section>

          {/* Citation */}
          {o.quote ? <Citation regulation={o.regulation} reference={`${reg.reference} — ${o.article}`}>{o.quote}</Citation> : null}

          {/* Exigences */}
          <section>
            <DetailHeading count={o.requirements.length}>Exigences élémentaires</DetailHeading>
            <ol className="mt-2.5 space-y-2">
              {o.requirements.map((r, i) => (
                <li key={r.id} className="flex gap-3 border-b border-rule pb-2 last:border-0 last:pb-0">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-overlay text-[10px] font-semibold text-ink-2">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-relaxed text-ink-2">{r.text}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Tag>{REQ_TYPE_LABEL[r.type]}</Tag>
                      {r.appliesWhen ? <Tag tone="caution">{r.appliesWhen}</Tag> : null}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          {recyf.length > 0 ? <RecyfPanel objectives={recyf} statuses={statuses} defaultOpen={openObjective} /> : null}

          {/* Deux colonnes : échéance / preuves */}
          <div className="grid gap-5 sm:grid-cols-2">
            <section>
              <DetailHeading>Échéance</DetailHeading>
              <div className="mt-2.5 rounded-sm bg-sunken px-3 py-2.5">
                <div className="text-sm font-medium text-ink">{o.deadline.label}</div>
                {o.deadline.hours ? (
                  <div className="mt-1 font-mono text-2xs text-ink-3">
                    Horloge la plus courte : {formatDelay(o.deadline.hours)}
                  </div>
                ) : null}
                <div className="mt-1.5 text-2xs uppercase tracking-wide text-ink-4">
                  {o.deadline.kind === 'declenchee'
                    ? 'Déclenchée par un événement'
                    : o.deadline.kind === 'recurrente'
                      ? 'Récurrente'
                      : o.deadline.kind === 'ponctuelle'
                        ? 'Ponctuelle'
                        : 'Permanente'}
                </div>
              </div>
            </section>

            <section>
              <DetailHeading>Preuves attendues</DetailHeading>
              <ul className="mt-2.5 space-y-1.5">
                {o.evidence.map((e, i) => (
                  <li key={i} className="flex gap-2 text-sm text-ink-2">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-rule-3" aria-hidden />
                    {e}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Sanction */}
          {tier ? (
            <section>
              <DetailHeading>Régime de sanction</DetailHeading>
              <div className="mt-2.5 rounded-sm border border-critical-line bg-critical-wash px-3 py-2.5">
                <div className="text-sm font-medium text-critical">{tier.label}</div>
                <div className="ref mt-0.5 text-ink-3">{tier.basis}</div>
                {tier.note ? <p className="mt-1.5 text-xs leading-relaxed text-ink-2">{tier.note}</p> : null}
              </div>
            </section>
          ) : null}

          {/* Croisements */}
          {o.themes.length > 0 ? (
            <section>
              <DetailHeading>Croisements avec les autres textes</DetailHeading>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {o.themes.map((t) => {
                  const theme = CROSSWALK_BY_ID.get(t)
                  if (!theme) return null
                  const others = theme.mappings
                    .map((m) => m.regulation)
                    .filter((r) => r !== o.regulation)
                  return (
                    <Tooltip
                      key={t}
                      content={
                        others.length > 0
                          ? `Recoupe ${others.map((r) => (r === 'NIS2' ? 'NIS 2' : r)).join(', ')} — ${theme.unifiedAction}`
                          : theme.summary
                      }
                    >
                      <Link
                        to={`/app/croisements?theme=${t}`}
                        className="inline-flex items-center gap-1.5 rounded-xs border border-rule-2 bg-surface px-2 py-1 text-xs text-ink-2 hover:border-accent-line hover:bg-accent-wash hover:text-accent"
                      >
                        <span className="ref text-ink-4">{theme.code}</span>
                        {theme.title}
                        {others.length > 0 ? (
                          <span className="flex gap-0.5">
                            {others.map((r) => (
                              <span
                                key={r}
                                className="size-1.5 rounded-full"
                                style={{ background: `var(--c-${r.toLowerCase()})` }}
                                aria-hidden
                              />
                            ))}
                          </span>
                        ) : null}
                      </Link>
                    </Tooltip>
                  )
                })}
              </div>
            </section>
          ) : null}

          {/* Doctrine et sources */}
          {o.guidance && o.guidance.length > 0 ? (
            <section>
              <DetailHeading>Doctrine et textes d'application</DetailHeading>
              <ul className="mt-2.5 space-y-1.5">
                {o.guidance.map((g) => (
                  <li key={g.url}>
                    <a
                      href={g.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-start gap-1.5 text-sm text-accent hover:underline"
                    >
                      <ExternalLink size={12} className="mt-1 shrink-0" />
                      <span>
                        {g.label}
                        <span className="ml-1.5 text-ink-4">{g.issuer}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <div className="border-t border-rule bg-chrome px-5 py-2.5">
          <a
            href={o.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="ref inline-flex items-center gap-1.5 text-accent hover:underline"
          >
            <ExternalLink size={11} />
            Texte officiel — {reg.reference}
          </a>
        </div>
      </Card>
    </article>
  )
}

function DetailHeading({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
      {children}
      {typeof count === 'number' ? <span className="rounded-md bg-overlay px-1.5 text-2xs font-medium text-ink-3">{count}</span> : null}
    </h3>
  )
}

const REGULATION_SHORT: Record<string, string> = { RGPD: 'RGPD', NIS2: 'NIS 2', DORA: 'DORA', CRA: 'CRA' }
