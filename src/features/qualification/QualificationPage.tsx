import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Check, ChevronLeft, ChevronRight, GitCompareArrows, Info, Minus, Plus, RotateCcw } from 'lucide-react'
import {
  Callout,
  Card,
  Disclaimer,
  PageHeader,
  RegChip,
  SectionRule,
  Tag,
} from '@/components/ui/primitives'
import { STATUS_STYLE } from '@/components/ui/tokens'
import { Button, OptionList, Select, Tooltip } from '@/components/ui/controls'
import { useScoping } from '@/lib/hooks'
import { NoteButton } from '@/components/notes/NoteButton'
import { NextStep } from '@/components/layout/NextStep'
import { useEntityEditor, useRevisions } from '@/lib/queries'
import { diffScope, type ScopeDiff } from '@/engines/diff'
import { QUESTION_SECTIONS, isComplete, visibleQuestions } from '@/data/questionnaire'
import { STATUS_LABEL, qualify } from '@/engines/qualification'
import { REGULATION_ORDER, REGULATIONS } from '@/data/regulations'
import { cn, formatEur } from '@/lib/utils'
import type { Answers, Question, RegulationId } from '@/types/domain'
import { FrameworkNote } from '@/components/ui/primitives'
import { IsoDeclaration } from '@/features/iso/IsoDeclaration'
import { LOCALE, tr } from '@/i18n'

