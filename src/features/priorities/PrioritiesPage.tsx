import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Lock, RotateCcw, Sigma } from 'lucide-react'
import {
  Bar,
  Callout,
  Card,
  EmptyState,
  Ladder,
  PageHeader,
  RegChip,
  SectionRule,
  Tag,
} from '@/components/ui/primitives'
import { RELATION_STYLE } from '@/components/ui/tokens'
import { LinkButton, Slider, Tooltip } from '@/components/ui/controls'
import { useScoping } from '@/lib/hooks'
import { NextStep } from '@/components/layout/NextStep'
import { useEntityEditor } from '@/lib/queries'
import {
  COVERAGE_LABEL,
  DEFAULT_WEIGHTS,
  WAVES,
  WEIGHT_LABELS,
} from '@/engines/prioritisation'
import { CROSSWALK_BY_ID } from '@/data/crosswalk'
import { cn } from '@/lib/utils'
import type { PriorityWeights, PrioritisedItem } from '@/types/domain'

export default function PrioritiesPage() {
  const scoping = useScoping()
  const profile = scoping.entity
  const edit = useEntityEditor()
  const setWeights = (w: PriorityWeights) => edit({ weights: w })
  const resetWeights = () => edit({ weights: {} })
  const [params, setParams] = useSearchParams()

  const selectedId = params.get('theme')
  const selected = useMemo(
    () => scoping.prioritised.find((p) => p.themeId === selectedId) ?? null,
    [scoping.prioritised, selectedId],
  )

  if (!profile) return null

  if (!scoping.qualified) {
    return (
      <>
        <PageHeader eyebrow={profile.name} title="Priorisation" />
        <EmptyState
          title="Qualification requise"
          action={<LinkButton to="/app/qualification" variant="primary">Qualifier l'entité</LinkButton>}
        >
          L'ordre de traitement dépend des textes applicables et des sanctions encourues. Il ne peut
          pas être calculé avant la qualification.
        </EmptyState>
      </>
    )
  }

  const weights = scoping.weights
  const total = Object.values(weights).reduce((a, b) => a + b, 0)
  const isDefault = (Object.keys(DEFAULT_WEIGHTS) as (keyof PriorityWeights)[]).every(
    (k) => weights[k] === DEFAULT_WEIGHTS[k],
  )
  /*
   * Les scores se tiennent dans une bande étroite : rapportés au maximum, tous
   * les segments paraîtraient pleins. On les étale sur l'étendue observée, ce
   * qui rend l'écart entre deux rangs voisins réellement lisible.
   */
  const scores = scoping.prioritised.map((p) => p.score)
  const scoreMin = scores.length > 0 ? Math.min(...scores) : 0
  const scoreMax = scores.length > 0 ? Math.max(...scores) : 1
  const scale = (v: number) =>
    scoreMax === scoreMin ? 1 : 0.18 + 0.82 * ((v - scoreMin) / (scoreMax - scoreMin))

  return (
    <>
      <PageHeader
        eyebrow={profile.name}
        title="Ordre de traitement"
        lead="Le score est une décision explicite, pas un verdict. Chaque facteur est exposé avec son poids et sa justification ; si l'arbitrage ne correspond pas à votre contexte, déplacez les curseurs."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_21rem] xl:grid-cols-[1fr_24rem]">
        {/* Classement --------------------------------------------------- */}
        <div className="min-w-0">
          <SectionRule aside={`${scoping.prioritised.length} exigences`}>Classement</SectionRule>

          <ol className="mt-3 space-y-1.5">
            {scoping.prioritised.map((item) => (
              <RankRow
                key={item.themeId}
                item={item}
                width={scale(item.score)}
                selected={item.themeId === selectedId}
                onSelect={() =>
                  setParams((p) => {
                    const next = new URLSearchParams(p)
                    if (next.get('theme') === item.themeId) next.delete('theme')
                    else next.set('theme', item.themeId)
                    return next
                  })
                }
              />
            ))}
          </ol>

          {selected ? (
            <div className="mt-5">
              <ScoreBreakdown item={selected} />
            </div>
          ) : (
            <Callout tone="neutral" className="mt-5">
              Sélectionnez une exigence pour voir le détail de son score : la valeur de chaque
              facteur, son poids, et la phrase qui justifie la valeur retenue.
            </Callout>
          )}
        </div>

        {/* Pondération -------------------------------------------------- */}
        <aside className="min-w-0 lg:sticky lg:top-[calc(var(--bar)+1.5rem)] lg:self-start">
          <SectionRule
            aside={
              !isDefault ? (
                <button onClick={resetWeights} className="inline-flex items-center gap-1 hover:text-accent">
                  <RotateCcw size={10} />
                  Défaut
                </button>
              ) : (
                'Réglage par défaut'
              )
            }
          >
            Pondération
          </SectionRule>

          <Card className="mt-3 p-4">
            <div className="space-y-4">
              {(Object.keys(WEIGHT_LABELS) as (keyof PriorityWeights)[]).map((key) => {
                const share = total > 0 ? weights[key] / total : 0
                return (
                  <div key={key}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                      <label className="text-sm font-medium text-ink">{WEIGHT_LABELS[key].label}</label>
                      <span className="font-mono text-2xs tabular text-ink-3">
                        {Math.round(share * 100)} %
                      </span>
                    </div>
                    <Slider
                      value={weights[key]}
                      onValueChange={(v) => setWeights({ ...weights, [key]: v })}
                      min={0}
                      max={50}
                      step={5}
                      label={WEIGHT_LABELS[key].label}
                    />
                    <p className="mt-1 text-2xs leading-snug text-ink-3">{WEIGHT_LABELS[key].hint}</p>
                  </div>
                )
              })}
            </div>
          </Card>

          <Callout tone="neutral" className="mt-4" title="Ce que la pondération ne change pas">
            Les dépendances techniques restent respectées quelle que soit la pondération : une
            exigence dont un prérequis n'est pas traité est repoussée d'une vague, même si son score
            la place en tête. On ne sécurise pas un système qu'on n'a pas recensé.
          </Callout>

          <Card className="mt-4 p-4">
            <div className="label-caps mb-2">Répartition par vague</div>
            <ul className="space-y-2">
              {WAVES.map((w) => {
                const count = scoping.prioritised.filter((p) => p.wave === w.n).length
                return (
                  <li key={w.n} className="flex items-baseline justify-between gap-2 border-b border-rule pb-2 last:border-0 last:pb-0">
                    <span className="min-w-0">
                      <span className="block text-sm text-ink">{w.label}</span>
                      <span className="block text-2xs text-ink-3">{w.horizon}</span>
                    </span>
                    <span className="font-mono text-sm tabular text-ink">{count}</span>
                  </li>
                )
              })}
            </ul>
            <div className="mt-3">
              <LinkButton to="/app/feuille-de-route" size="sm" variant="secondary" className="w-full">
                Voir la feuille de route
              </LinkButton>
            </div>
          </Card>
        </aside>
      </div>
      <div className="mt-6">
        <NextStep to="/app/feuille-de-route" label="Planifier : la feuille de route" hint="Les exigences réparties en quatre vagues" />
      </div>
    </>
  )
}

