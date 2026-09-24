import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  ArrowRight,
  BellRing,
  Building2,
  CheckCheck,
  FileText,
  ListOrdered,
  Plus,
  ScanSearch,
  ShieldHalf,
  Copy,
  RadioTower,
} from 'lucide-react'
import { Button, LinkButton } from '@/components/ui/controls'
import {
  Bar,
  Card,
  CardHeader,
  Disclaimer,
  EmptyState,
  IconTile,
  Led,
  LevelPill,
  PageHeader,
  RegChip,
  Reveal,
  ScoreRing,
  Tag,
} from '@/components/ui/primitives'
import { REG_STYLE, STATUS_STYLE } from '@/components/ui/tokens'
import { useNow, useScoping } from '@/lib/hooks'
import { useCopyDemo, useEntityEditor } from '@/lib/queries'
import { useSession } from '@/lib/store'
import { STATUS_LABEL } from '@/engines/qualification'
import { regulatoryAlerts, type Alert } from '@/engines/alerts'
import { authoritiesFor, readiness } from '@/engines/incidents'
import { DOMAIN_LABELS } from '@/engines/scores'
import { REGULATION_ORDER } from '@/data/regulations'
import { QUESTIONS } from '@/data/questionnaire'
import { cn, formatDate } from '@/lib/utils'
import type { Domain } from '@/types/domain'
import { IsoBadge } from '@/features/iso/IsoBadge'
import { FrameworkNote } from '@/components/ui/primitives'
import { formatPct } from '@/lib/utils'
import { COLON, tr } from '@/i18n'

export default function DashboardPage() {
  const scoping = useScoping()
  const { entity, loading } = scoping

  if (loading) return null
  if (!entity) return <NoEntity />

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={entity.is_demo ? tr('Entité de démonstration, lecture seule', 'Demo entity, read-only') : tr('Tableau de bord', 'Dashboard')}
        title={entity.name}
        lead={entity.scope_note || undefined}
        actions={
          <>
            {scoping.qualified ? <IsoBadge iso={entity.profile?.iso27001} /> : null}
            <LinkButton to="/app/qualification" icon={<ScanSearch size={14} />}>
              {tr('Qualification', 'Scoping')}
            </LinkButton>
            <LinkButton to="/app/rapport" variant="primary" icon={<FileText size={14} />}>
              {tr('Rapport', 'Report')}
            </LinkButton>
          </>
        }
      />

      {scoping.qualified ? <Qualified /> : <NotQualified answered={Object.keys(entity.answers).length} />}

      <Disclaimer />
    </div>
  )
}

/* ==========================================================================
   Aucune entité chargée
   ========================================================================== */

function NoEntity() {
  const copyDemo = useCopyDemo()
  const selectEntity = useSession((s) => s.selectEntity)
  return (
    <div className="mx-auto max-w-2xl pt-10">
      <EmptyState
        icon={<Building2 size={20} />}
        title={tr('Aucune entité ouverte', 'No entity open')}
        action={
          <>
            <LinkButton to="/app/entites?nouvelle=1" variant="primary" icon={<Plus size={14} />}>
              {tr('Créer une entité', 'Create an entity')}
            </LinkButton>
            <Button
              icon={<Copy size={14} />}
              disabled={copyDemo.isPending}
              onClick={async () => {
                const e = await copyDemo.mutateAsync()
                selectEntity(e.id)
              }}
            >
              {tr('Partir de la démonstration', 'Start from the demo')}
            </Button>
          </>
        }
      >
        {tr("Une entité, c'est l'organisation que vous cadrez : un client, une filiale, votre propre société. Créez-en une, ou partez d'une copie de Finexa, une fintech de 50 salariés déjà qualifiée et évaluée, pour explorer la plateforme.", 'An entity is the organisation you are scoping: a client, a subsidiary, your own company. Create one, or start from a copy of Finexa, a 50-person fintech already scoped and assessed, to explore the platform.')}
      </EmptyState>
    </div>
  )
}

