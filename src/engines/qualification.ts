import { CORPUS_DATE_LONG } from '@/data/meta'
import type {
  Answers,
  LegalBasis,
  QualificationResult,
  RegulationId,
  RegulationVerdict,
  VerdictStatus,
} from '@/types/domain'
import { SECTOR_BY_VALUE, SIZE_INDEPENDENT_TYPES } from '@/data/questionnaire'
import { REGULATIONS } from '@/data/regulations'

/**
 * Moteur de qualification.
 *
 * Le principe directeur est qu'aucun verdict ne doit être rendu sans son
 * fondement. Chaque conclusion est accompagnée des articles examinés, de
 * l'état de chaque condition, et des réserves qui subsistent. Un outil de
 * cadrage qui affirme sans démontrer n'est pas opposable, et donc pas utile.
 */

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

const TURNOVER_MIDPOINT: Record<string, number> = {
  lt2: 1_000_000,
  '2a10': 6_000_000,
  '10a50': 30_000_000,
  '50a250': 150_000_000,
  '250a1000': 500_000_000,
  gt1000: 2_000_000_000,
}

const TURNOVER_LABEL: Record<string, string> = {
  lt2: 'moins de 2 M€',
  '2a10': 'de 2 à 10 M€',
  '10a50': 'de 10 à 50 M€',
  '50a250': 'de 50 à 250 M€',
  '250a1000': 'de 250 M€ à 1 Md€',
  gt1000: 'plus de 1 Md€',
}

const str = (a: Answers, k: string): string => (typeof a[k] === 'string' ? (a[k] as string) : '')
const list = (a: Answers, k: string): string[] => (Array.isArray(a[k]) ? (a[k] as string[]) : [])

/**
 * Seuil de moyenne entreprise au sens de la recommandation 2003/361/CE.
 * Une entité l'atteint dès 50 personnes, ou si chiffre d'affaires et bilan
 * dépassent tous deux 10 M€.
 */
export function meetsMediumThreshold(a: Answers): boolean {
  const effectif = str(a, 'effectif')
  if (effectif === 'moyenne' || effectif === 'grande') return true
  const caOver10 = ['10a50', '50a250', '250a1000', 'gt1000'].includes(str(a, 'chiffre_affaires'))
  const bilanOver10 = ['10a43', 'gt43'].includes(str(a, 'bilan'))
  return caOver10 && bilanOver10
}

/** Seuil de grande entreprise : 250 personnes, ou CA > 50 M€ et bilan > 43 M€. */
export function exceedsMediumThreshold(a: Answers): boolean {
  if (str(a, 'effectif') === 'grande') return true
  const caOver50 = ['50a250', '250a1000', 'gt1000'].includes(str(a, 'chiffre_affaires'))
  const bilanOver43 = str(a, 'bilan') === 'gt43'
  return caOver50 && bilanOver43
}

export function turnoverEstimate(a: Answers): number {
  return TURNOVER_MIDPOINT[str(a, 'chiffre_affaires')] ?? 0
}

// ---------------------------------------------------------------------------
// Exposition aux sanctions
// ---------------------------------------------------------------------------

function exposure(
  regulation: RegulationId,
  tierId: string,
  a: Answers,
): RegulationVerdict['exposure'] {
  const tier = REGULATIONS[regulation].sanctions.find((s) => s.id === tierId)
  if (!tier) return null

  const ca = turnoverEstimate(a)
  const caLabel = TURNOVER_LABEL[str(a, 'chiffre_affaires')] ?? 'non renseigné'

  if (tier.turnoverPct && tier.capEur) {
    const pctAmount = Math.round(ca * (tier.turnoverPct / 100))
    const max = tier.capRule === 'le_plus_bas' ? Math.min(pctAmount, tier.capEur) : Math.max(pctAmount, tier.capEur)
    return {
      tier: tier.label,
      maxEur: max,
      formula: `${tier.turnoverPct.toLocaleString('fr-FR')} % d'un chiffre d'affaires ${/^de /i.test(caLabel) ? caLabel.charAt(0).toLowerCase() + caLabel.slice(1) : `de ${caLabel}`} représente environ ${fmtEur(pctAmount)} ; le plafond forfaitaire est de ${fmtEur(tier.capEur)}. Le montant ${tier.capRule === 'le_plus_bas' ? 'le plus bas' : 'le plus élevé'} est retenu.`,
    }
  }

  if (tier.turnoverPct) {
    return {
      tier: tier.label,
      maxEur: null,
      formula: `${tier.turnoverPct.toLocaleString('fr-FR')} % du chiffre d'affaires quotidien moyen mondial, par jour de manquement, pendant six mois au maximum.`,
    }
  }

  return { tier: tier.label, maxEur: null, formula: tier.note ?? tier.basis }
}

