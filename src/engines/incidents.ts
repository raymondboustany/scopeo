import type { Answers, IncidentRecord, InternalContact, RegulationId } from '@/types/domain'
import { tr } from '@/i18n'

/**
 * Délais de déclaration d'un incident.
 *
 * Un même événement peut déclencher cinq horloges, auprès d'autorités
 * différentes, avec des points de départ différents : la prise de connaissance
 * pour le RGPD, NIS2, le CRA et l'AI Act ; la classification comme majeur pour
 * DORA ; la mise à disposition d'un correctif pour le rapport final du CRA. Ce
 * moteur les calcule toutes, pour faire apparaître l'échéance qui commande.
 */

export type Regime = 'RGPD' | 'NIS2' | 'DORA' | 'CRA-VULN' | 'CRA-INC' | 'AIACT'

export const REGIME_REGULATION: Record<Regime, RegulationId> = {
  RGPD: 'RGPD',
  NIS2: 'NIS2',
  DORA: 'DORA',
  'CRA-VULN': 'CRA',
  'CRA-INC': 'CRA',
  AIACT: 'AIACT',
}

export const REGIME_LABEL: Record<Regime, { title: string; trigger: string }> = {
  RGPD: {
    title: tr('Violation de données personnelles', 'Personal data breach'),
    trigger: tr(
      'Des données personnelles ont été détruites, perdues, altérées, divulguées ou consultées sans autorisation.',
      'Personal data has been destroyed, lost, altered, disclosed or accessed without authorisation.',
    ),
  },
  NIS2: {
    title: tr('Incident important', 'Significant incident'),
    trigger: tr(
      'Perturbation opérationnelle grave, pertes financières, ou dommages considérables causés à des tiers (art. 23 § 3).',
      'Severe operational disruption, financial loss, or considerable damage to third parties (Art. 23(3)).',
    ),
  },
  DORA: {
    title: tr('Incident majeur lié aux TIC', 'Major ICT-related incident'),
    trigger: tr(
      'Incident classé majeur selon les critères du règlement délégué 2024/1772 : clients touchés, durée, données, services critiques…',
      'Incident classified as major under Delegated Regulation 2024/1772: clients affected, duration, data, critical services…',
    ),
  },
  'CRA-VULN': {
    title: tr('Vulnérabilité activement exploitée', 'Actively exploited vulnerability'),
    trigger: tr(
      "Une vulnérabilité d'un produit mis sur le marché est exploitée par un acteur malveillant.",
      'A vulnerability in a product on the market is being exploited by a malicious actor.',
    ),
  },
  'CRA-INC': {
    title: tr('Incident grave affectant un produit', 'Severe incident affecting a product'),
    trigger: tr(
      "Incident ayant des répercussions sur la sécurité d'un produit, par exemple la compromission de sa chaîne de mise à jour.",
      'Incident affecting the security of a product, for example a compromised update chain.',
    ),
  },
  AIACT: {
    title: tr("Incident grave lié à un système d'IA", 'Serious incident involving an AI system'),
    trigger: tr(
      "Incident ou dysfonctionnement d'un système d'IA à haut risque ayant entraîné un décès, une atteinte grave à la santé, une perturbation grave d'une infrastructure critique, une violation des droits fondamentaux ou un dommage grave aux biens ou à l'environnement (art. 3, point 49).",
      'Incident or malfunction of a high-risk AI system leading to death, serious harm to health, serious disruption of critical infrastructure, an infringement of fundamental rights, or serious harm to property or the environment (Art. 3(49)).',
    ),
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
    role: tr('Autorité de contrôle, protection des données', 'Supervisory authority, data protection'),
    channel: tr('Téléservice de notification des violations de données personnelles', 'Online personal data breach notification service'),
    url: 'https://www.cnil.fr/fr/notifier-une-violation-de-donnees-personnelles',
  },
  ANSSI: {
    id: 'ANSSI',
    name: 'ANSSI (CERT-FR)',
    role: tr('Autorité nationale et CSIRT, cybersécurité', 'National authority and CSIRT, cybersecurity'),
    channel: tr('Signalement au CERT-FR, joignable en permanence', 'Report to CERT-FR, reachable 24/7'),
    url: 'https://cert.ssi.gouv.fr/contact/',
    phone: '3218 · +33 9 70 83 32 18',
    email: 'cert-fr@ssi.gouv.fr',
    note: tr(
      "Tant que la loi de transposition n'est pas promulguée, la notification NIS2 n'est pas juridiquement exigible en France ; le signalement au CERT-FR reste recommandé et les délais sont ceux de la directive.",
      'Until the transposition act is enacted, NIS2 notification is not legally enforceable in France; reporting to CERT-FR is still recommended and the directive\'s deadlines apply.',
    ),
  },
  ACPR: {
    id: 'ACPR',
    name: 'ACPR',
    role: tr('Autorité de supervision, banque, paiement, assurance', 'Supervisor, banking, payments, insurance'),
    channel: tr("Déclaration des incidents majeurs selon l'instruction n° 2025-I-10", 'Major incident reporting under instruction no. 2025-I-10'),
    url: 'https://acpr.banque-france.fr/fr/publications-et-statistiques/publications/instruction-ndeg-2025-i-10-relative-aux-declarations-des-incidents-majeurs-lies-aux-tic-et-aux',
  },
  AMF: {
    id: 'AMF',
    name: 'AMF',
    role: tr('Autorité de supervision, marchés et gestion d’actifs', 'Supervisor, markets and asset management'),
    channel: tr('Formulaire de notification DORA des incidents et cybermenaces', 'DORA incident and cyber threat notification form'),
    url: 'https://www.amf-france.org/en/forms-and-declarations/dora',
  },
  ESMA: {
    id: 'ESMA',
    name: 'AEMF (ESMA)',
    role: tr('Supervision européenne directe', 'Direct European supervision'),
    channel: tr(
      "Agences de notation, référentiels centraux et référentiels des titrisations relèvent directement de l'ESMA",
      'Credit rating agencies, trade repositories and securitisation repositories report directly to ESMA',
    ),
    url: 'https://www.esma.europa.eu/',
  },
  ENISA: {
    id: 'ENISA',
    name: tr('ENISA, plateforme unique', 'ENISA, single reporting platform'),
    role: tr('Signalement CRA, transmis au CERT-FR', 'CRA reporting, forwarded to CERT-FR'),
    channel: tr(
      'Plateforme unique de signalement (art. 16 CRA), qui transmet simultanément au CSIRT coordinateur',
      'Single reporting platform (Art. 16 CRA), which forwards simultaneously to the coordinating CSIRT',
    ),
    url: 'https://cyber.gouv.fr/reglementation/cybersecurite-des-produits/cyber-resilience-act/',
    note: tr(
      "La surveillance du marché des produits est pressentie pour l'ANFR ; sa désignation formelle reste à confirmer.",
      'Product market surveillance is expected to go to ANFR; formal designation is still pending.',
    ),
  },
  MSA_IA: {
    id: 'MSA_IA',
    name: tr('Autorité de surveillance du marché (IA)', 'Market surveillance authority (AI)'),
    role: tr('Surveillance des systèmes d’IA, DGCCRF en coordination (pressentie)', 'AI systems supervision, DGCCRF coordinating (expected)'),
    channel: tr(
      "Canal à confirmer : la désignation des autorités françaises dépend d'un projet de loi en discussion",
      'Channel to be confirmed: designation of French authorities depends on a bill under discussion',
    ),
    url: 'https://www.entreprises.gouv.fr/priorites-et-actions/transition-numerique/soutenir-le-developpement-de-lia-au-service-de-0',
    note: tr(
      "Le schéma gouvernemental confie la coordination à la DGCCRF, avec la CNIL pour la biométrie et les données personnelles, et les autorités sectorielles (ACPR, Arcom, ANSM) dans leurs domaines.",
      'The government plan gives coordination to the DGCCRF, with the CNIL for biometrics and personal data, and sectoral authorities (ACPR, Arcom, ANSM) in their fields.',
    ),
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
    case 'AIACT':
      return [AUTHORITIES.MSA_IA]
  }
}

