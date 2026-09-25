/**
 * Génère l'entité de démonstration : Finexa, fintech de 50 salariés.
 *
 * Les réponses sont saisies ici ; tout le reste (verdicts, périmètre, score,
 * instantané public) est calculé par les moteurs de l'application, pour que la
 * démonstration reste cohérente avec le corpus quand celui-ci évolue.
 *
 *   npm run demo:build
 */
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { deriveScoping } from '../src/lib/hooks'
import { buildSnapshot } from '../src/engines/scores'
import { isComplete, visibleQuestions } from '../src/data/questionnaire'
import type { Answers, CoverageEntry, CoverageLevel, EntityNote, EntityProfile, EntityRecord, InternalContact, IsoAssessment, MeasureStatus } from '../src/types/domain'

const answers: Answers = {
  secteur: 'infra_numerique',
  effectif: 'moyenne',
  chiffre_affaires: '10a50',
  bilan: '10a43',
  etablissement_ue: 'oui',
  etats_membres: 'deux_cinq',
  donnees_perso: 'oui',
  role_rgpd: 'les_deux',
  donnees_sensibles: 'non',
  suivi_grande_echelle: 'oui',
  autorite_publique: 'non',
  transferts_hors_ue: 'oui',
  base_consentement: 'non',
  type_taille_independante: ['aucun'],
  services_ict: 'oui',
  type_fournisseur_num: ['cloud'],
  criticite_service: 'modere',
  entite_critique: 'incertain',
  entite_financiere: 'oui',
  type_financier: 'paiement',
  dora_regime_simplifie: 'non',
  dora_tlpt: 'non',
  tiers_ict_critiques: 'oui',
  cra_roles: ['fabricant'],
  cra_categorie: 'defaut',
  cra_exclu: 'non',
  incidents_recents: 'recent',
  ia_roles: ['deployeur'],
  ia_pratiques: 'non',
  ia_haut_risque: ['aucun'],
  ia_transparence: ['interaction'],
}

// Couverture : une fintech jeune, bien outillée techniquement, plus faible
// sur la gouvernance, les tiers et la documentation.
const STRONG = ['protection', 'detection', 'donnees']
const WEAK = ['tiers', 'documentation', 'resilience']
function levelFor(themeId: string, domain: string, i: number): CoverageLevel {
  const h = [...themeId].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 997, 7) + i
  if (STRONG.includes(domain)) return h % 5 === 0 ? 'partiel' : 'en_place'
  if (WEAK.includes(domain)) return h % 3 === 0 ? 'partiel' : h % 3 === 1 ? 'absent' : 'non_evalue'
  return h % 4 === 0 ? 'absent' : h % 4 === 1 ? 'en_place' : 'partiel'
}

const OWNERS: Record<string, string> = {
  gouvernance: 'Direction générale',
  risques: 'RSSI',
  protection: 'DSI',
  detection: 'RSSI',
  reponse: 'RSSI',
  resilience: 'DSI',
  tiers: 'Achats',
  donnees: 'DPO',
  documentation: 'Conformité',
  ia: 'DPO',
}

const contacts: InternalContact[] = [
  { id: 'c-rssi', role: 'rssi', name: 'Karim Benali', title: 'Responsable de la sécurité des systèmes d’information', email: 'rssi@finexa.example', phone: '+33 1 84 00 00 11' },
  { id: 'c-ir', role: 'reponse', name: 'Astreinte 24/7', title: 'Prestataire de réponse aux incidents qualifié PRIS, contrat d’intervention', email: 'astreinte@prestataire.example', phone: '+33 1 84 00 00 20' },
  { id: 'c-dpo', role: 'dpo', name: 'Claire Morel', title: 'Déléguée à la protection des données', email: 'dpo@finexa.example', phone: '+33 1 84 00 00 12' },
  { id: 'c-dir', role: 'direction', name: 'Thomas Lefèvre', title: 'Directeur général délégué', email: 'direction@finexa.example', phone: '+33 1 84 00 00 10' },
  { id: 'c-jur', role: 'juridique', name: 'Inès Garnier', title: 'Responsable conformité', email: 'conformite@finexa.example', phone: '+33 1 84 00 00 13' },
]

// Fiche : Finexa est cadrée par un cabinet de conseil (données fictives).
const profile: EntityProfile = {
  mode: 'client',
  legalName: 'Finexa SAS',
  siren: '000 000 000',
  group: 'Indépendant',
  address: 'Paris',
  missionRef: 'CAD-2026-014',
  objective: "Établir les textes applicables avant l'audit ACPR de 2027 et arbitrer le budget conformité de l'exercice.",
  startDate: '2026-09-07',
  reportDate: '2026-10-16',
  lead: 'Consultant du cabinet',
  sponsor: 'Thomas Lefèvre, directeur général délégué',
  stakeholders: [
    { id: 's1', name: 'Karim Benali', role: 'RSSI', email: 'rssi@finexa.example' },
    { id: 's2', name: 'Claire Morel', role: 'DPO', email: 'dpo@finexa.example' },
    { id: 's3', name: 'Inès Garnier', role: 'Conformité', email: 'conformite@finexa.example' },
  ],
  // Démarche ISO 27001 engagée sur tout le périmètre, sans certification à ce stade.
  iso27001: { status: 'partiel', perimeter: 'integral' },
}