export function fmtEur(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M€`
  if (n >= 1_000) return `${(n / 1_000).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} k€`
  return `${n.toLocaleString('fr-FR')} €`
}

// ---------------------------------------------------------------------------
// RGPD — articles 2 et 3
// ---------------------------------------------------------------------------

function qualifyRgpd(a: Answers): RegulationVerdict {
  const traite = str(a, 'donnees_perso')
  const etabliUe = str(a, 'etablissement_ue') === 'oui'
  const cible = str(a, 'cible_ue') === 'oui'

  const basis: LegalBasis[] = [
    {
      article: 'Article 2',
      label: 'Traitement de données à caractère personnel',
      met: traite === 'oui',
      detail:
        traite === 'oui'
          ? "L'entité déclare traiter des données à caractère personnel : le règlement s'applique matériellement."
          : traite === 'incertain'
            ? "Le traitement est incertain. En pratique, toute organisation employant du personnel traite des données personnelles ; la réponse mérite d'être confirmée."
            : "Aucun traitement déclaré. Cette situation est exceptionnelle et doit être vérifiée, notamment au regard des données de salariés et des journaux techniques.",
    },
    {
      article: 'Article 3, paragraphe 1',
      label: "Établissement dans l'Union",
      met: etabliUe,
      detail: etabliUe
        ? "L'entité est établie dans l'Union : le critère territorial est rempli, quel que soit le lieu du traitement."
        : "L'entité n'est pas établie dans l'Union ; le critère de l'établissement ne s'applique pas.",
    },
  ]

  if (!etabliUe) {
    basis.push({
      article: 'Article 3, paragraphe 2',
      label: "Ciblage de personnes situées dans l'Union",
      met: cible,
      detail: cible
        ? "L'entité offre des biens ou services à des personnes dans l'Union ou suit leur comportement : le règlement s'applique, et un représentant doit être désigné au titre de l'article 27."
        : "Aucun ciblage déclaré. Le règlement ne s'applique pas sur ce fondement.",
    })
  }

  const territorial = etabliUe || cible
  let status: VerdictStatus = 'hors_champ'
  if (traite === 'oui' && territorial) status = 'applicable'
  else if (traite === 'incertain' && territorial) status = 'probable'

  const caveats: string[] = []
  if (traite === 'incertain') {
    caveats.push("Confirmer la présence de traitements de données personnelles, y compris les données de salariés et les journaux techniques contenant des identifiants ou des adresses réseau.")
  }
  if (status !== 'hors_champ' && str(a, 'suivi_grande_echelle') === 'incertain') {
    caveats.push("La notion de « grande échelle » s'apprécie au regard du nombre de personnes concernées, du volume de données, de la durée et de l'étendue géographique. Un avis juridique est recommandé avant de conclure à l'absence d'obligation de désigner un délégué.")
  }
  if (status !== 'hors_champ') {
    caveats.push("Le volet « données » du paquet Digital Omnibus, en négociation depuis novembre 2025, pourrait modifier la définition de la donnée personnelle et le régime du consentement. Aucun texte n'est adopté à ce jour.")
  }

  const dpoRequired =
    str(a, 'autorite_publique') === 'oui' ||
    str(a, 'suivi_grande_echelle') === 'oui'

  return {
    regulation: 'RGPD',
    status,
    qualification:
      status === 'hors_champ'
        ? null
        : dpoRequired
          ? 'Responsable soumis à désignation d\'un délégué'
          : str(a, 'role_rgpd') === 'sous_traitant'
            ? 'Sous-traitant'
            : str(a, 'role_rgpd') === 'les_deux'
              ? 'Responsable de traitement et sous-traitant'
              : 'Responsable de traitement',
    basis,
    caveats,
    exposure: status === 'hors_champ' ? null : exposure('RGPD', 'RGPD-T2', a),
  }
}

// ---------------------------------------------------------------------------
// NIS 2 — articles 2 et 3
// ---------------------------------------------------------------------------

interface Nis2Outcome {
  verdict: RegulationVerdict
  category: 'essentielle' | 'importante' | null
}

function qualifyNis2(a: Answers, recIdentified: boolean): Nis2Outcome {
  const sector = SECTOR_BY_VALUE.get(str(a, 'secteur'))
  const annex = sector?.nis2Annex ?? null
  const sizeTypes = list(a, 'type_taille_independante').filter((v) => v !== 'aucun')
  const medium = meetsMediumThreshold(a)
  const large = exceedsMediumThreshold(a)
  const criticite = str(a, 'criticite_service')
  const isFinancial = str(a, 'entite_financiere') === 'oui'

  const basis: LegalBasis[] = [
    {
      article: 'Annexes I et II',
      label: 'Appartenance à un secteur couvert',
      met: annex !== null,
      detail: annex
        ? `Le secteur « ${sector?.label} » relève de l'annexe ${annex} — ${annex === 'I' ? 'secteurs hautement critiques' : 'autres secteurs critiques'}.`
        : `Le secteur « ${sector?.label ?? 'non renseigné'} » ne figure ni à l'annexe I ni à l'annexe II.`,
    },
    {
      article: 'Article 2, paragraphe 1',
      label: 'Franchissement du seuil de moyenne entreprise',
      met: medium,
      detail: medium
        ? large
          ? "L'entité dépasse les plafonds de la moyenne entreprise : elle est une grande entreprise au sens de la recommandation 2003/361/CE."
          : "L'entité atteint le seuil de moyenne entreprise : 50 personnes, ou chiffre d'affaires et bilan supérieurs à 10 M€."
        : "L'entité n'atteint pas le seuil de moyenne entreprise. Elle n'est soumise à la directive que par un autre fondement.",
    },
  ]

  // Entités visées indépendamment de la taille
  if (sizeTypes.length > 0) {
    const essentialTypes = sizeTypes.filter(
      (v) => SIZE_INDEPENDENT_TYPES.find((t) => t.value === v)?.essential,
    )
    basis.push({
      article: 'Article 2, paragraphe 2, et article 3, paragraphe 1',
      label: 'Entité visée quelle que soit sa taille',
      met: true,
      detail: `Types déclarés : ${sizeTypes
        .map((v) => SIZE_INDEPENDENT_TYPES.find((t) => t.value === v)?.label ?? v)
        .join(', ')}. ${
        essentialTypes.length > 0
          ? "Au moins l'un de ces types emporte la qualification d'entité essentielle sans condition de taille."
          : "Ces types relèvent de la directive sans condition de taille, avec la qualification d'entité importante."
      }`,
    })
  }

  // Désignation comme entité critique
  if (recIdentified) {
    basis.push({
      article: 'Article 3, paragraphe 1, point f)',
      label: "Entité désignée critique ou d'importance vitale",
      met: true,
      detail:
        "L'identification comme entité critique emporte de plein droit la qualification d'entité essentielle, sans condition de taille ni de secteur.",
    })
  }

  // Identification discrétionnaire par l'État membre
  if (criticite === 'majeur') {
    basis.push({
      article: 'Article 2, paragraphe 2, points b) à e)',
      label: "Identification possible par l'État membre",
      met: false,
      detail:
        "L'entité déclare un impact majeur sur la sécurité, la sûreté ou la santé publiques. Un État membre peut, sur ce fondement, l'identifier comme entité essentielle ou importante sans condition de taille. Cette identification relève de l'autorité nationale et ne peut être présumée.",
    })
  }

  // Détermination de la catégorie
  let category: 'essentielle' | 'importante' | null = null
  let status: VerdictStatus = 'hors_champ'

  const essentialBySize = sizeTypes.some(
    (v) => SIZE_INDEPENDENT_TYPES.find((t) => t.value === v)?.essential,
  )
  const importantBySize = sizeTypes.length > 0 && !essentialBySize

  if (recIdentified || essentialBySize) {
    category = 'essentielle'
    status = 'applicable'
  } else if (annex === 'I' && large) {
    category = 'essentielle'
    status = 'applicable'
  } else if (annex !== null && medium) {
    category = 'importante'
    status = 'applicable'
  } else if (importantBySize) {
    category = 'importante'
    status = 'applicable'
  } else if (annex !== null && !medium && criticite !== 'limite') {
    status = 'probable'
  } else if (annex === null && criticite === 'majeur') {
    status = 'probable'
  }

  const caveats: string[] = []

  if (status === 'probable') {
    caveats.push(
      "L'assujettissement dépend ici d'une identification discrétionnaire par l'État membre. Se rapprocher de l'ANSSI, ou surveiller la publication de la liste nationale des entités essentielles et importantes.",
    )
  }
  if (status !== 'hors_champ') {
    caveats.push(
      `La directive n'est pas transposée en France au ${CORPUS_DATE_LONG}. Les obligations ne seront exigibles qu'à la publication de la loi résilience et de ses décrets, mais le ReCyF publié par l'ANSSI en fixe déjà le contenu attendu.`,
    )
  }
  if (status !== 'hors_champ' && isFinancial) {
    caveats.push(
      "L'entité étant une entité financière soumise à DORA, l'article 4 de NIS 2 écarte les dispositions de la directive relatives à la gestion des risques et à la notification des incidents, DORA constituant une lex specialis. Le rattachement à l'écosystème NIS 2 subsiste.",
    )
  }
  if (category === 'essentielle') {
    caveats.push(
      "La qualification d'entité essentielle emporte un régime de supervision a priori : inspections sur place, audits de sécurité à la charge de l'entité, et possibilité pour l'autorité d'interdire temporairement l'exercice de fonctions dirigeantes.",
    )
  }

  return {
    category,
    verdict: {
      regulation: 'NIS2',
      status,
      qualification:
        category === 'essentielle' ? 'Entité essentielle' : category === 'importante' ? 'Entité importante' : null,
      basis,
      caveats,
      exposure:
        status === 'hors_champ'
          ? null
          : exposure('NIS2', category === 'importante' ? 'NIS2-EI' : 'NIS2-EE', a),
    },
  }
}

