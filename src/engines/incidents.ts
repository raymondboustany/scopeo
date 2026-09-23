import type { Answers, IncidentRecord, InternalContact, RegulationId } from '@/types/domain'

/**
 * Délais de déclaration d'un incident.
 *
 * Un même événement peut déclencher quatre horloges, auprès de quatre
 * autorités, avec des points de départ différents : la prise de connaissance
 * pour le RGPD, NIS 2 et le CRA ; la classification comme majeur pour DORA ;
 * la mise à disposition d'un correctif pour le rapport final du CRA. Ce moteur
 * les calcule toutes, pour faire apparaître l'échéance qui commande.
 */

export type Regime = 'RGPD' | 'NIS2' | 'DORA' | 'CRA-VULN' | 'CRA-INC'

export const REGIME_REGULATION: Record<Regime, RegulationId> = {
  RGPD: 'RGPD',
  NIS2: 'NIS2',
  DORA: 'DORA',
  'CRA-VULN': 'CRA',
  'CRA-INC': 'CRA',
}

export const REGIME_LABEL: Record<Regime, { title: string; trigger: string }> = {
  RGPD: {
    title: 'Violation de données personnelles',
    trigger: 'Des données personnelles ont été détruites, perdues, altérées, divulguées ou consultées sans autorisation.',
  },
  NIS2: {
    title: 'Incident important',
    trigger: "Perturbation opérationnelle grave, pertes financières, ou dommages considérables causés à des tiers (art. 23 § 3).",
  },
  DORA: {
    title: 'Incident majeur lié aux TIC',
    trigger: "Incident classé majeur selon les critères du règlement délégué 2024/1772 : clients touchés, durée, données, services critiques…",
  },
  'CRA-VULN': {
    title: 'Vulnérabilité activement exploitée',
    trigger: "Une vulnérabilité d'un produit mis sur le marché est exploitée par un acteur malveillant.",
  },
  'CRA-INC': {
    title: 'Incident grave affectant un produit',
    trigger: "Incident ayant des répercussions sur la sécurité d'un produit, par exemple la compromission de sa chaîne de mise à jour.",
  },
}

// ---------------------------------------------------------------------------
// Autorités
// ---------------------------------------------------------------------------

export interface Authority {
  id: string
  name: string
  role: string
  channel: string
  url: string
  phone?: string
  email?: string
  note?: string
}

export const AUTHORITIES: Record<string, Authority> = {
  CNIL: {
    id: 'CNIL',
    name: 'CNIL',
    role: 'Autorité de contrôle — protection des données',
    channel: 'Téléservice de notification des violations de données personnelles',
    url: 'https://www.cnil.fr/fr/notifier-une-violation-de-donnees-personnelles',
  },
  ANSSI: {
    id: 'ANSSI',
    name: 'ANSSI — CERT-FR',
    role: 'Autorité nationale et CSIRT — cybersécurité',
    channel: 'Signalement au CERT-FR, joignable en permanence',
    url: 'https://cert.ssi.gouv.fr/contact/',
    phone: '3218 · +33 9 70 83 32 18',
    email: 'cert-fr@ssi.gouv.fr',
    note: "Tant que la loi de transposition n'est pas promulguée, la notification NIS 2 n'est pas juridiquement exigible en France ; le signalement au CERT-FR reste recommandé et les délais sont ceux de la directive.",
  },
  ACPR: {
    id: 'ACPR',
    name: 'ACPR',
    role: 'Autorité de supervision — banque, paiement, assurance',
    channel: "Déclaration des incidents majeurs selon l'instruction n° 2025-I-10",
    url: 'https://acpr.banque-france.fr/fr/publications-et-statistiques/publications/instruction-ndeg-2025-i-10-relative-aux-declarations-des-incidents-majeurs-lies-aux-tic-et-aux',
  },
  AMF: {
    id: 'AMF',
    name: 'AMF',
    role: 'Autorité de supervision — marchés et gestion d’actifs',
    channel: 'Formulaire de notification DORA des incidents et cybermenaces',
    url: 'https://www.amf-france.org/en/forms-and-declarations/dora',
  },
  ESMA: {
    id: 'ESMA',
    name: 'AEMF (ESMA)',
    role: 'Supervision européenne directe',
    channel: "Agences de notation, référentiels centraux et référentiels des titrisations relèvent directement de l'ESMA",
    url: 'https://www.esma.europa.eu/',
  },
  ENISA: {
    id: 'ENISA',
    name: 'ENISA — plateforme unique',
    role: 'Signalement CRA, transmis au CERT-FR',
    channel: "Plateforme unique de signalement (art. 16 CRA), qui transmet simultanément au CSIRT coordinateur",
    url: 'https://cyber.gouv.fr/reglementation/cybersecurite-des-produits/cyber-resilience-act/',
    note: "La surveillance du marché des produits est pressentie pour l'ANFR ; sa désignation formelle reste à confirmer.",
  },
}