// Déclaration ISO 27001 : saisie groupée par thème, détaillée sur les contrôles
// technologiques, avec une exclusion qui déclenche l'alerte réglementaire.
const iso_controls: IsoAssessment = {
  themes: {
    A5: { applicability: 'applicable', implementation: 'partiel' },
    A6: { applicability: 'applicable', implementation: 'mis_en_oeuvre' },
    A7: { applicability: 'applicable', implementation: 'partiel' },
    A8: { applicability: 'applicable', implementation: 'mis_en_oeuvre' },
  },
  controls: {
    '8.16': { applicability: 'non_applicable', justification: 'Supervision confiée au prestataire d’hébergement, hors du système de management.' },
    '8.28': { applicability: 'applicable', implementation: 'partiel' },
  },
  detailed: ['A8'],
}

const at = '2026-09-18T10:00:00.000Z'
const notes: EntityNote[] = [
  { id: 'n1', tag: 'verifier', text: "Confirmer que l'agrément ACPR ne couvre pas aussi l'émission de monnaie électronique : cela changerait le type d'entité financière.", anchor: { kind: 'question', id: 'type_financier', label: "Type d'entité financière" }, resolved: false, createdAt: at, updatedAt: at },
  { id: 'n2', tag: 'hypothese', text: "Le SDK d'encaissement est distribué gratuitement mais intégré à une offre payante : retenu comme mis sur le marché au sens du CRA.", anchor: { kind: 'question', id: 'cra_roles', label: 'Produits comportant des éléments numériques' }, resolved: false, createdAt: at, updatedAt: at },
  { id: 'n3', tag: 'preuve', text: "Obtenir le registre des prestataires TIC tenu par les Achats (format et date de dernière mise à jour).", anchor: { kind: 'theme', id: 'TIE-02', label: 'Registre et cartographie des tiers' }, resolved: false, createdAt: at, updatedAt: at },
  { id: 'n4', tag: 'decision', text: 'Le DPO et le RSSI restent deux fonctions distinctes ; le RSSI devient point de contact DORA.', anchor: { kind: 'theme', id: 'GOV-02', label: 'Fonction dédiée et point de contact' }, resolved: false, createdAt: at, updatedAt: at },
]

const base: EntityRecord = {
  id: 'demo-finexa',
  user_id: 'demo-user',
  name: 'Finexa',
  scope_note:
    "Établissement de paiement agréé par l'ACPR, 50 salariés, présent en France, en Belgique et en Espagne. Fournit une plateforme de paiement en nuage à des commerçants et édite un SDK d'encaissement intégré dans leurs applications.",
  answers,
  coverage: {},
  measures: {},
  weights: {},
  contacts,
  seen_alerts: [],
  profile,
  notes,
  iso_controls,
  public_snapshot: null,
  share_enabled: true,
  share_token: 'demo',
  is_demo: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

if (!isComplete(answers)) {
  const missing = visibleQuestions(answers).filter((q) => q.required && (answers[q.id] === undefined || answers[q.id] === ''))
  throw new Error(`Questionnaire incomplet : ${missing.map((q) => q.id).join(', ')}`)
}

// Premier passage : périmètre, pour savoir quelles exigences évaluer.
const first = deriveScoping(base)
const now = new Date().toISOString()
const coverage: Record<string, CoverageEntry> = {}
// Protection et détection ne sont pas saisies à la main : le module ISO 27001
// les pré-remplit, ce que la démonstration doit montrer.
const ISO_FILLED = ['protection', 'detection']
first.prioritised.forEach((p, i) => {
  if (ISO_FILLED.includes(p.theme.domain)) return
  const level = levelFor(p.themeId, p.theme.domain, i)
  if (level === 'non_evalue') return
  coverage[p.themeId] = { level, owner: OWNERS[p.theme.domain], updatedAt: now }
})

const measures: Record<string, MeasureStatus> = {}
// Entité financière : DORA prime, les mesures ANSSI ne s'imposent pas (article 4 de NIS2).
const anssiObjectives = first.anssiApplies ? first.recyf : []
anssiObjectives.forEach((o) =>
  o.measures.forEach((m, j) => {
    const h = (o.n * 7 + j * 3) % 10
    if (h < 4) measures[m.id] = 'en_place'
    else if (h < 7) measures[m.id] = 'partiel'
    else if (h < 9) measures[m.id] = 'absent'
  }),
)

const entity = { ...base, coverage, measures }
const scoping = deriveScoping(entity)
const snapshot = buildSnapshot(answers, scoping.qualification, scoping.prioritised, scoping.applicable, profile.iso27001)

const seed = {
  entity: {
    name: entity.name,
    scope_note: entity.scope_note,
    answers,
    coverage,
    measures,
    weights: {},
    contacts,
    profile,
    notes,
    iso_controls,
    public_snapshot: snapshot,
  },
}

const out = path.resolve(import.meta.dirname ?? __dirname, '../server/app/demo_seed.json')
writeFileSync(out, JSON.stringify(seed, null, 2) + '\n', 'utf-8')

console.log('Verdicts :')
for (const [r, v] of Object.entries(scoping.qualification!.verdicts)) console.log(`  ${r.padEnd(5)} ${v.status.padEnd(11)} ${v.qualification ?? ''}`)
console.log(`Catégorie NIS2 : ${scoping.nis2Category}`)
console.log(`Exigences unifiées : ${scoping.prioritised.length}, score ${Math.round(scoping.scores.global.score * 100)} %`)
for (const [r, l] of Object.entries(scoping.scores.byRegulation)) console.log(`  ${r.padEnd(5)} ${Math.round(l!.score * 100)} % (${l!.inPlace}/${l!.themes})`)
console.log(`Mesures ANSSI : ${scoping.anssiApplies ? `${scoping.measures.en_place}/${scoping.measures.total} en place` : "sans objet (DORA prime)"}`)
console.log(`Écrit : ${out}`)