// ---------------------------------------------------------------------------
// DORA — article 2
// ---------------------------------------------------------------------------

function qualifyDora(a: Answers): RegulationVerdict {
  const isFinancial = str(a, 'entite_financiere') === 'oui'
  const simplifie = str(a, 'dora_regime_simplifie')
  const providesIct = str(a, 'services_ict') === 'oui'
  const financialClients = str(a, 'clients_financiers')
  const typeFin = str(a, 'type_financier')

  const basis: LegalBasis[] = [
    {
      article: 'Article 2, paragraphe 1',
      label: "Appartenance à la liste limitative des entités financières",
      met: isFinancial,
      detail: isFinancial
        ? `L'entité relève du type « ${typeFin || 'non précisé'} », visé à l'article 2. Le règlement s'applique directement et intégralement.`
        : "L'entité ne figure pas parmi les vingt et un types d'entités financières énumérés. Le règlement ne lui est pas directement applicable.",
    },
  ]

  if (!isFinancial && providesIct) {
    basis.push({
      article: 'Articles 30 et 31',
      label: "Prestataire tiers de services TIC d'entités financières",
      met: financialClients === 'oui',
      detail:
        financialClients === 'oui'
          ? "L'entité fournit des services TIC à des entités financières. Elle n'est pas directement assujettie, mais ses clients doivent lui imposer par contrat les mentions de l'article 30, dont un droit d'audit sans restriction, la coopération aux tests et une stratégie de sortie."
          : financialClients === 'incertain'
            ? "La présence de clients financiers n'est pas établie. Elle doit être vérifiée : le cas échéant, les exigences contractuelles de l'article 30 s'imposeront à la relation."
            : "Aucun client financier déclaré : aucune répercussion contractuelle attendue.",
    })
  }

  if (isFinancial && simplifie === 'oui') {
    basis.push({
      article: 'Article 16, paragraphe 1',
      label: 'Cadre simplifié de gestion du risque lié aux TIC',
      met: true,
      detail:
        "Les articles 5 à 15 ne s'appliquent pas. L'entité reste tenue d'un cadre allégé : gestion documentée du risque TIC, surveillance continue, protection, détection, continuité, tests réguliers et gestion du risque lié aux tiers.",
    })
  }

  let status: VerdictStatus = 'hors_champ'
  let qualification: string | null = null

  if (isFinancial) {
    status = 'applicable'
    qualification = simplifie === 'oui' ? 'Entité financière — cadre simplifié' : 'Entité financière'
  } else if (providesIct && financialClients === 'oui') {
    status = 'indirect'
    qualification = 'Prestataire tiers de services TIC'
  } else if (providesIct && financialClients === 'incertain') {
    status = 'probable'
    qualification = 'Prestataire TIC — clientèle financière à confirmer'
  }

  const caveats: string[] = []
  if (isFinancial && simplifie === 'incertain') {
    caveats.push(
      "Le bénéfice du cadre simplifié doit être confirmé auprès de l'autorité compétente. Il ne se présume pas et dépend du statut exact de l'entité au regard des directives sectorielles.",
    )
  }
  if (status === 'indirect') {
    caveats.push(
      "L'entité n'est pas assujettie mais subit DORA par voie contractuelle. L'enjeu de négociation porte sur le droit d'audit sans restriction et les objectifs de performance quantitatifs, que les autorités contrôlent en priorité.",
    )
  }
  if (isFinancial && str(a, 'dora_tlpt') === 'incertain') {
    caveats.push(
      "L'identification pour les tests de pénétration fondés sur la menace relève de l'autorité compétente. En l'absence de notification, prévoir la capacité d'y répondre plutôt que de conclure à l'absence d'obligation.",
    )
  }
  if (status === 'applicable') {
    caveats.push(
      "DORA constitue une lex specialis par rapport à NIS 2 (considérant 16). Les dispositions de NIS 2 relatives à la gestion des risques et à la notification des incidents ne s'appliquent donc pas en parallèle.",
    )
  }

  return {
    regulation: 'DORA',
    status,
    qualification,
    basis,
    caveats,
    exposure:
      status === 'hors_champ'
        ? null
        : exposure('DORA', status === 'indirect' ? 'DORA-CTPP' : 'DORA-NAT', a),
  }
}

