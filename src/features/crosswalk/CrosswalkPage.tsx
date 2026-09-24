import { lazy, Suspense, useMemo, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { ArrowRight, Scale, Sigma, TriangleAlert } from 'lucide-react'
import {
  Callout,
  Card,
  EmptyState,
  PageHeader,
  RegChip,
  SectionRule,
  Tag,
} from '@/components/ui/primitives'
import { DOMAIN_LABEL, RELATION_STYLE } from '@/components/ui/tokens'
import { SegmentedControl, Switch, Tabs, TabsList, TabTrigger, TabPanel, Tooltip } from '@/components/ui/controls'
import { CROSSWALK, CROSSWALK_BY_ID } from '@/data/crosswalk'
import { OBLIGATION_BY_ID, recyfForTheme } from '@/engines/corpus'
import { REGULATION_ORDER } from '@/data/regulations'
import { useScoping } from '@/lib/hooks'
import { NoteButton } from '@/components/notes/NoteButton'
import { RecyfPanel } from '@/components/recyf/RecyfPanel'
import { cn } from '@/lib/utils'
import { DOMAINS, type CrosswalkRelation, type CrosswalkTheme, type MeasureStatus, type RegulationId } from '@/types/domain'
import { tr } from '@/i18n'
import { isoThemeView, type IsoContext } from '@/engines/iso'
import { IsoCell, IsoHeader, IsoThemeSection } from './IsoCrosswalk'

const CrosswalkOverlap = lazy(() => import('./CrosswalkOverlap'))

type RelFilter = 'tous' | CrosswalkRelation

export default function CrosswalkPage() {
  const scoping = useScoping()
  const [params, setParams] = useSearchParams()
  const [rel, setRel] = useState<RelFilter>('tous')
  const [scopeOnly, setScopeOnly] = useState(true)

  const effectiveScopeOnly = scoping.qualified && scopeOnly
  const selectedId = params.get('theme')

  const themes = useMemo(() => {
    return CROSSWALK.filter((t) => (rel === 'tous' ? true : t.relation === rel)).filter((t) =>
      effectiveScopeOnly ? t.mappings.some((m) => scoping.applicable.includes(m.regulation)) : true,
    )
  }, [rel, effectiveScopeOnly, scoping.applicable])

  const selected = selectedId ? (CROSSWALK_BY_ID.get(selectedId) ?? null) : null

  const counts = useMemo(() => {
    const base = effectiveScopeOnly
      ? CROSSWALK.filter((t) => t.mappings.some((m) => scoping.applicable.includes(m.regulation)))
      : CROSSWALK
    return {
      tous: base.length,
      recouvrement: base.filter((t) => t.relation === 'recouvrement').length,
      divergence: base.filter((t) => t.relation === 'divergence').length,
      hierarchie: base.filter((t) => t.relation === 'hierarchie').length,
    }
  }, [effectiveScopeOnly, scoping.applicable])

  const select = (id: string | null) =>
    setParams((p) => {
      const next = new URLSearchParams(p)
      if (id) next.set('theme', id)
      else next.delete('theme')
      return next
    })

  const activeRegs: RegulationId[] = effectiveScopeOnly ? scoping.applicable : REGULATION_ORDER

  return (
    <>
      <PageHeader
        eyebrow={tr('Référentiel', 'Reference')}
        title={tr('Carte de croisement', 'Crosswalk map')}
        lead={tr("Où une seule action satisfait plusieurs textes, où ils divergent et laquelle des règles commande, et où l'un prime explicitement sur l'autre.", 'Where a single action satisfies several texts, where they diverge and which rule prevails, and where one explicitly overrides the other.')}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SegmentedControl<RelFilter>
          ariaLabel={tr('Filtrer par nature du croisement', 'Filter by type of overlap')}
          value={rel}
          onChange={setRel}
          options={[
            { value: 'tous', label: tr('Tous', 'All'), count: counts.tous },
            { value: 'recouvrement', label: tr('Recouvrements', 'Overlaps'), count: counts.recouvrement },
            { value: 'divergence', label: tr('Divergences', 'Divergences'), count: counts.divergence },
            { value: 'hierarchie', label: tr('Hiérarchies', 'Precedence'), count: counts.hierarchie },
          ]}
        />
        {scoping.qualified ? (
          <label className="inline-flex items-center gap-2 rounded-sm border border-rule bg-surface px-2.5 py-1.5 text-xs text-ink-2">
            <Switch checked={scopeOnly} onCheckedChange={setScopeOnly} label={tr("Périmètre de l'entité", "Entity's scope")} />
            {tr("Périmètre de l'entité", "Entity's scope")}
          </label>
        ) : null}
      </div>

      <Tabs defaultValue="matrice">
        <TabsList className="mb-4">
          <TabTrigger value="matrice" count={themes.length}>{tr('Matrice', 'Matrix')}</TabTrigger>
          <TabTrigger value="graphe">{tr('Mutualisation', 'Shared actions')}</TabTrigger>
          <TabTrigger value="lecture">{tr("Mode d'emploi", 'How to read')}</TabTrigger>
        </TabsList>

        <TabPanel value="matrice">
          {themes.length === 0 ? (
            <EmptyState title={tr('Aucun croisement ne correspond aux filtres', 'No theme matches the filters')} />
          ) : (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_23rem]">
              <Matrix themes={themes} regs={activeRegs} selectedId={selectedId} onSelect={select} iso={scoping.qualified ? scoping.iso.context : undefined} />
              <div className="min-w-0">
                {selected ? (
                  <ThemeDetail theme={selected} activeRegs={activeRegs} nis2Category={scoping.nis2Category} statuses={scoping.measureStatuses} showAnssi={!scoping.doraPrevails} iso={scoping.qualified ? scoping.iso.context : undefined} />
                ) : (
                  <Card className="p-5">
                    <div className="hatch mb-3 h-6 rounded-xs opacity-30" aria-hidden />
                    <h3 className="text-sm font-semibold text-ink">{tr('Sélectionnez un thème', 'Select a theme')}</h3>
                    <p className="mt-1.5 text-sm text-ink-3">
                      {tr("La fiche détaille l'exigence unifiée, ce que chaque texte demande précisément et, en cas de divergence, la règle qui commande en pratique.", 'The card details the unified requirement, what each text asks for precisely and, in case of divergence, the rule that prevails in practice.')}
                    </p>
                  </Card>
                )}
              </div>
            </div>
          )}
        </TabPanel>

        <TabPanel value="graphe">
          <Suspense
            fallback={
              <div className="flex h-[32rem] items-center justify-center text-sm text-ink-3">
                {tr('Chargement…', 'Loading…')}
              </div>
            }
          >
            <CrosswalkOverlap themes={themes} regs={activeRegs} onSelect={select} selectedId={selectedId} />
          </Suspense>
          {selected ? (
            <div className="mt-5 max-w-3xl">
              <ThemeDetail theme={selected} activeRegs={activeRegs} nis2Category={scoping.nis2Category} statuses={scoping.measureStatuses} showAnssi={!scoping.doraPrevails} iso={scoping.qualified ? scoping.iso.context : undefined} />
            </div>
          ) : null}
        </TabPanel>

        <TabPanel value="lecture">
          <ReadingGuide />
        </TabPanel>
      </Tabs>
    </>
  )
}