// ---------------------------------------------------------------------------
// Délais de référence
// ---------------------------------------------------------------------------

/** Délais de notification par texte, dans l'ordre des étapes. */
export const NOTIFICATION_DELAYS: Record<RegulationId, { step: string; delay: string }[]> = {
  RGPD: [{ step: tr('Notification', 'Notification'), delay: tr('72 h', '72 h') }],
  NIS2: [
    { step: tr('Alerte précoce', 'Early warning'), delay: '24 h' },
    { step: tr('Notification', 'Notification'), delay: '72 h' },
    { step: tr('Rapport final', 'Final report'), delay: tr('1 mois', '1 month') },
  ],
  DORA: [
    { step: tr('Notification initiale', 'Initial notification'), delay: '4 h*' },
    { step: tr('Rapport intermédiaire', 'Intermediate report'), delay: '72 h' },
    { step: tr('Rapport final', 'Final report'), delay: tr('1 mois', '1 month') },
  ],
  CRA: [
    { step: tr('Alerte précoce', 'Early warning'), delay: '24 h' },
    { step: tr('Notification', 'Notification'), delay: '72 h' },
    { step: tr('Rapport final', 'Final report'), delay: tr('14 j / 1 mois', '14 d / 1 month') },
  ],
  AIACT: [
    { step: tr('Infrastructure critique, grande ampleur', 'Critical infrastructure, widespread'), delay: tr('2 j', '2 d') },
    { step: tr('Décès', 'Death'), delay: tr('10 j', '10 d') },
    { step: tr('Autre incident grave', 'Other serious incident'), delay: tr('15 j', '15 d') },
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
        label: tr('Notification à la CNIL', 'Notification to the CNIL'),
        detail: tr(
          'Dans les meilleurs délais et au plus tard 72 heures après la prise de connaissance, sauf risque improbable pour les personnes. Tout retard doit être motivé.',
          'Without undue delay and no later than 72 hours after becoming aware, unless the breach is unlikely to result in a risk to individuals. Any delay must be justified.',
        ),
        basis: tr('RGPD, article 33', 'GDPR, Article 33'),
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
        label: tr('Communication aux personnes concernées', 'Communication to data subjects'),
        detail: tr(
          "Dans les meilleurs délais, si la violation est susceptible d'engendrer un risque élevé. Aucun délai chiffré : c'est la gravité qui commande.",
          'Without undue delay, if the breach is likely to result in a high risk. No fixed deadline: severity decides.',
        ),
        basis: tr('RGPD, article 34', 'GDPR, Article 34'),
        authority: tr('Personnes concernées', 'Data subjects'),
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
        label: tr('Alerte précoce', 'Early warning'),
        detail: tr(
          'Sous 24 heures : caractère malveillant suspecté, impact transfrontière possible.',
          'Within 24 hours: suspected malicious cause, possible cross-border impact.',
        ),
        basis: tr('NIS2, article 23 § 4 a)', 'NIS2, Article 23(4)(a)'),
        authority: 'ANSSI (CERT-FR)',
        due: addH(detected, 24),
        provisional: false,
      },
      detected,
    )
    push(
      {
        id: 'NIS2-notification',
        regime: 'NIS2',
        label: tr("Notification d'incident", 'Incident notification'),
        detail: tr(
          "Sous 72 heures : évaluation initiale de la gravité et de l'impact, indicateurs de compromission.",
          'Within 72 hours: initial assessment of severity and impact, indicators of compromise.',
        ),
        basis: tr('NIS2, article 23 § 4 b)', 'NIS2, Article 23(4)(b)'),
        authority: 'ANSSI (CERT-FR)',
        due: notifDue,
        provisional: false,
      },
      detected,
    )
    push(
      {
        id: 'NIS2-final',
        regime: 'NIS2',
        label: tr('Rapport final', 'Final report'),
        detail: tr(
          "Un mois après la notification : description détaillée, cause profonde, mesures d'atténuation, impact transfrontière.",
          'One month after notification: detailed description, root cause, mitigation measures, cross-border impact.',
        ),
        basis: tr('NIS2, article 23 § 4 d)', 'NIS2, Article 23(4)(d)'),
        authority: 'ANSSI (CERT-FR)',
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
        label: tr('Notification initiale', 'Initial notification'),
        detail: classified
          ? tr(
              '4 heures après la classification comme incident majeur, et au plus tard 24 heures après la détection.',
              '4 hours after classification as a major incident, and no later than 24 hours after detection.',
            )
          : tr(
              "L'incident n'est pas encore classé : l'échéance retenue est le plafond de 24 heures après la détection. Renseignez l'heure de classification pour appliquer le délai de 4 heures.",
              'The incident is not yet classified: the deadline used is the 24-hour cap after detection. Enter the classification time to apply the 4-hour deadline.',
            ),
        basis: tr('DORA, article 19 ; règlement délégué (UE) 2025/301, article 5', 'DORA, Article 19; Delegated Regulation (EU) 2025/301, Article 5'),
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
        label: tr('Rapport intermédiaire', 'Intermediate report'),
        detail: tr(
          "72 heures après la notification initiale, puis à chaque évolution significative ou à la demande de l'autorité.",
          '72 hours after the initial notification, then at each significant change or at the authority\'s request.',
        ),
        basis: tr('Règlement délégué (UE) 2025/301, article 5', 'Delegated Regulation (EU) 2025/301, Article 5'),
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
        label: tr('Rapport final', 'Final report'),
        detail: tr(
          "Un mois après le dernier rapport intermédiaire, avec l'analyse des causes profondes.",
          'One month after the last intermediate report, with root-cause analysis.',
        ),
        basis: tr('Règlement délégué (UE) 2025/301, article 5', 'Delegated Regulation (EU) 2025/301, Article 5'),
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
    const authority = 'ENISA (CERT-FR)'
    push(
      {
        id: `${kind}-alerte`,
        regime: kind,
        label: tr('Alerte précoce', 'Early warning'),
        detail: isVuln
          ? tr(
              'Sous 24 heures, en indiquant les États membres où le produit est mis à disposition.',
              'Within 24 hours, stating the Member States where the product is made available.',
            )
          : tr(
              "Sous 24 heures, en indiquant si l'incident pourrait résulter d'actes illicites ou malveillants.",
              'Within 24 hours, stating whether the incident may result from unlawful or malicious acts.',
            ),
        basis: isVuln ? tr('CRA, article 14 § 2 a)', 'CRA, Article 14(2)(a)') : tr('CRA, article 14 § 4 a)', 'CRA, Article 14(4)(a)'),
        authority,
        due: addH(detected, 24),
        provisional: false,
      },
      detected,
    )
    push(
      {
        id: `${kind}-notification`,
        regime: kind,
        label: isVuln ? tr('Notification de vulnérabilité', 'Vulnerability notification') : tr("Notification d'incident", 'Incident notification'),
        detail: tr(
          'Sous 72 heures : produit concerné, nature de l’exploitation ou de l’incident, mesures correctives disponibles.',
          'Within 72 hours: product concerned, nature of the exploit or incident, available corrective measures.',
        ),
        basis: isVuln ? tr('CRA, article 14 § 2 b)', 'CRA, Article 14(2)(b)') : tr('CRA, article 14 § 4 b)', 'CRA, Article 14(4)(b)'),
        authority,
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
        label: tr('Rapport final', 'Final report'),
        detail: isVuln
          ? corrected
            ? tr(
                '14 jours après la mise à disposition du correctif ou de la mesure d’atténuation.',
                '14 days after the fix or mitigation is made available.',
              )
            : tr(
                "14 jours après la mise à disposition d'un correctif : renseignez sa date pour faire courir le délai.",
                '14 days after a fix is made available: enter its date to start the clock.',
              )
          : tr('Un mois après la notification d’incident.', 'One month after the incident notification.'),
        basis: isVuln ? tr('CRA, article 14 § 2 c)', 'CRA, Article 14(2)(c)') : tr('CRA, article 14 § 4 c)', 'CRA, Article 14(4)(c)'),
        authority,
        due: finalDue,
        provisional: isVuln ? !corrected : !notifDone,
      },
      corrected ?? notifDone ?? notifDue,
    )
  }

  if (regimes.includes('AIACT')) {
    const authority = AUTHORITIES.MSA_IA.name
    push(
      {
        id: 'AIACT-signalement',
        regime: 'AIACT',
        label: tr("Signalement de l'incident grave", 'Serious incident report'),
        detail: tr(
          "Immédiatement après avoir établi un lien de causalité, et au plus tard 15 jours après la prise de connaissance. Le délai tombe à 2 jours pour une perturbation d'infrastructure critique ou une infraction de grande ampleur, et à 10 jours en cas de décès. Un signalement initial incomplet est admis.",
          'Immediately after establishing a causal link, and no later than 15 days after becoming aware. The deadline drops to 2 days for critical infrastructure disruption or a widespread infringement, and to 10 days in case of death. An incomplete initial report is allowed.',
        ),
        basis: tr('AI Act, article 73 § 2 à 5', 'AI Act, Article 73(2) to (5)'),
        authority,
        due: addH(detected, 15 * 24),
        provisional: false,
      },
      detected,
    )
    push(
      {
        id: 'AIACT-enquete',
        regime: 'AIACT',
        label: tr('Enquête et mesures correctives', 'Investigation and corrective action'),
        detail: tr(
          "Sans tarder après le signalement : évaluation des risques et mesures correctives, sans modifier le système avant d'en avoir informé l'autorité.",
          'Promptly after reporting: risk assessment and corrective action, without altering the system before informing the authority.',
        ),
        basis: tr('AI Act, article 73 § 6', 'AI Act, Article 73(6)'),
        authority,
        due: null,
        provisional: false,
      },
      detected,
    )
  }

  return steps
}