// ---------------------------------------------------------------------------
// CRA — articles 2, 3 et 71
// ---------------------------------------------------------------------------

const CRA_CATEGORY_LABEL: Record<string, string> = {
  defaut: 'produit par défaut',
  classe_i: 'produit important de classe I',
  classe_ii: 'produit important de classe II',
  critique: 'produit critique',
}

const CRA_PROCEDURE: Record<string, string> = {
  defaut: "L'évaluation de la conformité peut être conduite en interne (module A).",
  classe_i:
    "L'autoévaluation n'est possible qu'en appliquant intégralement une norme harmonisée ou un schéma de certification européen ; à défaut, un organisme notifié doit intervenir.",
  classe_ii: "L'évaluation par un organisme notifié est obligatoire (examen UE de type ou assurance qualité complète).",
  critique: "Une certification européenne de cybersécurité est requise, au niveau d'assurance au moins « substantiel ».",
}

function qualifyCra(a: Answers): RegulationVerdict {
  const roles = list(a, 'cra_roles').filter((r) => r !== 'aucun')
  const exclu = str(a, 'cra_exclu')
  const categorie = str(a, 'cra_categorie')
  const fabricant = roles.includes('fabricant')

  const basis: LegalBasis[] = [
    {
      article: 'Article 2, paragraphe 1',
      label: "Mise sur le marché de produits comportant des éléments numériques",
      met: roles.length > 0,
      detail:
        roles.length > 0
          ? `L'entité intervient en tant que ${roles.join(', ')}. Le règlement s'applique aux produits qu'elle met à disposition sur le marché de l'Union.`
          : "Aucun produit comportant des éléments numériques n'est mis sur le marché : le règlement ne s'applique pas. Les services purement en nuage relèvent de NIS 2.",
    },
  ]

  if (roles.length > 0) {
    basis.push({
      article: 'Article 2, paragraphes 2 à 7',
      label: 'Absence de réglementation sectorielle excluante',
      met: exclu !== 'oui',
      detail:
        exclu === 'oui'
          ? "Les produits relèvent tous d'une réglementation sectorielle exclue — dispositifs médicaux, véhicules, aviation, équipements marins ou défense. Le CRA ne s'applique pas."
          : exclu === 'partiellement'
            ? "Une partie seulement des produits relève d'une réglementation exclue : le CRA s'applique aux autres, produit par produit."
            : "Aucune exclusion sectorielle déclarée.",
    })
  }

  if (fabricant && categorie) {
    basis.push({
      article: 'Articles 7, 8 et 32 — Annexes III et IV',
      label: 'Catégorie du produit le plus exposé',
      met: true,
      detail: `La catégorie la plus élevée déclarée est celle de ${CRA_CATEGORY_LABEL[categorie] ?? categorie}. ${CRA_PROCEDURE[categorie] ?? ''}`,
    })
  }

  let status: VerdictStatus = 'hors_champ'
  if (roles.length > 0 && exclu !== 'oui') status = 'applicable'

  const qualification =
    status === 'hors_champ'
      ? null
      : fabricant
        ? `Fabricant — ${CRA_CATEGORY_LABEL[categorie] ?? 'catégorie à déterminer'}`
        : roles.includes('importateur')
          ? 'Importateur'
          : 'Distributeur'

  const caveats: string[] = []
  if (status !== 'hors_champ') {
    caveats.push(
      "Application par paliers : le signalement des vulnérabilités exploitées et des incidents graves est exigible depuis le 11 septembre 2026, y compris pour les produits déjà sur le marché ; les exigences essentielles, le marquage CE et la documentation technique le seront au 11 décembre 2027.",
    )
  }
  if (status !== 'hors_champ' && !fabricant) {
    caveats.push(
      "Un importateur ou un distributeur qui met un produit sur le marché sous son propre nom, ou qui le modifie substantiellement, devient fabricant au sens de l'article 21 et en supporte toutes les obligations.",
    )
  }
  if (fabricant && (str(a, 'effectif') === 'micro' || str(a, 'effectif') === 'petite')) {
    caveats.push(
      "En tant que micro ou petite entreprise, l'entité n'est pas passible d'amende pour le seul dépassement du délai d'alerte précoce de 24 heures (art. 64 § 10) ; les autres obligations de signalement restent sanctionnables.",
    )
  }
  if (status !== 'hors_champ') {
    caveats.push(
      "En France, l'ANSSI est l'autorité notifiante et la surveillance du marché est pressentie pour l'ANFR ; la désignation formelle reste à confirmer.",
    )
  }

  return {
    regulation: 'CRA',
    status,
    qualification,
    basis,
    caveats,
    exposure: status === 'hors_champ' ? null : exposure('CRA', fabricant ? 'CRA-T1' : 'CRA-T2', a),
  }
}