/* ========================================================================== */

function RankRow({
  item,
  width,
  selected,
  onSelect,
}: {
  item: PrioritisedItem
  /** Longueur relative de la barre, étalée sur l'étendue des scores. */
  width: number
  selected: boolean
  onSelect: () => void
}) {
  return (
    <li>
      <button
        onClick={onSelect}
        className={cn(
          'flex w-full items-center gap-3 rounded-sm border px-3 py-2.5 text-left transition-colors',
          selected ? 'border-accent-line bg-accent-wash' : 'border-rule bg-surface hover:bg-sunken',
        )}
      >
        <span className="w-6 shrink-0 text-right font-mono text-xs tabular text-ink-3">{item.rank}</span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-medium text-ink">{item.theme.title}</span>
            {item.theme.relation !== 'recouvrement' ? (
              <Tag tone={item.theme.relation === 'divergence' ? 'critical' : 'brass'}>
                {RELATION_STYLE[item.theme.relation].label}
              </Tag>
            ) : null}
            {item.blockedBy.length > 0 ? (
              <Tooltip
                content={`Prérequis à traiter d'abord : ${item.blockedBy
                  .map((id) => CROSSWALK_BY_ID.get(id)?.title ?? id)
                  .join(', ')}`}
              >
                <span className="inline-flex items-center gap-1 rounded-xs border border-rule-2 bg-sunken px-1 text-2xs text-ink-3">
                  <Lock size={9} />
                  Dépendance
                </span>
              </Tooltip>
            ) : null}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            {item.regulations.map((r) => (
              <RegChip key={r} id={r} size="sm" />
            ))}
            <span className="ref text-ink-4">{item.theme.code}</span>
          </span>
        </span>

        <span className="hidden w-28 shrink-0 sm:block">
          <Bar ratio={width} label={`Score ${(item.score * 100).toFixed(0)} sur 100`} />
          <span className="mt-1 block font-mono text-2xs tabular text-ink-4">
            {(item.score * 100).toFixed(0)}
          </span>
        </span>

        <span className="flex w-24 shrink-0 flex-col items-end gap-0.5">
          <Ladder level={item.coverage} size="sm" />
          <span className="text-2xs text-ink-4">{COVERAGE_LABEL[item.coverage]}</span>
        </span>

        <span className="w-14 shrink-0 text-right">
          <span className="ref text-ink-3">Vague {item.wave}</span>
        </span>
      </button>
    </li>
  )
}