/** Autorité de supervision DORA selon le type d'entité financière déclaré. */
export function doraAuthorities(answers: Answers): Authority[] {
  const t = typeof answers.type_financier === 'string' ? answers.type_financier : ''
  if (['notation', 'referentiel', 'titrisation'].includes(t)) return [AUTHORITIES.ESMA]
  if (['gestionnaire_fonds', 'crypto', 'crowdfunding', 'plateforme', 'dct', 'indices'].includes(t)) return [AUTHORITIES.AMF]
  if (['ccp', 'investissement'].includes(t)) return [AUTHORITIES.ACPR, AUTHORITIES.AMF]
  return [AUTHORITIES.ACPR]
}

export function authoritiesFor(regulation: RegulationId, answers: Answers): Authority[] {
  switch (regulation) {
    case 'RGPD':
      return [AUTHORITIES.CNIL]
    case 'NIS2':
      return [AUTHORITIES.ANSSI]
    case 'DORA':
      return doraAuthorities(answers)
    case 'CRA':
      return [AUTHORITIES.ENISA]
  }
}

// ---------------------------------------------------------------------------
// Délais de référence
// ---------------------------------------------------------------------------

/** Délais de notification par texte, dans l'ordre des étapes. */
export const NOTIFICATION_DELAYS: Record<RegulationId, { step: string; delay: string }[]> = {
  RGPD: [{ step: 'Notification', delay: '72 h' }],
  NIS2: [
    { step: 'Alerte précoce', delay: '24 h' },
    { step: 'Notification', delay: '72 h' },
    { step: 'Rapport final', delay: '1 mois' },
  ],
  DORA: [
    { step: 'Notification initiale', delay: '4 h*' },
    { step: 'Rapport intermédiaire', delay: '72 h' },
    { step: 'Rapport final', delay: '1 mois' },
  ],
  CRA: [
    { step: 'Alerte précoce', delay: '24 h' },
    { step: 'Notification', delay: '72 h' },
    { step: 'Rapport final', delay: '14 j / 1 mois' },
  ],
}

// ---------------------------------------------------------------------------
// Étapes et échéances
// ---------------------------------------------------------------------------

export type StepStatus = 'done_on_time' | 'done_late' | 'overdue' | 'due_soon' | 'running' | 'no_deadline'

export interface IncidentStep {
  id: string
  regime: Regime
  label: string
  detail: string
  basis: string
  authority: string
  /** Échéance, ou null lorsque le texte n'en fixe pas de chiffrée. */
  due: Date | null
  /** L'échéance dépend d'une étape antérieure non encore accomplie. */
  provisional: boolean
  doneAt: Date | null
  status: StepStatus
}