export default function QualificationPage() {
  const { entity, readOnly } = useScoping()
  const edit = useEntityEditor()
  const { data: revisions = [] } = useRevisions(entity?.id ?? null)
  const [sectionIndex, setSectionIndex] = useState(0)
  // Sur la démonstration, les réponses se modifient en simulation, sans être enregistrées.
  const [simulated, setSimulated] = useState<Answers | null>(null)
  // État à l'ouverture de la page : point de comparaison par défaut.
  const [opening] = useState<{ answers: Answers; at: string }>(() => ({ answers: entity?.answers ?? {}, at: new Date().toISOString() }))
  const [baselineId, setBaselineId] = useState<string>('ouverture')

  // Référence stable : sans mémorisation, l'objet vide recréé à chaque rendu
  // invaliderait tous les calculs qui en dépendent.
  const answers: Answers = useMemo(() => simulated ?? entity?.answers ?? {}, [simulated, entity?.answers])
  const visible = useMemo(() => visibleQuestions(answers), [answers])
  const complete = isComplete(answers)
  const qualification = useMemo(() => (complete ? qualify(answers) : null), [complete, answers])

  const baseline = useMemo(
    () => (baselineId === 'ouverture' ? opening.answers : revisions.find((r) => r.id === baselineId)?.answers ?? opening.answers),
    [baselineId, opening.answers, revisions],
  )
  const diff = useMemo(() => diffScope(baseline, answers), [baseline, answers])

  const sections = QUESTION_SECTIONS.map((s) => {
    const qs = visible.filter((q) => q.section === s.id)
    const done = qs.filter((q) => !q.required || isAnswered(answers[q.id])).length
    return { ...s, questions: qs, done, total: qs.length }
  }).filter((s) => s.total > 0)

  const current = sections[Math.min(sectionIndex, sections.length - 1)]

  if (!entity) return null

  const setAnswer = (id: string, v: Answers[string]) => {
    if (readOnly) {
      setSimulated({ ...answers, [id]: v })
      return
    }
    edit((cur) => ({ answers: { ...cur.answers, [id]: v } }))
  }
  const missing = visible.filter((q) => q.required && !isAnswered(answers[q.id])).length

  return (
    <>
      <PageHeader
        eyebrow={entity.name}
        title={tr('Qualification réglementaire', 'Regulatory scoping')}
        lead={tr("Chaque question sert à établir une condition d'application précise, dont l'article est indiqué. Le verdict se recalcule à mesure que les réponses arrivent, et le comparateur montre ce qui entre et sort du périmètre.", 'Each question establishes a specific condition of application, with its article shown. The verdict updates as answers come in, and the comparator shows what enters and leaves the scope.')}
        actions={
          readOnly ? (
            simulated ? (
              <Button variant="ghost" icon={<RotateCcw size={13} />} onClick={() => setSimulated(null)}>
                {tr('Annuler la simulation', 'Cancel the simulation')}
              </Button>
            ) : null
          ) : (
            <Button
              variant="ghost"
              icon={<RotateCcw size={13} />}
              onClick={() => {
                if (window.confirm(tr('Effacer toutes les réponses de cette entité ? Une version est conservée pour comparaison.', "Erase all of this entity's answers? A version is kept for comparison."))) edit({ answers: {} })
              }}
            >
              {tr('Réinitialiser', 'Reset')}
            </Button>
          )
        }
      />

      {readOnly ? (
        <Callout tone="accent" className="mb-5" title={tr('Démonstration en mode simulation', 'Demo in simulation mode')}>
          {tr("Modifiez librement les réponses : le verdict et le comparateur se recalculent, mais rien n'est enregistré. Pour conserver vos changements, copiez la démonstration depuis la page Entités.", 'Change the answers freely: the verdict and the comparator update, but nothing is saved. To keep your changes, copy the demo from the Entities page.')}
        </Callout>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem] xl:grid-cols-[1fr_26rem]">
        {/* Questionnaire --------------------------------------------- */}
        <div className="min-w-0">
          <nav className="mb-5 flex flex-wrap gap-1.5" aria-label={tr('Sections du questionnaire', 'Questionnaire sections')}>
            {sections.map((s, i) => {
              const isCurrent = i === sectionIndex
              const isDone = s.done === s.total
              return (
                <button
                  key={s.id}
                  onClick={() => setSectionIndex(i)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors',
                    isCurrent
                      ? 'border-accent bg-accent text-accent-ink'
                      : isDone
                        ? 'border-rule-2 bg-raised text-ink-2 hover:bg-overlay'
                        : 'border-rule bg-surface text-ink-3 hover:bg-raised',
                  )}
                >
                  {isDone && !isCurrent ? <Check size={11} className="text-positive" /> : null}
                  {s.label}
                  <span className={cn('font-mono text-2xs', isCurrent ? 'text-accent-ink/70' : 'text-ink-4')}>
                    {s.done}/{s.total}
                  </span>
                </button>
              )
            })}
          </nav>

          {current ? (
            <Card>
              <div className="border-b border-rule px-5 py-3.5">
                <h2 className="text-base font-semibold text-ink">{current.label}</h2>
                <p className="mt-0.5 text-xs text-ink-3">{current.hint}</p>
              </div>

              <div className="divide-y divide-rule">
                {current.questions.map((q) => (
                  <QuestionField
                    key={q.id}
                    question={q}
                    value={answers[q.id]}
                    changed={JSON.stringify(baseline[q.id] ?? null) !== JSON.stringify(answers[q.id] ?? null)}
                    onChange={(v) => setAnswer(q.id, v)}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-rule bg-sunken px-5 py-3">
                <Button icon={<ChevronLeft size={13} />} disabled={sectionIndex === 0} onClick={() => setSectionIndex((i) => Math.max(0, i - 1))}>
                  {tr('Précédent', 'Previous')}
                </Button>
                <span className="text-2xs text-ink-3">
                  {tr(`Section ${sectionIndex + 1} sur ${sections.length}`, `Section ${sectionIndex + 1} of ${sections.length}`)}
                </span>
                <Button
                  variant="primary"
                  disabled={sectionIndex >= sections.length - 1}
                  onClick={() => setSectionIndex((i) => Math.min(sections.length - 1, i + 1))}
                >
                  {tr('Suivant', 'Next')}
                  <ChevronRight size={13} />
                </Button>
              </div>
            </Card>
          ) : null}

          {complete ? (
            <div className="mt-4">
              <IsoDeclaration />
            </div>
          ) : null}

          {complete ? (
            <Callout tone="positive" className="mt-4" title={tr('Questionnaire complet', 'Questionnaire complete')}>
              {tr("La qualification s'applique à toute la plateforme : corpus restreint au périmètre, exigences NIS2 (ReCyF) filtrées selon la catégorie de l'entité, score et ordre de traitement calculés. Le module ISO 27001 devient disponible.", "Scoping now applies across the platform: corpus restricted to the scope, NIS2 (ReCyF) requirements filtered by the entity's category, score and treatment order computed. The ISO 27001 module becomes available.")}
            </Callout>
          ) : (
            <Callout tone="neutral" className="mt-4">
              {tr(
                `${missing} réponse${missing > 1 ? 's' : ''} manquante${missing > 1 ? 's' : ''} avant que la qualification puisse être établie. Certaines questions n'apparaissent qu'en fonction des réponses précédentes.`,
                `${missing} answer${missing > 1 ? 's' : ''} missing before scoping can be established. Some questions only appear depending on previous answers.`,
              )}
            </Callout>
          )}
        </div>

        {/* Comparateur et verdict ------------------------------------ */}
        <aside className="min-w-0 space-y-5 lg:sticky lg:top-[calc(var(--bar)+1.5rem)] lg:max-h-[calc(100vh-var(--bar)-3rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
          <Comparator
            diff={diff}
            baselineId={baselineId}
            onBaseline={setBaselineId}
            options={[
              { value: 'ouverture', label: tr(`Ouverture de la page (${new Date(opening.at).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' })})`, `Page opened (${new Date(opening.at).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' })})`) },
              ...revisions.map((r) => ({
                value: r.id,
                label: tr(`Version du ${new Date(r.created_at).toLocaleString(LOCALE, { dateStyle: 'short', timeStyle: 'short' })}`, `Version of ${new Date(r.created_at).toLocaleString(LOCALE, { dateStyle: 'short', timeStyle: 'short' })}`),
              })),
            ]}
          />

          <div>
            <SectionRule>{tr('Verdict', 'Verdict')}</SectionRule>
            {qualification ? (
              <div className="mt-3 space-y-3">
                {REGULATION_ORDER.map((id) => (
                  <VerdictPanel key={id} id={id} verdict={qualification.verdicts[id]} />
                ))}
              </div>
            ) : (
              <Card className="mt-3 p-4">
                <div className="hatch mb-3 h-6 rounded-xs opacity-30" aria-hidden />
                <p className="text-sm text-ink-3">{tr('Le verdict apparaîtra ici dès que toutes les questions requises auront été renseignées.', 'The verdict will appear here once all required questions have been answered.')}</p>
              </Card>
            )}
          </div>
          <Disclaimer compact />
        </aside>
      </div>
      <div className="mt-6">
        {complete ? <NextStep to="/app/evaluation" label={tr("Évaluer l'existant", 'Assess the current state')} hint={tr('Une réponse par exigence unifiée, valable pour tous les textes', 'One answer per unified requirement, valid for all texts')} /> : null}
      </div>
    </>
  )
}

/* ==========================================================================
   Comparateur avant / après
   ========================================================================== */

function Comparator({
  diff,
  baselineId,
  onBaseline,
  options,
}: {
  diff: ScopeDiff
  baselineId: string
  onBaseline: (id: string) => void
  options: { value: string; label: string }[]
}) {
  const [showAll, setShowAll] = useState(false)
  const moved = diff.added.length + diff.removed.length + diff.verdicts.length
  const LIMIT = 5
  const moves = [...diff.added.map((o) => ({ o, kind: 'add' as const })), ...diff.removed.map((o) => ({ o, kind: 'rm' as const }))]
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-rule px-4 py-3">
        <GitCompareArrows size={15} className="text-accent" />
        <span className="text-sm font-semibold text-ink">{tr('Avant / après', 'Before / after')}</span>
        {moved > 0 ? <Tag tone="accent">{tr(`${moved} mouvement${moved > 1 ? 's' : ''}`, `${moved} change${moved > 1 ? 's' : ''}`)}</Tag> : null}
      </div>
      <div className="space-y-3 px-4 py-3">
        <label className="block">
          <span className="mb-1 block text-2xs text-ink-3">{tr('Comparer à', 'Compare with')}</span>
          <Select value={baselineId} onValueChange={onBaseline} options={options} ariaLabel={tr('Point de comparaison', 'Comparison point')} />
        </label>

        {diff.answers.length === 0 ? (
          <p className="text-xs leading-relaxed text-ink-3">
            {tr("Aucune réponse modifiée depuis ce point. Changez une réponse : les obligations qui entrent ou sortent du périmètre s'afficheront ici.", 'No answer changed since this point. Change an answer: obligations entering or leaving the scope will appear here.')}
          </p>
        ) : (
          <div className="space-y-3">
            <ul className="space-y-1">
              {diff.answers.map((a) => (
                <li key={a.questionId} className="rounded-sm bg-sunken px-2.5 py-1.5 text-2xs">
                  <div className="truncate text-ink-3">{a.question}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-ink-4 line-through">{a.before}</span>
                    <ArrowRight size={10} className="text-ink-4" />
                    <span className="font-medium text-ink">{a.after}</span>
                  </div>
                </li>
              ))}
            </ul>

            {!diff.comparable ? (
              <p className="text-xs leading-relaxed text-ink-3">{tr('La comparaison du périmètre suppose un questionnaire complet des deux côtés.', 'Comparing the scope requires a complete questionnaire on both sides.')}</p>
            ) : (
              <>
                {diff.verdicts.length > 0 ? (
                  <div className="space-y-1.5">
                    {diff.verdicts.map((v) => (
                      <div key={v.regulation} className="flex flex-wrap items-center gap-1.5 text-2xs">
                        <RegChip id={v.regulation} size="sm" />
                        <span className="text-ink-3">{STATUS_LABEL[v.before.status]}</span>
                        <ArrowRight size={10} className="text-ink-4" />
                        <span className="font-medium text-ink">{STATUS_LABEL[v.after.status]}</span>
                        {v.after.qualification && v.after.qualification !== v.before.qualification ? (
                          <span className="text-ink-2">· {v.after.qualification}</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="grid grid-cols-3 gap-2 text-center">
                  <DeltaStat label={tr('Obligations', 'Obligations')} plus={diff.added.length} minus={diff.removed.length} />
                  <DeltaStat label={tr('Exigences unifiées', 'Unified requirements')} plus={diff.themesAdded.length} minus={diff.themesRemoved.length} />
                  <div className="rounded-sm bg-sunken px-2 py-2">
                    <div
                      className={cn(
                        'tabular text-base font-semibold',
                        diff.requirementDelta > 0 ? 'text-critical' : diff.requirementDelta < 0 ? 'text-positive' : 'text-ink-3',
                      )}
                    >
                      {diff.requirementDelta > 0 ? '+' : ''}
                      {diff.requirementDelta}
                    </div>
                    <div className="text-[10px] text-ink-3">{tr('exigences élémentaires', 'elementary requirements')}</div>
                  </div>
                </div>

                {moves.length > 0 ? (
                  <ul className="space-y-1">
                    <AnimatePresence initial={false}>
                      {moves.slice(0, showAll ? undefined : LIMIT).map(({ o, kind }) => (
                        <motion.li
                          key={`${kind}-${o.id}`}
                          layout
                          initial={{ opacity: 0, x: kind === 'add' ? 8 : -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          className={cn(
                            'flex items-start gap-2 rounded-sm border px-2.5 py-1.5 text-2xs',
                            kind === 'add' ? 'border-caution-line bg-caution-wash' : 'border-positive-line bg-positive-wash',
                          )}
                        >
                          {kind === 'add' ? (
                            <Plus size={11} className="mt-0.5 shrink-0 text-caution" aria-label={tr('Apparaît', 'Enters')} />
                          ) : (
                            <Minus size={11} className="mt-0.5 shrink-0 text-positive" aria-label={tr('Disparaît', 'Leaves')} />
                          )}
                          <span className="min-w-0">
                            <span className="font-mono text-ink-3">
                              {REGULATIONS[o.regulation].shortName} {o.shortRef ?? o.article}
                            </span>{' '}
                            <span className="text-ink">{o.title}</span>
                          </span>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                    {moves.length > LIMIT ? (
                      <li>
                        <button onClick={() => setShowAll((v) => !v)} className="text-2xs text-accent hover:underline">
                          {showAll ? tr('Réduire', 'Show less') : tr(`Voir les ${moves.length} obligations`, `See all ${moves.length} obligations`)}
                        </button>
                      </li>
                    ) : null}
                  </ul>
                ) : null}
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

function DeltaStat({ label, plus, minus }: { label: string; plus: number; minus: number }) {
  return (
    <div className="rounded-sm bg-sunken px-2 py-2">
      <div className="flex items-baseline justify-center gap-1.5 tabular text-base font-semibold">
        <span className={plus > 0 ? 'text-caution' : 'text-ink-4'}>+{plus}</span>
        <span className={minus > 0 ? 'text-positive' : 'text-ink-4'}>−{minus}</span>
      </div>
      <div className="text-[10px] text-ink-3">{label}</div>
    </div>
  )
}

/* ========================================================================== */

function isAnswered(v: unknown): boolean {
  if (Array.isArray(v)) return v.length > 0
  return v !== undefined && v !== null && v !== ''
}

function QuestionField({
  question,
  value,
  changed,
  onChange,
}: {
  question: Question
  value: Answers[string]
  changed: boolean
  onChange: (v: Answers[string]) => void
}) {
  const answered = isAnswered(value)

  return (
    <div className={cn('px-5 py-4 transition-colors', changed && 'bg-accent-wash/40')}>
      <div className="mb-2.5 flex items-start gap-2">
        <span
          className={cn(
            'mt-1 size-1.5 shrink-0 rounded-full',
            answered ? 'bg-positive' : question.required ? 'bg-caution' : 'bg-rule-2',
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <h3 className="text-sm font-medium text-ink">{question.question}</h3>
            {!question.required ? <Tag>{tr('Facultatif', 'Optional')}</Tag> : null}
            {changed ? <Tag tone="accent">{tr('Modifiée', 'Changed')}</Tag> : null}
            <NoteButton className="ml-auto" anchor={{ kind: 'question', id: question.id, label: question.question }} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="ref text-ink-4">{question.basis}</span>
            {question.help ? (
              <Tooltip content={question.help}>
                <button
                  className="inline-flex items-center text-ink-4 hover:text-accent"
                  aria-label={tr('Précisions sur cette question', 'More about this question')}
                >
                  <Info size={12} />
                </button>
              </Tooltip>
            ) : null}
          </div>
        </div>
      </div>

      <div className="pl-3.5">
        {question.type === 'select' ? (
          <Select
            value={typeof value === 'string' ? value : undefined}
            onValueChange={onChange}
            options={question.options ?? []}
            ariaLabel={question.question}
          />
        ) : question.type === 'multi' ? (
          <OptionList
            name={question.id}
            multiple
            options={question.options ?? []}
            values={Array.isArray(value) ? value : []}
            onToggle={(v) => {
              const cur = Array.isArray(value) ? value : []
              // « Aucun de ces types » est exclusif des autres réponses.
              if (v === 'aucun') {
                onChange(cur.includes('aucun') ? [] : ['aucun'])
                return
              }
              const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur.filter((x) => x !== 'aucun'), v]
              onChange(next)
            }}
          />
        ) : (
          <OptionList
            name={question.id}
            options={question.options ?? []}
            value={typeof value === 'string' ? value : undefined}
            onChange={onChange}
          />
        )}
      </div>

      {question.help ? (
        <p className="mt-2 pl-3.5 text-xs leading-relaxed text-ink-3">{question.help}</p>
      ) : null}
    </div>
  )
}

/* ========================================================================== */

function VerdictPanel({ id, verdict }: { id: RegulationId; verdict: import('@/types/domain').RegulationVerdict }) {
  const [open, setOpen] = useState(false)
  const s = STATUS_STYLE[verdict.status]
  const reg = REGULATIONS[id]
  const dimmed = verdict.status === 'hors_champ'

  return (
    <Card className={cn(dimmed && 'opacity-75')}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-2 px-3.5 py-3 text-left"
        aria-expanded={open}
      >
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <RegChip id={id} muted={dimmed} />
            <span className={cn('text-2xs font-semibold uppercase tracking-wide', s.text)}>
              {STATUS_LABEL[verdict.status]}
            </span>
          </span>
          {id === 'NIS2' ? <FrameworkNote className="mt-1 block" /> : null}
          <span className="mt-1.5 block text-sm font-medium text-ink">
            {verdict.qualification ?? tr('Non applicable', 'Not applicable')}
          </span>
        </span>
        <ChevronRight
          size={14}
          className={cn('mt-0.5 shrink-0 text-ink-4 transition-transform', open && 'rotate-90')}
        />
      </button>

      {open ? (
        <div className="space-y-3 border-t border-rule px-3.5 py-3">
          <div>
            <div className="label-caps mb-1.5">{tr('Fondement examiné', 'Legal basis examined')}</div>
            <ul className="space-y-2">
              {verdict.basis.map((b) => (
                <li key={b.article} className="flex gap-2">
                  <span
                    className={cn(
                      'mt-1 size-1.5 shrink-0 rounded-full',
                      b.met ? 'bg-positive' : 'bg-rule-3',
                    )}
                    aria-label={b.met ? tr('Condition remplie', 'Condition met') : tr('Condition non remplie', 'Condition not met')}
                  />
                  <span className="min-w-0">
                    <span className="ref block text-ink-3">{b.article}</span>
                    <span className="block text-xs font-medium text-ink">{b.label}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-2">{b.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {verdict.exposure ? (
            <div className="rounded-sm bg-sunken px-3 py-2.5">
              <div className="label-caps">{tr('Exposition', 'Exposure')}</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-mono text-base font-medium tabular text-ink">
                  {verdict.exposure.maxEur !== null ? formatEur(verdict.exposure.maxEur) : tr('Régime national', 'National regime')}
                </span>
              </div>
              <p className="mt-1 text-2xs leading-relaxed text-ink-3">{verdict.exposure.formula}</p>
            </div>
          ) : null}

          {verdict.caveats.length > 0 ? (
            <div>
              <div className="label-caps mb-1.5">{tr('Réserves', 'Caveats')}</div>
              <ul className="space-y-1.5">
                {verdict.caveats.map((c, i) => (
                  <li key={i} className="border-l-2 border-caution-line pl-2.5 text-xs leading-relaxed text-ink-2">
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="border-t border-rule pt-2">
            <a
              href={reg.eurLexUrl}
              target="_blank"
              rel="noreferrer"
              className="ref text-accent hover:underline"
            >
              {reg.reference} · EUR-Lex ↗
            </a>
          </div>
        </div>
      ) : null}
    </Card>
  )
}