function NotQualified({ answered }: { answered: number }) {
  return (
    <Card className="overflow-hidden p-8">
      <div className="flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <IconTile size="lg">
            <ScanSearch size={20} />
          </IconTile>
          <div className="max-w-xl">
            <h2 className="text-lg font-semibold text-ink">{tr('Tout part de la qualification', 'Everything starts with scoping')}</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">
              {answered > 0
                ? tr(
                    `${answered} réponse${answered > 1 ? 's' : ''} déjà enregistrée${answered > 1 ? 's' : ''}. Terminez le questionnaire pour établir les textes applicables, le score et les autorités à prévenir en cas d'incident.`,
                    `${answered} answer${answered > 1 ? 's' : ''} already saved. Finish the questionnaire to establish the applicable texts, the score and the authorities to notify in case of an incident.`,
                  )
                : tr(
                    "Une quarantaine de questions, chacune rattachée à l'article qu'elle établit. Le score, les priorités et la section incident en découlent.",
                    'About forty questions, each tied to the article it establishes. The score, priorities and incident section follow from them.',
                  )}
            </p>
          </div>
        </div>
        <LinkButton to="/app/qualification" variant="primary" icon={<ArrowRight size={14} />}>
          {answered > 0 ? tr('Reprendre', 'Resume') : tr('Commencer', 'Start')}
        </LinkButton>
      </div>
    </Card>
  )
}

/* ==========================================================================
   Entité qualifiée
   ========================================================================== */

