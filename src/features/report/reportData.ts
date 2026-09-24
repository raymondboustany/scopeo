import type { Scoping } from '@/lib/hooks'
import type { CoverageLevel, EntityNote, EntityProfile, IsoProfile, PrioritisedItem, RegulationId, TimelineEvent } from '@/types/domain'
import { REGULATION_ORDER, REGULATIONS } from '@/data/regulations'
import { CROSSWALK } from '@/data/crosswalk'
import { RECURRING_DUTIES } from '@/data/timeline'
import { SECTOR_BY_VALUE } from '@/data/questionnaire'
import { RECYF_META } from '@/data/recyf'
import { STATUS_LABEL } from '@/engines/qualification'
import { WAVES, WEIGHT_LABELS } from '@/engines/prioritisation'
import { DOMAIN_LABELS } from '@/engines/scores'
import { authoritiesFor, NOTIFICATION_DELAYS, readiness } from '@/engines/incidents'
import { nextMilestones, relevantEvents } from '@/engines/alerts'
import { isoCertificateValid } from '@/engines/scores'
import { isoProgress } from '@/engines/iso'
import { COLON, tr } from '@/i18n'

/**
 * Données des rapports.
 *
 * Tout ce qu'impriment la note de synthèse et le rapport complet est calculé ici,
 * une seule fois, à partir de la vue dérivée de l'entité. Les documents ne
 * font que mettre en page : aucun calcul n'y est dupliqué.
 */

export type Distribution = Record<CoverageLevel, number>

export interface ReportData {
  generatedAt: Date
  entity: { name: string; scopeNote: string; sector: string | null }
  profile: EntityProfile
  /** Le suivi (porteurs, échéances) est-il utilisé ? Sinon, les rapports n'en parlent pas. */
  tracking: boolean
  notes: EntityNote[]
  applicable: RegulationId[]
  verdicts: {
    regulation: RegulationId
    reference: string
    name: string
    status: string
    applies: boolean
    qualification: string | null
    basis: { article: string; label: string; detail: string; met: boolean }[]
    caveats: string[]
    exposure: { maxEur: number | null; tier: string; formula: string } | null
  }[]
  nis2Category: 'essentielle' | 'importante' | null
  doraPrevails: boolean
  coverage: {
    score: number
    themes: number
    evaluated: number
    distribution: Distribution
    byRegulation: { regulation: RegulationId; score: number; themes: number; distribution: Distribution }[]
    byDomain: { label: string; score: number; themes: number }[]
  }
  perimeter: { regulation: RegulationId; kept: number; requirements: number; excluded: number }[]
  totals: { obligations: number; requirements: number; excluded: number }
  maxExposure: { regulation: RegulationId; eur: number } | null
  items: (PrioritisedItem & { owner?: string; targetDate?: string })[]
  waves: { n: number; label: string; horizon: string; intent: string; items: ReportData['items'] }[]
  frictions: { code: string; title: string; relation: string; summary: string; rule: string | null }[]
  milestones: TimelineEvent[]
  upcoming: TimelineEvent[]
  duties: typeof RECURRING_DUTIES
  notification: {
    regulation: RegulationId
    authority: string
    channel: string
    url: string
    phone?: string
    email?: string
    steps: { step: string; delay: string }[]
    viaDora: boolean
  }[]
  readiness: { label: string; ok: boolean }[]
  contacts: { role: string; name: string; title: string; phone: string; email: string }[]
  measures: { total: number; en_place: number; partiel: number; absent: number } | null
  /** Démarche ISO 27001 : badge de certification et état du module. */
  iso: {
    profile: IsoProfile
    certified: boolean
    certificateValid: boolean
    controlsAssessed: number
    exclusions: number
    prefilled: number
  } | null
  weights: { label: string; value: number }[]
  decisions: string[]
  headline: string
}

const EMPTY: Distribution = { en_place: 0, partiel: 0, absent: 0, non_evalue: 0 }

function distribution(items: PrioritisedItem[]): Distribution {
  const d = { ...EMPTY }
  for (const i of items) d[i.coverage] += 1
  return d
}

const ESCALATION = ['rssi', 'dpo', 'direction', 'juridique', 'communication', 'autre']

const ROLE_LABEL: Record<string, string> = {
  rssi: tr('RSSI', 'CISO'),
  dpo: 'DPO',
  direction: tr('Direction', 'Management'),
  juridique: tr('Juridique', 'Legal'),
  communication: tr('Communication', 'Communications'),
  autre: tr('Autre', 'Other'),
}