/* ========================================================================== */

function ScoreBreakdown({ item }: { item: PrioritisedItem }) {
  const max = Math.max(...item.factors.map((f) => f.weighted))

  return (
    <Card>
      <div className="border-b border-rule px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Sigma size={13} className="text-accent" />
          <h2 className="text-base font-semibold text-ink">Composition du score</h2>
          <span className="ref ml-auto text-ink-3">
            {item.theme.code} · rang {item.rank} · vague {item.wave}
          </span>
        </div>
      </div>

      <div className="px-4 py-3">
        <ul className="space-y-3">
          {item.factors.map((f) => (
            <li key={f.key}>
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-ink">{f.label}</span>
                <span className="font-mono text-2xs tabular text-ink-3">
                  {(f.raw * 100).toFixed(0)} % · contribution {(f.weighted * 100).toFixed(1)}
                </span>
              </div>
              <Bar ratio={max > 0 ? f.weighted / max : 0} label={`${f.label} : contribution ${(f.weighted * 100).toFixed(1)}`} />
              <p className="mt-1 text-xs leading-relaxed text-ink-2">{f.rationale}</p>
            </li>
          ))}
        </ul>

        {item.blockedBy.length > 0 ? (
          <Callout tone="caution" className="mt-4" title="Repoussée d'une vague">
            Cette exigence dépend de{' '}
            {item.blockedBy.map((id, i) => (
              <span key={id}>
                {i > 0 ? ', ' : ''}
                <Link to={`/app/priorisation?theme=${id}`} className="font-medium underline underline-offset-2">
                  {CROSSWALK_BY_ID.get(id)?.title ?? id}
                </Link>
              </span>
            ))}
            , classée avant elle. L'ordonnancement la déplace donc en vague {item.wave}, malgré son
            score.
          </Callout>
        ) : null}

        <div className="mt-4 rounded-sm border border-accent-line bg-accent-wash px-3.5 py-3">
          <div className="label-caps mb-1 text-accent">L'action à mener</div>
          <p className="text-sm leading-relaxed text-ink">{item.theme.unifiedAction}</p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-rule pt-2.5">
          <Link to={`/app/croisements?theme=${item.themeId}`} className="ref text-accent hover:underline">
            Fiche de croisement →
          </Link>
          <Link to="/app/evaluation" className="ref text-ink-3 hover:text-accent hover:underline">
            Modifier l'évaluation →
          </Link>
        </div>
      </div>
    </Card>
  )
}