// ---------------------------------------------------------------------------
// Qualification d'ensemble
// ---------------------------------------------------------------------------

export function qualify(answers: Answers): QualificationResult {
  const critical = str(answers, 'entite_critique') === 'oui'
  const nis2 = qualifyNis2(answers, critical)

  return {
    verdicts: {
      RGPD: qualifyRgpd(answers),
      NIS2: nis2.verdict,
      DORA: qualifyDora(answers),
      CRA: qualifyCra(answers),
    },
    nis2Category: nis2.category,
    derived: {
      nis2Category: nis2.category ?? 'aucune',
      mediumThreshold: meetsMediumThreshold(answers),
      largeThreshold: exceedsMediumThreshold(answers),
      turnover: turnoverEstimate(answers),
      isFinancial: str(answers, 'entite_financiere') === 'oui',
      doraPrevails: str(answers, 'entite_financiere') === 'oui' && nis2.verdict.status !== 'hors_champ',
    },
    completedAt: new Date().toISOString(),
  }
}

/** Règlements retenus comme applicables, par ordre de priorité d'examen. */
export function applicableRegulations(result: QualificationResult | null): RegulationId[] {
  if (!result) return []
  return (['RGPD', 'NIS2', 'DORA', 'CRA'] as RegulationId[]).filter((id) => {
    const s = result.verdicts[id].status
    return s === 'applicable' || s === 'probable' || s === 'indirect'
  })
}

export const STATUS_LABEL: Record<VerdictStatus, string> = {
  applicable: 'Applicable',
  probable: 'Probable',
  indirect: 'Indirect',
  hors_champ: 'Hors champ',
}