const H = 3_600_000
const addH = (d: Date, h: number) => new Date(d.getTime() + h * H)
const addMonth = (d: Date) => {
  const r = new Date(d)
  r.setMonth(r.getMonth() + 1)
  return r
}
const parse = (s: string | null | undefined) => (s ? new Date(s) : null)

/** Seuil « bientôt » : dernier quart du délai, et au plus six heures. */
function statusOf(start: Date, due: Date | null, doneAt: Date | null, now: Date): StepStatus {
  if (!due) return doneAt ? 'done_on_time' : 'no_deadline'
  if (doneAt) return doneAt.getTime() <= due.getTime() ? 'done_on_time' : 'done_late'
  const left = due.getTime() - now.getTime()
  if (left < 0) return 'overdue'
  const span = Math.max(1, due.getTime() - start.getTime())
  if (left <= Math.min(span * 0.25, 6 * H)) return 'due_soon'
  return 'running'
}

export function incidentSteps(incident: IncidentRecord, answers: Answers, now = new Date()): IncidentStep[] {
  const detected = new Date(incident.detected_at)
  const classified = parse(incident.classified_at)
  const corrected = parse(incident.corrected_at)
  const done = (id: string) => parse(incident.steps[id])
  const steps: IncidentStep[] = []
  const push = (s: Omit<IncidentStep, 'status' | 'doneAt'>, start: Date) => {
    const doneAt = done(s.id)
    steps.push({ ...s, doneAt, status: statusOf(start, s.due, doneAt, now) })
  }
  const regimes = incident.regimes as Regime[]
  const doraAuthority = doraAuthorities(answers).map((a) => a.name).join(' / ')

  if (regimes.includes('RGPD')) {
    push(
      {
        id: 'RGPD-notification',
        regime: 'RGPD',
        label: 'Notification à la CNIL',
        detail: "Dans les meilleurs délais et au plus tard 72 heures après la prise de connaissance, sauf risque improbable pour les personnes. Tout retard doit être motivé.",
        basis: 'RGPD, article 33',
        authority: 'CNIL',
        due: addH(detected, 72),
        provisional: false,
      },
      detected,
    )
    push(
      {
        id: 'RGPD-personnes',
        regime: 'RGPD',
        label: 'Communication aux personnes concernées',
        detail: "Dans les meilleurs délais, si la violation est susceptible d'engendrer un risque élevé. Aucun délai chiffré : c'est la gravité qui commande.",
        basis: 'RGPD, article 34',
        authority: 'Personnes concernées',
        due: null,
        provisional: false,
      },
      detected,
    )
  }

  if (regimes.includes('NIS2')) {
    const notifDue = addH(detected, 72)
    const notifDone = done('NIS2-notification')
    push(
      {
        id: 'NIS2-alerte',
        regime: 'NIS2',
        label: 'Alerte précoce',
        detail: "Sous 24 heures : caractère malveillant suspecté, impact transfrontière possible.",
        basis: 'NIS 2, article 23 § 4 a)',
        authority: 'ANSSI — CERT-FR',
        due: addH(detected, 24),
        provisional: false,
      },
      detected,
    )
    push(
      {
        id: 'NIS2-notification',
        regime: 'NIS2',
        label: "Notification d'incident",
        detail: "Sous 72 heures : évaluation initiale de la gravité et de l'impact, indicateurs de compromission.",
        basis: 'NIS 2, article 23 § 4 b)',
        authority: 'ANSSI — CERT-FR',
        due: notifDue,
        provisional: false,
      },
      detected,
    )
    push(
      {
        id: 'NIS2-final',
        regime: 'NIS2',
        label: 'Rapport final',
        detail: "Un mois après la notification : description détaillée, cause profonde, mesures d'atténuation, impact transfrontière.",
        basis: 'NIS 2, article 23 § 4 d)',
        authority: 'ANSSI — CERT-FR',
        due: addMonth(notifDone ?? notifDue),
        provisional: !notifDone,
      },
      notifDone ?? notifDue,
    )
  }

  if (regimes.includes('DORA')) {
    // Règlement délégué 2025/301, article 5 : 4 heures après la classification
    // comme majeur, et en tout état de cause 24 heures après la détection.
    const hardCap = addH(detected, 24)
    const initialDue = classified ? new Date(Math.min(addH(classified, 4).getTime(), hardCap.getTime())) : hardCap
    const initialDone = done('DORA-initiale')
    const intermediateDue = addH(initialDone ?? initialDue, 72)
    const intermediateDone = done('DORA-intermediaire')
    push(
      {
        id: 'DORA-initiale',
        regime: 'DORA',
        label: 'Notification initiale',
        detail: classified
          ? "4 heures après la classification comme incident majeur, et au plus tard 24 heures après la détection."
          : "L'incident n'est pas encore classé : l'échéance retenue est le plafond de 24 heures après la détection. Renseignez l'heure de classification pour appliquer le délai de 4 heures.",
        basis: 'DORA, article 19 — Règlement délégué (UE) 2025/301, article 5',
        authority: doraAuthority,
        due: initialDue,
        provisional: !classified,
      },
      classified ?? detected,
    )
    push(
      {
        id: 'DORA-intermediaire',
        regime: 'DORA',
        label: 'Rapport intermédiaire',
        detail: "72 heures après la notification initiale, puis à chaque évolution significative ou à la demande de l'autorité.",
        basis: 'Règlement délégué (UE) 2025/301, article 5',
        authority: doraAuthority,
        due: intermediateDue,
        provisional: !initialDone,
      },
      initialDone ?? initialDue,
    )
    push(
      {
        id: 'DORA-final',
        regime: 'DORA',
        label: 'Rapport final',
        detail: "Un mois après le dernier rapport intermédiaire, avec l'analyse des causes profondes.",
        basis: 'Règlement délégué (UE) 2025/301, article 5',
        authority: doraAuthority,
        due: addMonth(intermediateDone ?? intermediateDue),
        provisional: !intermediateDone,
      },
      intermediateDone ?? intermediateDue,
    )
  }

  for (const kind of ['CRA-VULN', 'CRA-INC'] as const) {
    if (!regimes.includes(kind)) continue
    const isVuln = kind === 'CRA-VULN'
    const notifDue = addH(detected, 72)
    const notifDone = done(`${kind}-notification`)
    push(
      {
        id: `${kind}-alerte`,
        regime: kind,
        label: 'Alerte précoce',
        detail: isVuln
          ? 'Sous 24 heures, en indiquant les États membres où le produit est mis à disposition.'
          : "Sous 24 heures, en indiquant si l'incident pourrait résulter d'actes illicites ou malveillants.",
        basis: isVuln ? 'CRA, article 14 § 2 a)' : 'CRA, article 14 § 4 a)',
        authority: 'ENISA — CERT-FR',
        due: addH(detected, 24),
        provisional: false,
      },
      detected,
    )
    push(
      {
        id: `${kind}-notification`,
        regime: kind,
        label: isVuln ? 'Notification de vulnérabilité' : "Notification d'incident",
        detail: 'Sous 72 heures : produit concerné, nature de l’exploitation ou de l’incident, mesures correctives disponibles.',
        basis: isVuln ? 'CRA, article 14 § 2 b)' : 'CRA, article 14 § 4 b)',
        authority: 'ENISA — CERT-FR',
        due: notifDue,
        provisional: false,
      },
      detected,
    )
    const finalDue = isVuln ? (corrected ? addH(corrected, 14 * 24) : null) : addMonth(notifDone ?? notifDue)
    push(
      {
        id: `${kind}-final`,
        regime: kind,
        label: 'Rapport final',
        detail: isVuln
          ? corrected
            ? '14 jours après la mise à disposition du correctif ou de la mesure d’atténuation.'
            : "14 jours après la mise à disposition d'un correctif : renseignez sa date pour faire courir le délai."
          : 'Un mois après la notification d’incident.',
        basis: isVuln ? 'CRA, article 14 § 2 c)' : 'CRA, article 14 § 4 c)',
        authority: 'ENISA — CERT-FR',
        due: finalDue,
        provisional: isVuln ? !corrected : !notifDone,
      },
      corrected ?? notifDone ?? notifDue,
    )
  }

  return steps
}