export function buildReportData(s: Scoping): ReportData {
  const entity = s.entity!
  const q = s.qualification!
  const now = new Date()
  const coverageMap = s.coverage

  const items = s.prioritised.map((p) => ({ ...p, owner: coverageMap[p.themeId]?.owner, targetDate: coverageMap[p.themeId]?.targetDate }))

  const verdicts = REGULATION_ORDER.map((r) => {
    const v = q.verdicts[r]
    return {
      regulation: r,
      reference: REGULATIONS[r].reference,
      name: REGULATIONS[r].shortName,
      status: STATUS_LABEL[v.status],
      applies: s.applicable.includes(r),
      qualification: v.qualification,
      basis: v.basis.map((b) => ({ article: b.article, label: b.label, detail: b.detail, met: b.met })),
      caveats: v.caveats,
      exposure: v.exposure,
    }
  })

  const exposures = verdicts
    .filter((v) => v.applies && v.exposure?.maxEur)
    .map((v) => ({ regulation: v.regulation, eur: v.exposure!.maxEur! }))
    .sort((a, b) => b.eur - a.eur)

  const perimeter = REGULATION_ORDER.map((r) => {
    const all = s.obligations.filter((o) => o.regulation === r)
    const kept = all.filter((o) => o.inScope)
    return { regulation: r, kept: kept.length, requirements: kept.reduce((n, o) => n + o.requirements.length, 0), excluded: all.length - kept.length }
  }).filter((p) => p.kept + p.excluded > 0)

  const byRegulation = REGULATION_ORDER.filter((r) => s.scores.byRegulation[r]).map((r) => {
    const its = s.prioritised.filter((p) => p.regulations.includes(r))
    return { regulation: r, score: s.scores.byRegulation[r]!.score, themes: its.length, distribution: distribution(its) }
  })

  const byDomain = Object.entries(s.scores.byDomain).map(([d, l]) => ({
    label: DOMAIN_LABELS[d as keyof typeof DOMAIN_LABELS],
    score: l!.score,
    themes: l!.themes,
  }))

  const frictions = CROSSWALK.filter(
    (t) => t.relation !== 'recouvrement' && t.mappings.filter((m) => s.applicable.includes(m.regulation)).length >= 2,
  ).map((t) => ({
    code: t.code,
    title: t.title,
    relation: t.relation === 'divergence' ? tr('Divergence', 'Divergence') : tr('Hiérarchie', 'Precedence'),
    summary: t.summary,
    rule: t.strictest
      ? `${REGULATIONS[t.strictest.regulation].shortName} ${tr('commande', 'prevails')}${COLON}${t.strictest.rule}`
      : t.precedence
        ? t.precedence.basis
        : null,
  }))

  const notification = s.applicable.map((r) => {
    const auths = authoritiesFor(r, entity.answers)
    return {
      regulation: r,
      authority: auths.map((a) => a.name).join(' / '),
      channel: auths[0].channel,
      url: auths[0].url,
      phone: auths[0].phone,
      email: auths[0].email,
      steps: NOTIFICATION_DELAYS[r],
      viaDora: r === 'NIS2' && s.doraPrevails,
    }
  })

  const ready = readiness(s.applicable, entity.answers, entity.contacts)
  const dist = distribution(s.prioritised)
  const g = s.scores.global
  const wave1 = items.filter((i) => i.wave === 1)
  const tracking = items.some((i) => i.owner)
  const unowned = items.filter((i) => i.coverage !== 'en_place' && !i.owner).length

  const decisions: string[] = []
  if (wave1.length > 0)
    decisions.push(
      tr(
        `Valider la vague 1 (${wave1.length} exigence${wave1.length > 1 ? 's' : ''}, 0 à 3 mois) et le budget associé.`,
        `Approve wave 1 (${wave1.length} requirement${wave1.length > 1 ? 's' : ''}, 0 to 3 months) and its budget.`,
      ),
    )
  if (tracking && unowned > 0)
    decisions.push(
      tr(
        `Désigner un responsable pour ${unowned} exigence${unowned > 1 ? 's' : ''} en écart sans porteur identifié.`,
        `Assign an owner to ${unowned} requirement${unowned > 1 ? 's' : ''} with a gap and no identified owner.`,
      ),
    )
  if (g.evaluated < g.themes)
    decisions.push(
      tr(
        `Faire compléter l'évaluation : ${g.themes - g.evaluated} exigence${g.themes - g.evaluated > 1 ? 's' : ''} restent à évaluer.`,
        `Have the assessment completed: ${g.themes - g.evaluated} requirement${g.themes - g.evaluated > 1 ? 's' : ''} still to assess.`,
      ),
    )
  const missing = ready.filter((r) => !r.ok)
  if (missing.length > 0)
    decisions.push(
      tr(
        `Compléter la préparation au signalement : ${missing.map((m) => m.label.toLowerCase()).join(', ')}.`,
        `Complete reporting readiness: ${missing.map((m) => m.label.toLowerCase()).join(', ')}.`,
      ),
    )
  const toCheck = (entity.notes ?? []).filter((n) => !n.resolved && n.tag === 'verifier').length
  if (toCheck > 0)
    decisions.push(
      tr(
        `Lever ${toCheck} point${toCheck > 1 ? 's' : ''} resté${toCheck > 1 ? 's' : ''} à vérifier lors du cadrage (voir l'annexe du rapport complet).`,
        `Clear ${toCheck} point${toCheck > 1 ? 's' : ''} left to check during scoping (see the appendix of the full report).`,
      ),
    )
  if (s.iso.alerts.size > 0)
    decisions.push(
      tr(
        `Arbitrer ${s.iso.alerts.size} exigence${s.iso.alerts.size > 1 ? 's' : ''} obligatoire${s.iso.alerts.size > 1 ? 's' : ''} dont le contrôle ISO 27001 correspondant a été exclu de la démarche.`,
        `Decide on ${s.iso.alerts.size} mandatory requirement${s.iso.alerts.size > 1 ? 's' : ''} whose matching ISO 27001 control was excluded from the initiative.`,
      ),
    )
  if (s.applicable.includes('NIS2'))
    decisions.push(
      tr(
        "Suivre l'adoption de la loi de transposition de NIS2 et arrêter le calendrier de mise en conformité qui en découlera.",
        'Follow the adoption of the NIS2 transposition act and set the resulting compliance timetable.',
      ),
    )

  const texts = s.applicable.map((r) => REGULATIONS[r].shortName).join(', ')
  const pct = Math.round(g.score * 100)
  const headline =
    s.applicable.length === 0
      ? tr("Aucun des cinq textes n'est retenu comme applicable au vu des éléments déclarés.", 'None of the five texts applies based on the information provided.')
      : tr(
          `${s.applicable.length} texte${s.applicable.length > 1 ? 's' : ''} s'applique${s.applicable.length > 1 ? 'nt' : ''} (${texts}), soit ${g.themes} exigences unifiées. `,
          `${s.applicable.length} text${s.applicable.length > 1 ? 's apply' : ' applies'} (${texts}), i.e. ${g.themes} unified requirements. `,
        ) +
        (g.evaluated === 0
          ? tr("L'évaluation de l'existant reste à conduire.", 'The assessment of the current state remains to be done.')
          : tr(
              `Couverture déclarée : ${pct} % ; ${dist.absent} exigence${dist.absent > 1 ? 's' : ''} sans aucune mesure, ${dist.partiel} partiellement couverte${dist.partiel > 1 ? 's' : ''}.`,
              `Reported coverage: ${pct}%; ${dist.absent} requirement${dist.absent > 1 ? 's' : ''} with no measure at all, ${dist.partiel} partly covered.`,
            ))

  const isoProfile = entity.profile?.iso27001
  const iso =
    isoProfile?.status
      ? {
          profile: isoProfile,
          certified: isoProfile.status === 'certifie',
          certificateValid: isoCertificateValid(isoProfile),
          controlsAssessed: isoProgress(entity.iso_controls).assessed,
          exclusions: s.iso.alerts.size,
          prefilled: Object.values(s.coverage).filter((c) => c.fromIso).length,
        }
      : null

  return {
    generatedAt: now,
    entity: {
      name: entity.name,
      scopeNote: entity.scope_note,
      sector: typeof entity.answers.secteur === 'string' ? SECTOR_BY_VALUE.get(entity.answers.secteur)?.label ?? null : null,
    },
    profile: entity.profile ?? {},
    tracking,
    notes: (entity.notes ?? []).filter((n) => !n.resolved || n.tag === 'decision'),
    applicable: s.applicable,
    verdicts,
    nis2Category: s.nis2Category,
    doraPrevails: s.doraPrevails,
    coverage: { score: g.score, themes: g.themes, evaluated: g.evaluated, distribution: dist, byRegulation, byDomain },
    perimeter,
    totals: {
      obligations: s.inScope.length,
      requirements: s.inScope.reduce((n, o) => n + o.requirements.length, 0),
      excluded: s.obligations.length - s.inScope.length,
    },
    maxExposure: exposures[0] ?? null,
    items,
    waves: WAVES.map((w) => ({ ...w, items: items.filter((i) => i.wave === w.n) })).filter((w) => w.items.length > 0),
    frictions,
    milestones: nextMilestones(s.applicable, entity.answers, now, 3),
    upcoming: relevantEvents(s.applicable, entity.answers)
      .filter((e) => new Date(e.date).getTime() >= now.getTime() - 86_400_000)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 8),
    duties: RECURRING_DUTIES.filter((d) => s.applicable.includes(d.regulation)),
    notification,
    readiness: ready.map((r) => ({ label: r.label, ok: r.ok })),
    contacts: [...entity.contacts]
      .sort((a, b) => ESCALATION.indexOf(a.role) - ESCALATION.indexOf(b.role))
      .map((c) => ({ role: ROLE_LABEL[c.role] ?? c.role, name: c.name, title: c.title, phone: c.phone, email: c.email })),
    measures: s.anssiApplies && s.measures.total > 0 ? s.measures : null,
    iso,
    weights: (Object.keys(WEIGHT_LABELS) as (keyof typeof WEIGHT_LABELS)[]).map((k) => ({ label: WEIGHT_LABELS[k].label, value: s.weights[k] })),
    decisions,
    headline,
  }
}

export const RECYF_VERSION = RECYF_META.version