function Qualified() {
  const scoping = useScoping()
  const { entity, qualification, applicable, scores, prioritised, readOnly } = scoping
  const now = useNow(60_000)
  const edit = useEntityEditor()
  const navigate = useNavigate()
  // Sur l'entité de démonstration, rien n'est écrit : on retient les alertes
  // consultées pour la session seulement.
  const [seenLocal, setSeenLocal] = useState<string[]>([])
  const seen = useMemo(() => [...entity!.seen_alerts, ...seenLocal], [entity, seenLocal])

  const alerts: Alert[] = useMemo(
    () => regulatoryAlerts(applicable, entity!.answers, seen, now),
    [entity, applicable, seen, now],
  )

  const markSeen = (ids: string[]) => {
    const fresh = ids.filter((id) => !seen.includes(id) && id.startsWith('TL:'))
    if (fresh.length === 0) return
    if (readOnly) setSeenLocal((s) => [...s, ...fresh])
    else edit((cur) => ({ seen_alerts: [...cur.seen_alerts, ...fresh] }))
  }

  const top = prioritised.slice(0, 5)
  const evaluated = scores.global.evaluated

  return (
    <div className="space-y-8">
      <Journey />

      {/* Score et verdicts */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Reveal>
          <Card className="h-full" >
            <div data-tour="score-ring" className="flex h-full flex-col gap-6 p-6 md:flex-row md:items-center">
              <div className="flex flex-col items-center gap-2">
                <ScoreRing value={scores.global.score} label={tr('couverture déclarée', 'reported coverage')} sublabel={tr(`${scores.global.themes} exigences unifiées`, `${scores.global.themes} unified requirements`)} />
                <span className="text-2xs text-ink-3">
                  {evaluated === scores.global.themes ? tr('Toutes évaluées', 'All assessed') : tr(`${evaluated} évaluée${evaluated > 1 ? 's' : ''} sur ${scores.global.themes}`, `${evaluated} of ${scores.global.themes} assessed`)}
                </span>
              </div>
              <div className="min-w-0 flex-1 space-y-4">
                <div className="label-caps">{tr('Par référentiel', 'By framework')}</div>
                {REGULATION_ORDER.filter((r) => scores.byRegulation[r]).map((r, i) => {
                  const line = scores.byRegulation[r]!
                  return (
                    <motion.div key={r} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.07 }}>
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <RegChip id={r} size="sm" />
                        <span className="tabular text-sm font-semibold text-ink">
                          {formatPct(line.score)}
                          <span className="ml-1.5 text-2xs font-normal text-ink-4">
                            {line.inPlace}/{line.themes}
                          </span>
                        </span>
                      </div>
                      <Bar ratio={line.score} color={REG_STYLE[r].hex} label={`${r}${COLON}${formatPct(line.score)}`} />
                    </motion.div>
                  )
                })}
                {evaluated === 0 ? (
                  <p className="text-2xs text-ink-3">
                    {tr("Aucune exigence évaluée pour l'instant.", 'No requirement assessed yet.')}{' '}
                    <Link to="/app/evaluation" className="text-accent hover:underline">
                      {tr("Commencer l'évaluation", 'Start the assessment')}
                    </Link>
                  </p>
                ) : null}
              </div>
            </div>
          </Card>
        </Reveal>

        <Reveal index={1}>
          <Card className="h-full">
            <CardHeader title={tr('Textes applicables', 'Applicable texts')} subtitle={tr('Issus de la qualification', 'From the scoping')} icon={<ShieldHalf size={16} />} />
            <ul className="divide-y divide-rule">
              {REGULATION_ORDER.map((r) => {
                const v = qualification!.verdicts[r]
                const st = STATUS_STYLE[v.status]
                return (
                  <li key={r} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <RegChip id={r} size="sm" muted={v.status === 'hors_champ'} />
                      <span className={cn('truncate text-sm', v.status === 'hors_champ' ? 'text-ink-3' : 'text-ink')}>
                        {v.qualification ?? tr('Non concerné', 'Not concerned')}
                      </span>
                    </div>
                    <span className={cn('inline-flex shrink-0 items-center gap-1.5 text-2xs font-medium', st.text)}>
                      <span className={cn('size-1.5 rounded-full', st.dot)} />
                      {STATUS_LABEL[v.status]}
                    </span>
                  </li>
                )
              })}
            </ul>
          </Card>
        </Reveal>
      </div>

      {/* Alertes */}
      <Reveal index={2}>
        <Card>
          <CardHeader
            title={tr('Alertes', 'Alerts')}
            subtitle={tr('Échéances réglementaires des six prochaines semaines', 'Regulatory deadlines in the next six weeks')}
            icon={<BellRing size={16} />}
            aside={
              alerts.some((a) => a.pulse && a.id.startsWith('TL:')) ? (
                <Button size="sm" variant="ghost" icon={<CheckCheck size={13} />} onClick={() => markSeen(alerts.map((a) => a.id))}>
                  {tr('Tout marquer comme lu', 'Mark all as read')}
                </Button>
              ) : null
            }
          />
          {alerts.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-3">{tr('Rien qui appelle une action dans les six prochaines semaines.', 'Nothing calls for action in the next six weeks.')}</p>
          ) : (
            <ul className="divide-y divide-rule">
              {alerts.map((a) => (
                <li key={a.id}>
                  <button
                    onClick={() => {
                      markSeen([a.id])
                      navigate(a.href)
                    }}
                    className="group flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-raised/60"
                  >
                    <span className="mt-1.5 flex w-2 justify-center">
                      {a.level === 'critical' ? (
                        <Led tone="critical" pulse={false} label={tr('Délai dépassé', 'Overdue')} />
                      ) : a.pulse ? (
                        <Led tone="accent" label={tr('Non consultée', 'Unread')} />
                      ) : (
                        <span className="size-1.5 rounded-full bg-ink-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className={cn('text-sm font-medium', a.level === 'critical' ? 'text-critical' : 'text-ink')}>{a.title}</span>
                        {a.level === 'critical' ? <Tag tone="critical">{tr('Délai dépassé', 'Overdue')}</Tag> : null}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-2xs leading-snug text-ink-3">{a.detail}</span>
                    </span>
                    <span className="shrink-0 font-mono text-2xs text-ink-4">{formatDate(a.date.toISOString())}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </Reveal>

      {/* Préparation au signalement */}
      <PreparationSummary />

      {/* Domaines et priorités */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-2">
        <Reveal index={4}>
          <Card className="h-full">
            <CardHeader title={tr('Couverture par domaine', 'Coverage by domain')} subtitle={tr('Part des exigences en place, partiel compté pour moitié', 'Share of requirements in place, partial counts for half')} icon={<ShieldHalf size={16} />} />
            <div className="space-y-3 px-5 py-4">
              {(Object.keys(scores.byDomain) as Domain[]).map((d) => {
                const l = scores.byDomain[d]!
                const tone = l.score >= 0.75 ? 'positive' : l.score >= 0.4 ? 'caution' : 'critical'
                return (
                  <div key={d} className="grid grid-cols-[8rem_1fr_3.5rem] items-center gap-3">
                    <span className="truncate text-xs text-ink-2">{DOMAIN_LABELS[d]}</span>
                    <Bar ratio={l.score} tone={l.evaluated === 0 ? 'accent' : tone} />
                    <span className="tabular text-right text-xs text-ink">{formatPct(l.score)}</span>
                  </div>
                )
              })}
            </div>
          </Card>
        </Reveal>

        <Reveal index={5}>
          <Card className="h-full">
            <CardHeader
              title={tr('Par quoi commencer', 'Where to start')}
              subtitle={tr('Les cinq exigences unifiées les mieux classées', 'The five top-ranked unified requirements')}
              icon={<ListOrdered size={16} />}
              aside={
                <Link to="/app/priorisation" className="text-xs text-accent hover:underline">
                  {tr('Tout voir', 'See all')}
                </Link>
              }
            />
            <ol className="divide-y divide-rule">
              {top.map((p) => (
                <li key={p.themeId} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-overlay font-mono text-2xs text-ink-2">{p.rank}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-ink">{p.theme.title}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {p.regulations.map((r) => (
                        <RegChip key={r} id={r} size="sm" />
                      ))}
                    </div>
                  </div>
                  <LevelPill level={p.coverage} />
                </li>
              ))}
            </ol>
          </Card>
        </Reveal>
      </div>

      {scoping.anssiApplies && scoping.measures.total > 0 ? (
        <Reveal index={6}>
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <IconTile color="var(--c-nis2)">
                  <ShieldHalf size={16} />
                </IconTile>
                <div>
                  <div className="text-sm font-semibold text-ink">{tr('Exigences NIS2 (ReCyF)', 'NIS2 requirements (ReCyF)')}</div>
                  <div className="text-2xs text-ink-3">
                    {tr(
                      `${scoping.measures.total} mesures du ReCyF attendues d'une entité ${scoping.nis2Category ?? ''}`,
                      `${scoping.measures.total} ReCyF measures expected of an ${scoping.nis2Category === 'essentielle' ? 'essential' : 'important'} entity`,
                    )}{' '}
                    · <FrameworkNote />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Tag tone="positive">{scoping.measures.en_place} {tr('en place', 'in place')}</Tag>
                <Tag tone="caution">{scoping.measures.partiel} {tr('partielles', 'partial')}</Tag>
                <Tag tone="critical">{scoping.measures.absent} {tr('absentes', 'missing')}</Tag>
                <Tag>{scoping.measures.non_evalue} {tr('non évaluées', 'not assessed')}</Tag>
                <LinkButton to="/app/evaluation?vue=anssi" size="sm">
                  {tr('Évaluer', 'Assess')}
                </LinkButton>
              </div>
            </div>
            <Bar className="mt-4" ratio={scoping.measures.score} color="var(--c-nis2)" />
          </Card>
        </Reveal>
      ) : null}
    </div>
  )
}

/* ==========================================================================
   Parcours de cadrage : où en est-on, et quelle est l'étape suivante
   ========================================================================== */

type StepState = 'fait' | 'en_cours' | 'a_faire'

function Journey() {
  const scoping = useScoping()
  const { entity, scores, applicable } = scoping
  const answered = QUESTIONS.filter((q) => q.required && entity!.answers[q.id] !== undefined && entity!.answers[q.id] !== '').length
  const required = QUESTIONS.filter((q) => q.required).length
  const ready = readiness(applicable, entity!.answers, entity!.contacts)
  const readyDone = ready.filter((r) => r.ok).length
  const g = scores.global
  const prioritised = Object.keys(entity!.weights ?? {}).length > 0 || g.evaluated === g.themes

  const steps: { n: number; label: string; detail: string; to: string; state: StepState }[] = [
    {
      n: 1,
      label: tr('Qualifier', 'Scope'),
      detail: scoping.qualified
        ? tr(`${applicable.length} texte${applicable.length > 1 ? 's' : ''} applicable${applicable.length > 1 ? 's' : ''}`, `${applicable.length} applicable text${applicable.length > 1 ? 's' : ''}`)
        : tr(`${Math.min(answered, required)} / ${required} réponses`, `${Math.min(answered, required)} / ${required} answers`),
      to: '/app/qualification',
      state: scoping.qualified ? 'fait' : 'en_cours',
    },
    {
      n: 2,
      label: tr('Évaluer', 'Assess'),
      detail: tr(`${g.evaluated} / ${g.themes} exigences`, `${g.evaluated} / ${g.themes} requirements`),
      to: '/app/evaluation',
      state: g.themes > 0 && g.evaluated === g.themes ? 'fait' : g.evaluated > 0 ? 'en_cours' : 'a_faire',
    },
    {
      n: 3,
      label: tr('Prioriser', 'Prioritise'),
      detail: g.evaluated > 0 ? tr('Ordre de traitement calculé', 'Treatment order computed') : tr('Après l’évaluation', 'After the assessment'),
      to: '/app/priorisation',
      state: prioritised ? 'fait' : g.evaluated > 0 ? 'en_cours' : 'a_faire',
    },
    {
      n: 4,
      label: tr('Préparer le signalement', 'Prepare reporting'),
      detail: tr(`${readyDone} / ${ready.length} points établis`, `${readyDone} / ${ready.length} points established`),
      to: '/app/signalement',
      state: readyDone === ready.length ? 'fait' : readyDone > 0 ? 'en_cours' : 'a_faire',
    },
    { n: 5, label: tr('Restituer', 'Report'), detail: tr('Note COMEX, rapport complet', 'Executive note, full report'), to: '/app/rapport', state: 'a_faire' },
  ]
  const currentIndex = steps.findIndex((s) => s.state !== 'fait')

  return (
    <nav aria-label={tr('Parcours de cadrage', 'Scoping journey')} className="grid grid-cols-1 overflow-hidden rounded-lg border border-rule-2 bg-surface sm:grid-cols-5">
      {steps.map((s, i) => {
        const current = i === currentIndex
        return (
          <Link
            key={s.n}
            to={s.to}
            aria-current={current ? 'step' : undefined}
            className={cn(
              'group relative flex items-start gap-3 border-rule px-4 py-3.5 transition-colors hover:bg-raised',
              i > 0 && 'border-t sm:border-l sm:border-t-0',
              current && 'bg-raised',
            )}
          >
            {current ? <span className="absolute inset-x-0 top-0 h-0.5 bg-accent" aria-hidden /> : null}
            <span
              className={cn(
                'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border font-mono text-[10px]',
                s.state === 'fait' ? 'border-positive bg-positive text-paper' : current ? 'border-accent text-accent' : 'border-rule-3 text-ink-4',
              )}
            >
              {s.state === 'fait' ? <CheckCheck size={11} strokeWidth={2.5} /> : s.n}
            </span>
            <span className="min-w-0">
              <span className={cn('block text-sm', current ? 'font-medium text-ink' : s.state === 'fait' ? 'text-ink-2' : 'text-ink-3')}>{s.label}</span>
              <span className="block truncate text-2xs text-ink-4">{s.detail}</span>
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

/* ==========================================================================
   Préparation au signalement : résumé
   ========================================================================== */

const SHORTEST: Record<string, string> = { RGPD: '72 h', NIS2: '24 h', DORA: '4 h', CRA: '24 h', AIACT: tr('2 j', '2 d') }

function PreparationSummary() {
  const { entity, applicable } = useScoping()
  const ready = readiness(applicable, entity!.answers, entity!.contacts)
  const missing = ready.filter((r) => !r.ok)
  const doraPrevails = applicable.includes('DORA') && entity!.answers.entite_financiere === 'oui'

  return (
    <Reveal index={3}>
      <div data-tour="incident-section">
      <Card>
        <CardHeader
          title={tr('Préparation au signalement', 'Reporting readiness')}
          subtitle={tr('Qui notifier et dans quel délai, si un incident survenait', 'Who to notify and how fast, should an incident occur')}
          icon={<RadioTower size={16} />}
          aside={
            <Link to="/app/signalement" className="text-xs text-accent hover:underline">
              {tr('Détail et simulation', 'Details and simulation')}
            </Link>
          }
        />
        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_20rem]">
          <ul className="grid gap-2 sm:grid-cols-2">
            {applicable.map((r) => {
              const names = authoritiesFor(r, entity!.answers).map((a) => a.name.split(' (')[0].split(',')[0]).join(' / ')
              const viaDora = r === 'NIS2' && doraPrevails
              return (
                <li key={r} className="flex items-center justify-between gap-3 rounded-md border border-rule-2 bg-sunken px-3 py-2.5">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <RegChip id={r} size="sm" />
                    <span className="truncate text-sm text-ink">{viaDora ? tr('Via DORA', 'Via DORA') : names}</span>
                  </span>
                  <span className="shrink-0 font-mono text-2xs text-ink-2">{viaDora ? '' : tr(`dès ${SHORTEST[r]}`, `from ${SHORTEST[r]}`)}</span>
                </li>
              )
            })}
          </ul>
          <div className="text-sm">
            {missing.length === 0 ? (
              <p className="flex items-center gap-2 text-positive">
                <CheckCheck size={14} /> {tr('Préparation complète', 'Readiness complete')}
              </p>
            ) : (
              <>
                <p className="text-ink-2">{tr('À compléter :', 'To complete:')}</p>
                <ul className="mt-1.5 space-y-1">
                  {missing.map((m) => (
                    <li key={m.id} className="flex items-start gap-2 text-xs text-caution">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-caution" />
                      {m.label}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </Card>
      </div>
    </Reveal>
  )
}