/** Prochaine échéance non accomplie — celle qui commande la mobilisation. */
export function nextDeadline(steps: IncidentStep[]): IncidentStep | null {
  return (
    steps
      .filter((s) => s.due && !s.doneAt)
      .sort((a, b) => a.due!.getTime() - b.due!.getTime())[0] ?? null
  )
}

export function formatRemaining(ms: number): string {
  const abs = Math.abs(ms)
  const d = Math.floor(abs / 86_400_000)
  const h = Math.floor((abs % 86_400_000) / H)
  const m = Math.floor((abs % H) / 60_000)
  const core = d > 0 ? `${d} j ${h} h` : h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`
  return ms < 0 ? `dépassé de ${core}` : core
}

/** Régimes à proposer d'emblée pour un incident, selon les textes applicables. */
export function suggestedRegimes(applicable: RegulationId[], answers: Answers): Regime[] {
  const out: Regime[] = []
  if (applicable.includes('RGPD')) out.push('RGPD')
  // Une entité financière notifie au titre de DORA, qui remplace ici NIS 2 (article 4 de NIS 2).
  const doraPrevails = applicable.includes('DORA') && answers.entite_financiere === 'oui'
  if (applicable.includes('NIS2') && !doraPrevails) out.push('NIS2')
  if (applicable.includes('DORA')) out.push('DORA')
  const fab = Array.isArray(answers.cra_roles) && answers.cra_roles.includes('fabricant')
  if (applicable.includes('CRA') && fab) out.push('CRA-VULN', 'CRA-INC')
  return out
}

// ---------------------------------------------------------------------------
// Préparation au signalement
// ---------------------------------------------------------------------------

export interface ReadinessItem {
  id: string
  label: string
  detail: string
  ok: boolean
  href?: string
}

export function readiness(applicable: RegulationId[], answers: Answers, contacts: InternalContact[]): ReadinessItem[] {
  const has = (role: InternalContact['role']) => contacts.some((c) => c.role === role && c.name.trim())
  const items: ReadinessItem[] = [
    {
      id: 'autorites',
      label: 'Autorités compétentes identifiées',
      detail: applicable.length > 0 ? `${applicable.length} texte${applicable.length > 1 ? 's' : ''} applicable${applicable.length > 1 ? 's' : ''}, autorités déduites de la qualification.` : 'Qualification à terminer.',
      ok: applicable.length > 0,
      href: '/app/qualification',
    },
    {
      id: 'securite',
      label: 'Responsable sécurité désigné',
      detail: 'Premier appelé : il qualifie l’incident et déclenche les horloges.',
      ok: has('rssi'),
    },
    {
      id: 'direction',
      label: 'Décideur de direction désigné',
      detail: 'Arbitre la notification et la communication ; NIS 2 et DORA engagent l’organe de direction.',
      ok: has('direction'),
    },
  ]
  if (applicable.includes('RGPD')) {
    items.splice(2, 0, {
      id: 'dpo',
      label: 'Délégué à la protection des données joignable',
      detail: 'Évalue le risque pour les personnes et prépare la notification à la CNIL sous 72 h.',
      ok: has('dpo'),
    })
  }
  if (applicable.includes('DORA') && answers.entite_financiere === 'oui') {
    items.push({
      id: 'dora',
      label: 'Critères de classification DORA connus',
      detail: 'Le délai de 4 h court à partir de la classification comme majeur (règlement délégué 2024/1772).',
      ok: true,
    })
  }
  return items
}