/* ==========================================================================
   Matrice : thèmes en lignes, règlements en colonnes. Les cellules portent
   les articles : c'est ce qui distingue une carte de croisement d'un simple
   tableau de correspondance.
   ========================================================================== */

/** Référence d'article compactée pour les cellules de la matrice. */
function shortRef(obligationId: string): string {
  const o = OBLIGATION_BY_ID.get(obligationId)
  if (!o) return obligationId
  if (o.shortRef) return o.shortRef
  return o.article
    .replace(/^Articles? /, '')
    .replace(/, paragraphe (\d+)/g, '§$1')
    .replace(/, point ([a-z])\)/g, '.$1')
    .replace(/ (à|to) /, '–')
    .replace(/ (et|and) /, ', ')
}

function Matrix({
  themes,
  regs,
  selectedId,
  onSelect,
  iso,
}: {
  themes: CrosswalkTheme[]
  regs: RegulationId[]
  selectedId: string | null
  onSelect: (id: string) => void
  iso?: IsoContext
}) {
  const byDomain = DOMAINS.map((d) => ({ domain: d, items: themes.filter((t) => t.domain === d) })).filter(
    (g) => g.items.length > 0,
  )

  return (
    <div className="min-w-0 overflow-x-auto rounded-md border border-rule bg-surface">
      <table className="w-full min-w-[40rem] border-collapse text-left">
        <thead className="sticky top-0 z-10 bg-chrome">
          <tr className="border-b border-rule-2">
            <th scope="col" className="label-caps px-3 py-2.5 font-semibold">
              {tr('Exigence unifiée', 'Unified requirement')}
            </th>
            {regs.map((r) => (
              <th key={r} scope="col" className="w-[4.75rem] px-1.5 py-2.5">
                <RegChip id={r} size="sm" />
              </th>
            ))}
            {iso ? (
              <th scope="col" className="w-[6.25rem] px-1.5 py-2.5">
                <IsoHeader />
              </th>
            ) : null}
            <th scope="col" className="label-caps w-[4.5rem] px-2 py-2.5 text-right font-semibold">
              {tr('Nature', 'Type')}
            </th>
          </tr>
        </thead>

        {byDomain.map((group) => (
          <tbody key={group.domain}>
            <tr>
              <th
                colSpan={regs.length + 2 + (iso ? 1 : 0)}
                scope="colgroup"
                className="border-y border-rule bg-sunken px-3 py-1.5 text-left"
              >
                <span className="label-caps">{DOMAIN_LABEL[group.domain]}</span>
              </th>
            </tr>
            {group.items.map((t) => {
              const isSel = t.id === selectedId
              return (
                <tr
                  key={t.id}
                  onClick={() => onSelect(t.id)}
                  className={cn(
                    'cursor-pointer border-b border-rule transition-colors last:border-0',
                    isSel ? 'bg-accent-wash' : 'hover:bg-sunken',
                  )}
                >
                  <th scope="row" className="px-3 py-2.5 text-left font-normal">
                    <span className="ref block text-ink-4">{t.code}</span>
                    <span className={cn('block text-sm leading-snug', isSel ? 'font-medium text-ink' : 'text-ink-2')}>
                      {t.title}
                    </span>
                  </th>

                  {regs.map((r) => {
                    const m = t.mappings.find((x) => x.regulation === r)
                    if (!m) {
                      return (
                        <td key={r} className="px-1.5 py-2.5 text-center">
                          <span className="text-ink-4" aria-label={tr('Non couvert par ce texte', 'Not covered by this text')}>
                            ·
                          </span>
                        </td>
                      )
                    }
                    const articles = m.obligationIds.map((id) => shortRef(id))
                    return (
                      <td key={r} className="px-1.5 py-2.5 align-top">
                        <Tooltip content={m.requirement}>
                          <span className="flex flex-wrap gap-1">
                            {articles.map((a, i) => (
                              <span
                                key={i}
                                className="ref rounded-xs px-1 py-0.5"
                                style={{
                                  background: `var(--c-${r.toLowerCase()}-wash)`,
                                  boxShadow: `inset 0 0 0 1px var(--c-${r.toLowerCase()}-line)`,
                                  color: `var(--c-${r.toLowerCase()}-ink)`,
                                }}
                              >
                                {a}
                              </span>
                            ))}
                          </span>
                        </Tooltip>
                      </td>
                    )
                  })}

                  {iso ? (
                    <td className="px-1.5 py-2.5 align-top">
                      <IsoCell view={isoThemeView(t.id, iso)} />
                    </td>
                  ) : null}

                  <td className="px-2 py-2.5 text-right">
                    {t.relation === 'recouvrement' ? (
                      <span className="text-2xs text-ink-4">{tr('Recouvr.', 'Overlap')}</span>
                    ) : (
                      <Tag tone={t.relation === 'divergence' ? 'critical' : 'brass'}>
                        {t.relation === 'divergence' ? tr('Diverg.', 'Diverg.') : tr('Hiérar.', 'Preced.')}
                      </Tag>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        ))}
      </table>
    </div>
  )
}

/* ========================================================================== */

function ThemeDetail({
  theme: t,
  activeRegs,
  nis2Category,
  statuses,
  showAnssi,
  iso,
}: {
  theme: CrosswalkTheme
  activeRegs: RegulationId[]
  nis2Category: 'essentielle' | 'importante' | null
  statuses?: Record<string, MeasureStatus>
  showAnssi: boolean
  iso?: IsoContext
}) {
  // Les exigences ReCyF n'ont de sens que si NIS2 porte ce thème et concerne l'entité.
  const recyf = t.mappings.some((m) => m.regulation === 'NIS2') && activeRegs.includes('NIS2') && showAnssi ? recyfForTheme(t.recyf, nis2Category) : []
  const rel = RELATION_STYLE[t.relation]

  return (
    <article className="xl:sticky xl:top-[calc(var(--bar)+1.5rem)]">
      <SectionRule aside={<span className="ref">{t.code}</span>}>{tr('Exigence unifiée', 'Unified requirement')}</SectionRule>

      <Card className="mt-3 max-h-[75vh] overflow-y-auto">
        <div className={cn('border-b border-rule px-4 py-3.5', rel.wash)}>
          <div className="flex items-center gap-1.5">
            {t.relation === 'divergence' ? (
              <TriangleAlert size={12} className={rel.text} />
            ) : t.relation === 'hierarchie' ? (
              <Scale size={12} className={rel.text} />
            ) : (
              <Sigma size={12} className={rel.text} />
            )}
            <span className={cn('text-2xs font-semibold uppercase tracking-wide', rel.text)}>{rel.label}</span>
            <span className="ml-auto text-2xs text-ink-3">{DOMAIN_LABEL[t.domain]}</span>
          </div>
          <div className="mt-1.5 flex items-start justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-ink">{t.title}</h2>
            <NoteButton anchor={{ kind: 'theme', id: t.id, label: t.title }} />
          </div>
        </div>

        <div className="space-y-5 px-4 py-4">
          <p className="text-sm leading-relaxed text-ink-2">{t.summary}</p>

          {/* L'action unique */}
          <section className="rounded-sm border border-accent-line bg-accent-wash px-3.5 py-3">
            <div className="label-caps mb-1 flex items-center gap-1.5 text-accent">
              <ArrowRight size={11} />
              {tr("L'action à mener", 'The action to take')}
            </div>
            <p className="text-sm leading-relaxed text-ink">{t.unifiedAction}</p>
          </section>

          {/* Divergence : la règle qui commande */}
          {t.strictest ? (
            <section className="rounded-sm border border-critical-line bg-critical-wash px-3.5 py-3">
              <div className="label-caps mb-1.5 text-critical">{tr('La règle qui commande', 'The prevailing rule')}</div>
              <div className="flex items-center gap-2">
                <RegChip id={t.strictest.regulation} />
                <span className="text-sm font-medium text-ink">{t.strictest.rule}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink-2">{t.strictest.rationale}</p>
            </section>
          ) : null}

          {/* Hiérarchie */}
          {t.precedence ? (
            <section className="rounded-sm border border-brass-line bg-brass-wash px-3.5 py-3">
              <div className="label-caps mb-1.5 text-brass">{tr('Texte qui prime', 'Prevailing text')}</div>
              <div className="flex flex-wrap items-center gap-2">
                <RegChip id={t.precedence.prevails} />
                <span className="text-xs text-ink-3">{tr('prime sur', 'prevails over')}</span>
                {t.precedence.over.map((o) => (
                  <RegChip key={o} id={o} muted />
                ))}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink-2">{t.precedence.basis}</p>
            </section>
          ) : null}

          {/* Ce que chaque texte demande */}
          <section>
            <SectionRule>{tr('Exigence texte par texte', 'Requirement text by text')}</SectionRule>
            <ul className="mt-2.5 space-y-3">
              {t.mappings.map((m) => {
                const inScope = activeRegs.includes(m.regulation)
                return (
                  <li
                    key={m.regulation}
                    className={cn('border-l-2 pl-3', !inScope && 'opacity-55')}
                    style={{ borderColor: `var(--c-${m.regulation.toLowerCase()})` }}
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <RegChip id={m.regulation} size="sm" muted={!inScope} />
                      {m.obligationIds.map((id) => {
                        const ob = OBLIGATION_BY_ID.get(id)
                        return ob ? (
                          <Link
                            key={id}
                            to={`/app/corpus?obligation=${id}`}
                            className="ref text-ink-3 hover:text-accent hover:underline"
                          >
                            {ob.article}
                          </Link>
                        ) : null
                      })}
                      {!inScope ? <Tag>{tr('Hors périmètre', 'Out of scope')}</Tag> : null}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-ink-2">{m.requirement}</p>
                    {m.nuance ? (
                      <p className="mt-1.5 border-l border-rule-2 pl-2 text-xs italic leading-relaxed text-ink-3">
                        {m.nuance}
                      </p>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </section>

          {iso ? <IsoThemeSection view={isoThemeView(t.id, iso)} /> : null}

          <RecyfPanel objectives={recyf} statuses={statuses} compact />

          {/* Preuves */}
          <section>
            <SectionRule aside={tr(`Charge ${t.effort}/5`, `Effort ${t.effort}/5`)}>{tr('Preuves attendues', 'Expected evidence')}</SectionRule>
            <ul className="mt-2 space-y-1.5">
              {t.evidence.map((e, i) => (
                <li key={i} className="flex gap-2 text-sm text-ink-2">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-rule-3" aria-hidden />
                  {e}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </Card>
    </article>
  )
}

/* ========================================================================== */

function ReadingGuide() {
  return (
    <div className="grid max-w-4xl gap-4 sm:grid-cols-3">
      {(['recouvrement', 'divergence', 'hierarchie'] as CrosswalkRelation[]).map((r) => {
        const s = RELATION_STYLE[r]
        const body = {
          recouvrement: tr("Les textes demandent la même chose, à des degrés de précision différents. Une action unique, calibrée sur l'exigence la plus détaillée, les satisfait tous. C'est le cas le plus fréquent, et la source principale d'économie dans un plan de conformité.", 'The texts ask for the same thing, at different levels of detail. A single action, calibrated on the most detailed requirement, satisfies them all. This is the most common case, and the main source of savings in a compliance plan.'),
          divergence: tr("Les textes traitent du même sujet mais posent des exigences inconciliables : un délai plus court, une mesure nommée, un format imposé. Il faut alors identifier la règle la plus stricte et dimensionner sur elle : satisfaire la plus exigeante satisfait les autres, l'inverse est faux.", 'The texts address the same subject but set irreconcilable requirements: a shorter deadline, a named measure, a mandated format. You then identify the strictest rule and size for it: meeting the most demanding one meets the others, not the reverse.'),
          hierarchie: tr("Un texte écarte expressément l'autre sur un champ donné. Ce n'est pas un arbitrage à faire mais une règle de droit à constater : appliquer les deux en parallèle est une erreur, pas une précaution.", 'One text expressly sets the other aside in a given area. It is not a judgment call but a rule of law to acknowledge: applying both in parallel is a mistake, not a precaution.'),
        }[r]
        return (
          <Card key={r} className={cn('border-l-2 p-4', s.line.replace('border-', 'border-l-'))}>
            <div className={cn('label-caps', s.text)}>{s.label}</div>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">{body}</p>
          </Card>
        )
      })}

      <Callout tone="neutral" className="sm:col-span-3" title={tr('Une précision sur la méthode', 'A note on method')}>
        {tr("Les croisements portent sur des exigences, non sur des articles. Deux articles peuvent traiter du même sujet sans se recouper, par exemple lorsque l'un fixe une obligation de moyens et l'autre une obligation de résultat. La carte identifie l'action commune, puis signale explicitement là où la mutualisation cesse d'être possible.", 'The crosswalk works on requirements, not articles. Two articles can deal with the same subject without overlapping, for instance when one sets a best-efforts obligation and the other an obligation of result. The map identifies the shared action, then explicitly flags where sharing stops being possible.')}
      </Callout>
    </div>
  )
}