/** Prochaine échéance non accomplie : celle qui commande la mobilisation. */
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
  const day = tr('j', 'd')
  const core = d > 0 ? `${d} ${day} ${h} h` : h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`
  return ms < 0 ? tr(`dépassé de ${core}`, `overdue by ${core}`) : core
}

/** Régimes à proposer d'emblée pour un incident, selon les textes applicables. */
export function suggestedRegimes(applicable: RegulationId[], answers: Answers): Regime[] {
  const out: Regime[] = []
  if (applicable.includes('RGPD')) out.push('RGPD')
  // Une entité financière notifie au titre de DORA, qui remplace ici NIS2 (article 4 de NIS2).
  const doraPrevails = applicable.includes('DORA') && answers.entite_financiere === 'oui'
  if (applicable.includes('NIS2') && !doraPrevails) out.push('NIS2')
  if (applicable.includes('DORA')) out.push('DORA')
  const fab = Array.isArray(answers.cra_roles) && answers.cra_roles.includes('fabricant')
  if (applicable.includes('CRA') && fab) out.push('CRA-VULN', 'CRA-INC')
  const highRisk =
    Array.isArray(answers.ia_haut_risque) &&
    answers.ia_haut_risque.some((v) => v !== 'aucun') &&
    !(answers.ia_derogation === 'oui' && !answers.ia_haut_risque.includes('produit'))
  if (applicable.includes('AIACT') && highRisk) out.push('AIACT')
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
  const n = applicable.length
  const items: ReadinessItem[] = [
    {
      id: 'autorites',
      label: tr('Autorités compétentes identifiées', 'Competent authorities identified'),
      detail:
        n > 0
          ? tr(
              `${n} texte${n > 1 ? 's' : ''} applicable${n > 1 ? 's' : ''}, autorités déduites de la qualification.`,
              `${n} applicable text${n > 1 ? 's' : ''}, authorities derived from the scoping.`,
            )
          : tr('Qualification à terminer.', 'Scoping to be completed.'),
      ok: n > 0,
      href: '/app/qualification',
    },
    {
      id: 'securite',
      label: tr('Responsable sécurité désigné', 'Security lead designated'),
      detail: tr(
        'Premier appelé : il qualifie l’incident et déclenche les horloges.',
        'First on call: qualifies the incident and starts the clocks.',
      ),
      ok: has('rssi'),
    },
    {
      id: 'direction',
      label: tr('Décideur de direction désigné', 'Executive decision-maker designated'),
      detail: tr(
        'Arbitre la notification et la communication ; NIS2 et DORA engagent l’organe de direction.',
        'Decides on notification and communication; NIS2 and DORA hold the management body accountable.',
      ),
      ok: has('direction'),
    },
  ]
  if (applicable.includes('RGPD')) {
    items.splice(2, 0, {
      id: 'dpo',
      label: tr('Délégué à la protection des données joignable', 'Data protection officer reachable'),
      detail: tr(
        'Évalue le risque pour les personnes et prépare la notification à la CNIL sous 72 h.',
        'Assesses the risk to individuals and prepares the CNIL notification within 72 h.',
      ),
      ok: has('dpo'),
    })
  }
  if (applicable.includes('DORA') && answers.entite_financiere === 'oui') {
    items.push({
      id: 'dora',
      label: tr('Critères de classification DORA connus', 'DORA classification criteria known'),
      detail: tr(
        'Le délai de 4 h court à partir de la classification comme majeur (règlement délégué 2024/1772).',
        'The 4-hour clock runs from classification as major (Delegated Regulation 2024/1772).',
      ),
      ok: true,
    })
  }
  return items
}
