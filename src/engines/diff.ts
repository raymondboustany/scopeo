import type { Answers, QualificationResult, RegulationId, VerdictStatus } from '@/types/domain'
import { isComplete, QUESTIONS } from '@/data/questionnaire'
import { qualify } from './qualification'
import { scopeObligations, type ScopedObligation } from './corpus'
import { CROSSWALK } from '@/data/crosswalk'
import { REGULATION_ORDER } from '@/data/regulations'

/**
 * Comparateur avant / après.
 *
 * Une réponse modifiée ne se lit pas seule : elle déplace le périmètre. On
 * compare donc deux états complets — qualification, obligations retenues,
 * exigences unifiées — et on ne restitue que ce qui a bougé.
 */

export interface VerdictChange {
  regulation: RegulationId
  before: { status: VerdictStatus; qualification: string | null }
  after: { status: VerdictStatus; qualification: string | null }
}

export interface AnswerChange {
  questionId: string
  question: string
  before: string
  after: string
}

export interface ScopeDiff {
  answers: AnswerChange[]
  verdicts: VerdictChange[]
  added: ScopedObligation[]
  removed: ScopedObligation[]
  themesAdded: string[]
  themesRemoved: string[]
  requirementDelta: number
  comparable: boolean
}

function evaluate(answers: Answers): { q: QualificationResult | null; scoped: ScopedObligation[] } {
  const q = isComplete(answers) ? qualify(answers) : null
  return { q, scoped: q ? scopeObligations(answers, q).filter((o) => o.inScope) : [] }
}

function labelOf(questionId: string, value: unknown): string {
  const question = QUESTIONS.find((x) => x.id === questionId)
  const values = Array.isArray(value) ? value : value === undefined || value === null || value === '' ? [] : [value]
  if (values.length === 0) return '—'
  return values
    .map((v) => question?.options?.find((o) => o.value === v)?.label ?? String(v))
    .join(', ')
}

function themesOf(scoped: ScopedObligation[]): Set<string> {
  const ids = new Set(scoped.map((o) => o.id))
  return new Set(
    CROSSWALK.filter((t) => t.mappings.some((m) => m.obligationIds.some((id) => ids.has(id)))).map((t) => t.id),
  )
}

export function diffScope(before: Answers, after: Answers): ScopeDiff {
  const a = evaluate(before)
  const b = evaluate(after)

  const answers: AnswerChange[] = QUESTIONS.filter(
    (q) => JSON.stringify(before[q.id] ?? null) !== JSON.stringify(after[q.id] ?? null),
  ).map((q) => ({ questionId: q.id, question: q.question, before: labelOf(q.id, before[q.id]), after: labelOf(q.id, after[q.id]) }))

  const verdicts: VerdictChange[] =
    a.q && b.q
      ? REGULATION_ORDER.filter(
          (r) =>
            a.q!.verdicts[r].status !== b.q!.verdicts[r].status ||
            a.q!.verdicts[r].qualification !== b.q!.verdicts[r].qualification,
        ).map((r) => ({
          regulation: r,
          before: { status: a.q!.verdicts[r].status, qualification: a.q!.verdicts[r].qualification },
          after: { status: b.q!.verdicts[r].status, qualification: b.q!.verdicts[r].qualification },
        }))
      : []

  const beforeIds = new Set(a.scoped.map((o) => o.id))
  const afterIds = new Set(b.scoped.map((o) => o.id))
  const tA = themesOf(a.scoped)
  const tB = themesOf(b.scoped)
  const req = (list: ScopedObligation[]) => list.reduce((n, o) => n + o.requirements.length, 0)

  return {
    answers,
    verdicts,
    added: b.scoped.filter((o) => !beforeIds.has(o.id)),
    removed: a.scoped.filter((o) => !afterIds.has(o.id)),
    themesAdded: [...tB].filter((t) => !tA.has(t)),
    themesRemoved: [...tA].filter((t) => !tB.has(t)),
    requirementDelta: req(b.scoped) - req(a.scoped),
    comparable: Boolean(a.q && b.q),
  }
}
