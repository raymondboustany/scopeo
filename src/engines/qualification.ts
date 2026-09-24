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
import { LOCALE, tr } from '@/i18n'

/**
 * Moteur de qualification.
 *
 * Le principe directeur est qu'aucun verdict ne doit être rendu sans son
 * fondement. Chaque conclusion est accompagnée des articles examinés, de
 * l'état de chaque condition, et des réserves qui subsistent. Une plateforme
 * de cadrage qui affirme sans démontrer n'est pas opposable, et donc pas utile.
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
  lt2: tr('moins de 2 M€', 'under €2M'),
  '2a10': tr('de 2 à 10 M€', '€2M to €10M'),
  '10a50': tr('de 10 à 50 M€', '€10M to €50M'),
  '50a250': tr('de 50 à 250 M€', '€50M to €250M'),
  '250a1000': tr('de 250 M€ à 1 Md€', '€250M to €1bn'),
  gt1000: tr('plus de 1 Md€', 'over €1bn'),
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
  lowestForSme = false,
): RegulationVerdict['exposure'] {
  const tier = REGULATIONS[regulation].sanctions.find((s) => s.id === tierId)
  if (!tier) return null

  const ca = turnoverEstimate(a)
  const caLabel = TURNOVER_LABEL[str(a, 'chiffre_affaires')] ?? tr('non renseigné', 'not provided')

  if (tier.turnoverPct && tier.capEur) {
    const pctAmount = Math.round(ca * (tier.turnoverPct / 100))
    // L'AI Act retient, pour les PME, le plus faible des deux montants (art. 99 § 6).
    const rule = lowestForSme ? 'le_plus_bas' : (tier.capRule ?? 'le_plus_eleve')
    const max = rule === 'le_plus_bas' ? Math.min(pctAmount, tier.capEur) : Math.max(pctAmount, tier.capEur)
    const pct = tier.turnoverPct.toLocaleString(LOCALE)
    const caPhrase = /^de /i.test(caLabel) ? caLabel.charAt(0).toLowerCase() + caLabel.slice(1) : tr(`de ${caLabel}`, caLabel)
    return {
      tier: tier.label,
      maxEur: max,
      formula: tr(
        `${pct} % d'un chiffre d'affaires ${caPhrase} représente environ ${fmtEur(pctAmount)} ; le plafond forfaitaire est de ${fmtEur(tier.capEur)}. Le montant ${rule === 'le_plus_bas' ? 'le plus bas' : 'le plus élevé'} est retenu.`,
        `${pct}% of a turnover of ${caPhrase} is about ${fmtEur(pctAmount)}; the fixed cap is ${fmtEur(tier.capEur)}. The ${rule === 'le_plus_bas' ? 'lower' : 'higher'} amount applies.`,
      ),
    }
  }

  if (tier.turnoverPct) {
    return {
      tier: tier.label,
      maxEur: null,
      formula: tr(
        `${tier.turnoverPct.toLocaleString(LOCALE)} % du chiffre d'affaires quotidien moyen mondial, par jour de manquement, pendant six mois au maximum.`,
        `${tier.turnoverPct.toLocaleString(LOCALE)}% of average daily worldwide turnover, per day of breach, for up to six months.`,
      ),
    }
  }

  return { tier: tier.label, maxEur: null, formula: tier.note ?? tier.basis }
}

export function fmtEur(n: number): string {
  const en = LOCALE === 'en-GB'
  if (n >= 1_000_000) {
    const v = (n / 1_000_000).toLocaleString(LOCALE, { maximumFractionDigits: 1 })
    return en ? `€${v}M` : `${v} M€`
  }
  if (n >= 1_000) {
    const v = (n / 1_000).toLocaleString(LOCALE, { maximumFractionDigits: 0 })
    return en ? `€${v}k` : `${v} k€`
  }
  return en ? `€${n.toLocaleString(LOCALE)}` : `${n.toLocaleString(LOCALE)} €`
}

// ---------------------------------------------------------------------------
// RGPD : articles 2 et 3
// ---------------------------------------------------------------------------

function qualifyRgpd(a: Answers): RegulationVerdict {
  const traite = str(a, 'donnees_perso')
  const etabliUe = str(a, 'etablissement_ue') === 'oui'
  const cible = str(a, 'cible_ue') === 'oui'

  const basis: LegalBasis[] = [
    {
      article: tr('Article 2', 'Article 2'),
      label: tr('Traitement de données à caractère personnel', 'Processing of personal data'),
      met: traite === 'oui',
      detail:
        traite === 'oui'
          ? tr(
              "L'entité déclare traiter des données à caractère personnel : le règlement s'applique matériellement.",
              'The entity reports processing personal data: the regulation applies materially.',
            )
          : traite === 'incertain'
            ? tr(
                "Le traitement est incertain. En pratique, toute organisation employant du personnel traite des données personnelles ; la réponse mérite d'être confirmée.",
                'Processing is uncertain. In practice, any organisation with staff processes personal data; the answer should be confirmed.',
              )
            : tr(
                'Aucun traitement déclaré. Cette situation est exceptionnelle et doit être vérifiée, notamment au regard des données de salariés et des journaux techniques.',
                'No processing reported. This is exceptional and should be checked, in particular for employee data and technical logs.',
              ),
    },
    {
      article: tr('Article 3, paragraphe 1', 'Article 3(1)'),
      label: tr("Établissement dans l'Union", 'Establishment in the Union'),
      met: etabliUe,
      detail: etabliUe
        ? tr(
            "L'entité est établie dans l'Union : le critère territorial est rempli, quel que soit le lieu du traitement.",
            'The entity is established in the Union: the territorial criterion is met, wherever processing takes place.',
          )
        : tr(
            "L'entité n'est pas établie dans l'Union ; le critère de l'établissement ne s'applique pas.",
            'The entity is not established in the Union; the establishment criterion does not apply.',
          ),
    },
  ]

  if (!etabliUe) {
    basis.push({
      article: tr('Article 3, paragraphe 2', 'Article 3(2)'),
      label: tr("Ciblage de personnes situées dans l'Union", 'Targeting of individuals in the Union'),
      met: cible,
      detail: cible
        ? tr(
            "L'entité offre des biens ou services à des personnes dans l'Union ou suit leur comportement : le règlement s'applique, et un représentant doit être désigné au titre de l'article 27.",
            'The entity offers goods or services to individuals in the Union or monitors their behaviour: the regulation applies, and a representative must be designated under Article 27.',
          )
        : tr('Aucun ciblage déclaré. Le règlement ne s\'applique pas sur ce fondement.', 'No targeting reported. The regulation does not apply on this basis.'),
    })
  }

  const territorial = etabliUe || cible
  let status: VerdictStatus = 'hors_champ'
  if (traite === 'oui' && territorial) status = 'applicable'
  else if (traite === 'incertain' && territorial) status = 'probable'

  const caveats: string[] = []
  if (traite === 'incertain') {
    caveats.push(
      tr(
        'Confirmer la présence de traitements de données personnelles, y compris les données de salariés et les journaux techniques contenant des identifiants ou des adresses réseau.',
        'Confirm whether personal data is processed, including employee data and technical logs containing identifiers or network addresses.',
      ),
    )
  }
  if (status !== 'hors_champ' && str(a, 'suivi_grande_echelle') === 'incertain') {
    caveats.push(
      tr(
        "La notion de « grande échelle » s'apprécie au regard du nombre de personnes concernées, du volume de données, de la durée et de l'étendue géographique. Un avis juridique est recommandé avant de conclure à l'absence d'obligation de désigner un délégué.",
        '"Large scale" is assessed against the number of data subjects, data volume, duration and geographical extent. Legal advice is recommended before concluding that no DPO must be designated.',
      ),
    )
  }
  if (status !== 'hors_champ') {
    caveats.push(
      tr(
        "Le volet « données » du paquet Digital Omnibus, en négociation depuis novembre 2025, pourrait modifier la définition de la donnée personnelle et le régime du consentement. Aucun texte n'est adopté à ce jour.",
        'The data strand of the Digital Omnibus package, under negotiation since November 2025, could change the definition of personal data and the consent regime. No text has been adopted to date.',
      ),
    )
  }

  const dpoRequired = str(a, 'autorite_publique') === 'oui' || str(a, 'suivi_grande_echelle') === 'oui'

  return {
    regulation: 'RGPD',
    status,
    qualification:
      status === 'hors_champ'
        ? null
        : dpoRequired
          ? tr("Responsable soumis à désignation d'un délégué", 'Controller required to designate a DPO')
          : str(a, 'role_rgpd') === 'sous_traitant'
            ? tr('Sous-traitant', 'Processor')
            : str(a, 'role_rgpd') === 'les_deux'
              ? tr('Responsable de traitement et sous-traitant', 'Controller and processor')
              : tr('Responsable de traitement', 'Controller'),
    basis,
    caveats,
    exposure: status === 'hors_champ' ? null : exposure('RGPD', 'RGPD-T2', a),
  }
}

// ---------------------------------------------------------------------------
// NIS2 : articles 2 et 3
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
      article: tr('Annexes I et II', 'Annexes I and II'),
      label: tr('Appartenance à un secteur couvert', 'Sector covered by the directive'),
      met: annex !== null,
      detail: annex
        ? tr(
            `Le secteur « ${sector?.label} » relève de l'annexe ${annex} (${annex === 'I' ? 'secteurs hautement critiques' : 'autres secteurs critiques'}).`,
            `The "${sector?.label}" sector falls under Annex ${annex} (${annex === 'I' ? 'sectors of high criticality' : 'other critical sectors'}).`,
          )
        : tr(
            `Le secteur « ${sector?.label ?? 'non renseigné'} » ne figure ni à l'annexe I ni à l'annexe II.`,
            `The "${sector?.label ?? 'not provided'}" sector is listed in neither Annex I nor Annex II.`,
          ),
    },
    {
      article: tr('Article 2, paragraphe 1', 'Article 2(1)'),
      label: tr('Franchissement du seuil de moyenne entreprise', 'Medium-sized enterprise threshold'),
      met: medium,
      detail: medium
        ? large
          ? tr(
              "L'entité dépasse les plafonds de la moyenne entreprise : elle est une grande entreprise au sens de la recommandation 2003/361/CE.",
              'The entity exceeds the medium-sized ceilings: it is a large enterprise within the meaning of Recommendation 2003/361/EC.',
            )
          : tr(
              "L'entité atteint le seuil de moyenne entreprise : 50 personnes, ou chiffre d'affaires et bilan supérieurs à 10 M€.",
              'The entity reaches the medium-sized threshold: 50 staff, or turnover and balance sheet above €10M.',
            )
        : tr(
            "L'entité n'atteint pas le seuil de moyenne entreprise. Elle n'est soumise à la directive que par un autre fondement.",
            'The entity does not reach the medium-sized threshold. It is only subject to the directive on another basis.',
          ),
    },
  ]

  // Entités visées indépendamment de la taille
  if (sizeTypes.length > 0) {
    const essentialTypes = sizeTypes.filter((v) => SIZE_INDEPENDENT_TYPES.find((t) => t.value === v)?.essential)
    const labels = sizeTypes.map((v) => SIZE_INDEPENDENT_TYPES.find((t) => t.value === v)?.label ?? v).join(', ')
    basis.push({
      article: tr('Article 2, paragraphe 2, et article 3, paragraphe 1', 'Article 2(2) and Article 3(1)'),
      label: tr('Entité visée quelle que soit sa taille', 'Entity covered regardless of size'),
      met: true,
      detail:
        essentialTypes.length > 0
          ? tr(
              `Types déclarés : ${labels}. Au moins l'un de ces types emporte la qualification d'entité essentielle sans condition de taille.`,
              `Reported types: ${labels}. At least one of them qualifies the entity as essential regardless of size.`,
            )
          : tr(
              `Types déclarés : ${labels}. Ces types relèvent de la directive sans condition de taille, avec la qualification d'entité importante.`,
              `Reported types: ${labels}. These types fall under the directive regardless of size, as important entities.`,
            ),
    })
  }

  // Désignation comme entité critique
  if (recIdentified) {
    basis.push({
      article: tr('Article 3, paragraphe 1, point f)', 'Article 3(1)(f)'),
      label: tr("Entité désignée critique ou d'importance vitale", 'Entity designated as critical'),
      met: true,
      detail: tr(
        "L'identification comme entité critique emporte de plein droit la qualification d'entité essentielle, sans condition de taille ni de secteur.",
        'Identification as a critical entity automatically makes it an essential entity, regardless of size or sector.',
      ),
    })
  }

  // Identification discrétionnaire par l'État membre
  if (criticite === 'majeur') {
    basis.push({
      article: tr('Article 2, paragraphe 2, points b) à e)', 'Article 2(2)(b) to (e)'),
      label: tr("Identification possible par l'État membre", 'Possible identification by the Member State'),
      met: false,
      detail: tr(
        "L'entité déclare un impact majeur sur la sécurité, la sûreté ou la santé publiques. Un État membre peut, sur ce fondement, l'identifier comme entité essentielle ou importante sans condition de taille. Cette identification relève de l'autorité nationale et ne peut être présumée.",
        'The entity reports a major impact on public safety, security or health. A Member State may on this basis identify it as essential or important regardless of size. This is for the national authority to decide and cannot be presumed.',
      ),
    })
  }

  // Détermination de la catégorie
  let category: 'essentielle' | 'importante' | null = null
  let status: VerdictStatus = 'hors_champ'

  const essentialBySize = sizeTypes.some((v) => SIZE_INDEPENDENT_TYPES.find((t) => t.value === v)?.essential)
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
      tr(
        "L'assujettissement dépend ici d'une identification discrétionnaire par l'État membre. Se rapprocher de l'ANSSI, ou surveiller la publication de la liste nationale des entités essentielles et importantes.",
        'Coverage here depends on discretionary identification by the Member State. Contact ANSSI, or watch for the national list of essential and important entities.',
      ),
    )
  }
  if (status !== 'hors_champ') {
    caveats.push(
      tr(
        `La directive n'est pas transposée en France au ${CORPUS_DATE_LONG}. Les obligations ne seront exigibles qu'à la publication de la loi résilience et de ses décrets, mais le ReCyF publié par l'ANSSI en fixe déjà le contenu attendu.`,
        `The directive has not been transposed in France as of ${CORPUS_DATE_LONG}. Obligations will only be enforceable once the resilience act and its decrees are published, but the ReCyF published by ANSSI already sets out what is expected.`,
      ),
    )
  }
  if (status !== 'hors_champ' && isFinancial) {
    caveats.push(
      tr(
        "L'entité étant une entité financière soumise à DORA, l'article 4 de NIS2 écarte les dispositions de la directive relatives à la gestion des risques et à la notification des incidents, DORA constituant une lex specialis. Le rattachement à l'écosystème NIS2 subsiste.",
        'As a financial entity subject to DORA, Article 4 of NIS2 sets aside the directive\'s risk-management and incident-notification provisions, DORA being lex specialis. The entity remains part of the NIS2 ecosystem.',
      ),
    )
  }
  if (category === 'essentielle') {
    caveats.push(
      tr(
        "La qualification d'entité essentielle emporte un régime de supervision a priori : inspections sur place, audits de sécurité à la charge de l'entité, et possibilité pour l'autorité d'interdire temporairement l'exercice de fonctions dirigeantes.",
        'Essential entities are subject to ex ante supervision: on-site inspections, security audits at the entity\'s expense, and the authority may temporarily ban individuals from management functions.',
      ),
    )
  }

  return {
    category,
    verdict: {
      regulation: 'NIS2',
      status,
      qualification:
        category === 'essentielle'
          ? tr('Entité essentielle', 'Essential entity')
          : category === 'importante'
            ? tr('Entité importante', 'Important entity')
            : null,
      basis,
      caveats,
      exposure: status === 'hors_champ' ? null : exposure('NIS2', category === 'importante' ? 'NIS2-EI' : 'NIS2-EE', a),
    },
  }
}

// ---------------------------------------------------------------------------
// DORA : article 2
// ---------------------------------------------------------------------------

function qualifyDora(a: Answers): RegulationVerdict {
  const isFinancial = str(a, 'entite_financiere') === 'oui'
  const simplifie = str(a, 'dora_regime_simplifie')
  const providesIct = str(a, 'services_ict') === 'oui'
  const financialClients = str(a, 'clients_financiers')
  const typeFin = str(a, 'type_financier')

  const basis: LegalBasis[] = [
    {
      article: tr('Article 2, paragraphe 1', 'Article 2(1)'),
      label: tr('Appartenance à la liste limitative des entités financières', 'Listed type of financial entity'),
      met: isFinancial,
      detail: isFinancial
        ? tr(
            `L'entité relève du type « ${typeFin || 'non précisé'} », visé à l'article 2. Le règlement s'applique directement et intégralement.`,
            `The entity is of type "${typeFin || 'unspecified'}", listed in Article 2. The regulation applies directly and in full.`,
          )
        : tr(
            "L'entité ne figure pas parmi les vingt et un types d'entités financières énumérés. Le règlement ne lui est pas directement applicable.",
            'The entity is not one of the twenty-one listed types of financial entity. The regulation does not apply to it directly.',
          ),
    },
  ]

  if (!isFinancial && providesIct) {
    basis.push({
      article: tr('Articles 30 et 31', 'Articles 30 and 31'),
      label: tr("Prestataire tiers de services TIC d'entités financières", 'ICT third-party service provider to financial entities'),
      met: financialClients === 'oui',
      detail:
        financialClients === 'oui'
          ? tr(
              "L'entité fournit des services TIC à des entités financières. Elle n'est pas directement assujettie, mais ses clients doivent lui imposer par contrat les mentions de l'article 30, dont un droit d'audit sans restriction, la coopération aux tests et une stratégie de sortie.",
              'The entity provides ICT services to financial entities. It is not directly subject, but its clients must impose the Article 30 clauses by contract, including unrestricted audit rights, cooperation in testing and an exit strategy.',
            )
          : financialClients === 'incertain'
            ? tr(
                "La présence de clients financiers n'est pas établie. Elle doit être vérifiée : le cas échéant, les exigences contractuelles de l'article 30 s'imposeront à la relation.",
                'Whether there are financial clients is not established. It must be checked: if so, the Article 30 contractual requirements will apply to the relationship.',
              )
            : tr('Aucun client financier déclaré : aucune répercussion contractuelle attendue.', 'No financial clients reported: no contractual knock-on effect expected.'),
    })
  }

  if (isFinancial && simplifie === 'oui') {
    basis.push({
      article: tr('Article 16, paragraphe 1', 'Article 16(1)'),
      label: tr('Cadre simplifié de gestion du risque lié aux TIC', 'Simplified ICT risk management framework'),
      met: true,
      detail: tr(
        "Les articles 5 à 15 ne s'appliquent pas. L'entité reste tenue d'un cadre allégé : gestion documentée du risque TIC, surveillance continue, protection, détection, continuité, tests réguliers et gestion du risque lié aux tiers.",
        'Articles 5 to 15 do not apply. The entity must still maintain a lighter framework: documented ICT risk management, continuous monitoring, protection, detection, continuity, regular testing and third-party risk management.',
      ),
    })
  }

  let status: VerdictStatus = 'hors_champ'
  let qualification: string | null = null

  if (isFinancial) {
    status = 'applicable'
    qualification =
      simplifie === 'oui'
        ? tr('Entité financière, cadre simplifié', 'Financial entity, simplified framework')
        : tr('Entité financière', 'Financial entity')
  } else if (providesIct && financialClients === 'oui') {
    status = 'indirect'
    qualification = tr('Prestataire tiers de services TIC', 'ICT third-party service provider')
  } else if (providesIct && financialClients === 'incertain') {
    status = 'probable'
    qualification = tr('Prestataire TIC, clientèle financière à confirmer', 'ICT provider, financial clients to be confirmed')
  }

  const caveats: string[] = []
  if (isFinancial && simplifie === 'incertain') {
    caveats.push(
      tr(
        "Le bénéfice du cadre simplifié doit être confirmé auprès de l'autorité compétente. Il ne se présume pas et dépend du statut exact de l'entité au regard des directives sectorielles.",
        'Eligibility for the simplified framework must be confirmed with the competent authority. It cannot be presumed and depends on the entity\'s exact status under sectoral directives.',
      ),
    )
  }
  if (status === 'indirect') {
    caveats.push(
      tr(
        "L'entité n'est pas assujettie mais subit DORA par voie contractuelle. L'enjeu de négociation porte sur le droit d'audit sans restriction et les objectifs de performance quantitatifs, que les autorités contrôlent en priorité.",
        'The entity is not subject but feels DORA through contracts. Negotiation focuses on unrestricted audit rights and quantitative performance targets, which supervisors check first.',
      ),
    )
  }
  if (isFinancial && str(a, 'dora_tlpt') === 'incertain') {
    caveats.push(
      tr(
        "L'identification pour les tests de pénétration fondés sur la menace relève de l'autorité compétente. En l'absence de notification, prévoir la capacité d'y répondre plutôt que de conclure à l'absence d'obligation.",
        'Identification for threat-led penetration testing is for the competent authority. Without notification, plan the capacity to respond rather than conclude there is no obligation.',
      ),
    )
  }
  if (status === 'applicable') {
    caveats.push(
      tr(
        "DORA constitue une lex specialis par rapport à NIS2 (considérant 16). Les dispositions de NIS2 relatives à la gestion des risques et à la notification des incidents ne s'appliquent donc pas en parallèle.",
        'DORA is lex specialis in relation to NIS2 (recital 16). The NIS2 risk-management and incident-notification provisions therefore do not apply in parallel.',
      ),
    )
  }

  return {
    regulation: 'DORA',
    status,
    qualification,
    basis,
    caveats,
    exposure: status === 'hors_champ' ? null : exposure('DORA', status === 'indirect' ? 'DORA-CTPP' : 'DORA-NAT', a),
  }
}

// ---------------------------------------------------------------------------
// CRA : articles 2, 3 et 71
// ---------------------------------------------------------------------------

const CRA_CATEGORY_LABEL: Record<string, string> = {
  defaut: tr('produit par défaut', 'default product'),
  classe_i: tr('produit important de classe I', 'important product, class I'),
  classe_ii: tr('produit important de classe II', 'important product, class II'),
  critique: tr('produit critique', 'critical product'),
}

const CRA_PROCEDURE: Record<string, string> = {
  defaut: tr("L'évaluation de la conformité peut être conduite en interne (module A).", 'Conformity assessment can be carried out internally (module A).'),
  classe_i: tr(
    "L'autoévaluation n'est possible qu'en appliquant intégralement une norme harmonisée ou un schéma de certification européen ; à défaut, un organisme notifié doit intervenir.",
    'Self-assessment is only possible by fully applying a harmonised standard or a European certification scheme; otherwise a notified body must be involved.',
  ),
  classe_ii: tr(
    "L'évaluation par un organisme notifié est obligatoire (examen UE de type ou assurance qualité complète).",
    'Assessment by a notified body is mandatory (EU type examination or full quality assurance).',
  ),
  critique: tr(
    "Une certification européenne de cybersécurité est requise, au niveau d'assurance au moins « substantiel ».",
    'A European cybersecurity certificate is required, at assurance level "substantial" or higher.',
  ),
}

const CRA_ROLE_LABEL: Record<string, string> = {
  fabricant: tr('fabricant', 'manufacturer'),
  importateur: tr('importateur', 'importer'),
  distributeur: tr('distributeur', 'distributor'),
}

function qualifyCra(a: Answers): RegulationVerdict {
  const roles = list(a, 'cra_roles').filter((r) => r !== 'aucun')
  const exclu = str(a, 'cra_exclu')
  const categorie = str(a, 'cra_categorie')
  const fabricant = roles.includes('fabricant')

  const basis: LegalBasis[] = [
    {
      article: tr('Article 2, paragraphe 1', 'Article 2(1)'),
      label: tr('Mise sur le marché de produits comportant des éléments numériques', 'Placing products with digital elements on the market'),
      met: roles.length > 0,
      detail:
        roles.length > 0
          ? tr(
              `L'entité intervient en tant que ${roles.map((r) => CRA_ROLE_LABEL[r] ?? r).join(', ')}. Le règlement s'applique aux produits qu'elle met à disposition sur le marché de l'Union.`,
              `The entity acts as ${roles.map((r) => CRA_ROLE_LABEL[r] ?? r).join(', ')}. The regulation applies to the products it makes available on the Union market.`,
            )
          : tr(
              "Aucun produit comportant des éléments numériques n'est mis sur le marché : le règlement ne s'applique pas. Les services purement en nuage relèvent de NIS2.",
              'No product with digital elements is placed on the market: the regulation does not apply. Pure cloud services fall under NIS2.',
            ),
    },
  ]

  if (roles.length > 0) {
    basis.push({
      article: tr('Article 2, paragraphes 2 à 7', 'Article 2(2) to (7)'),
      label: tr('Absence de réglementation sectorielle excluante', 'No excluding sectoral legislation'),
      met: exclu !== 'oui',
      detail:
        exclu === 'oui'
          ? tr(
              "Les produits relèvent tous d'une réglementation sectorielle exclue (dispositifs médicaux, véhicules, aviation, équipements marins ou défense). Le CRA ne s'applique pas.",
              'All products fall under excluded sectoral legislation (medical devices, vehicles, aviation, marine equipment or defence). The CRA does not apply.',
            )
          : exclu === 'partiellement'
            ? tr(
                "Une partie seulement des produits relève d'une réglementation exclue : le CRA s'applique aux autres, produit par produit.",
                'Only some products fall under excluded legislation: the CRA applies to the others, product by product.',
              )
            : tr('Aucune exclusion sectorielle déclarée.', 'No sectoral exclusion reported.'),
    })
  }

  if (fabricant && categorie) {
    basis.push({
      article: tr('Articles 7, 8 et 32, annexes III et IV', 'Articles 7, 8 and 32, Annexes III and IV'),
      label: tr('Catégorie du produit le plus exposé', 'Category of the most exposed product'),
      met: true,
      detail: tr(
        `La catégorie la plus élevée déclarée est celle de ${CRA_CATEGORY_LABEL[categorie] ?? categorie}. ${CRA_PROCEDURE[categorie] ?? ''}`,
        `The highest reported category is ${CRA_CATEGORY_LABEL[categorie] ?? categorie}. ${CRA_PROCEDURE[categorie] ?? ''}`,
      ),
    })
  }

  let status: VerdictStatus = 'hors_champ'
  if (roles.length > 0 && exclu !== 'oui') status = 'applicable'

  const qualification =
    status === 'hors_champ'
      ? null
      : fabricant
        ? tr(
            `Fabricant, ${CRA_CATEGORY_LABEL[categorie] ?? 'catégorie à déterminer'}`,
            `Manufacturer, ${CRA_CATEGORY_LABEL[categorie] ?? 'category to be determined'}`,
          )
        : roles.includes('importateur')
          ? tr('Importateur', 'Importer')
          : tr('Distributeur', 'Distributor')

  const caveats: string[] = []
  if (status !== 'hors_champ') {
    caveats.push(
      tr(
        'Application par paliers : le signalement des vulnérabilités exploitées et des incidents graves est exigible depuis le 11 septembre 2026, y compris pour les produits déjà sur le marché ; les exigences essentielles, le marquage CE et la documentation technique le seront au 11 décembre 2027.',
        'Phased application: reporting of exploited vulnerabilities and severe incidents has applied since 11 September 2026, including for products already on the market; essential requirements, CE marking and technical documentation apply from 11 December 2027.',
      ),
    )
  }
  if (status !== 'hors_champ' && !fabricant) {
    caveats.push(
      tr(
        "Un importateur ou un distributeur qui met un produit sur le marché sous son propre nom, ou qui le modifie substantiellement, devient fabricant au sens de l'article 21 et en supporte toutes les obligations.",
        'An importer or distributor that places a product on the market under its own name, or substantially modifies it, becomes the manufacturer under Article 21 and bears all its obligations.',
      ),
    )
  }
  if (fabricant && (str(a, 'effectif') === 'micro' || str(a, 'effectif') === 'petite')) {
    caveats.push(
      tr(
        "En tant que micro ou petite entreprise, l'entité n'est pas passible d'amende pour le seul dépassement du délai d'alerte précoce de 24 heures (art. 64 § 10) ; les autres obligations de signalement restent sanctionnables.",
        'As a micro or small enterprise, the entity cannot be fined solely for missing the 24-hour early-warning deadline (Art. 64(10)); other reporting obligations remain enforceable.',
      ),
    )
  }
  if (status !== 'hors_champ') {
    caveats.push(
      tr(
        "En France, l'ANSSI est l'autorité notifiante et la surveillance du marché est pressentie pour l'ANFR ; la désignation formelle reste à confirmer.",
        'In France, ANSSI is the notifying authority and market surveillance is expected to go to ANFR; formal designation is still pending.',
      ),
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
// AI Act : articles 2, 5, 6, 50 et 51
// ---------------------------------------------------------------------------

const AI_ROLE_LABEL: Record<string, string> = {
  fournisseur: tr('fournisseur', 'provider'),
  deployeur: tr('déployeur', 'deployer'),
  importateur: tr('importateur ou distributeur', 'importer or distributor'),
}

/** Domaines de l'annexe III déclarés, hors composants de sécurité de l'annexe I. */
function aiAnnexIII(a: Answers): string[] {
  return list(a, 'ia_haut_risque').filter((v) => v !== 'aucun' && v !== 'produit')
}

/** Faits dérivés de la section IA, réutilisés par les conditions d'applicabilité. */
export function aiFacts(a: Answers) {
  const roles = list(a, 'ia_roles').filter((r) => r !== 'aucun')
  const annexIII = aiAnnexIII(a)
  const annexI = list(a, 'ia_haut_risque').includes('produit')
  const derogation = str(a, 'ia_derogation') === 'oui'
  const highRisk = annexI || (annexIII.length > 0 && !derogation)
  const transparency = list(a, 'ia_transparence').filter((v) => v !== 'aucun')
  const gpai = str(a, 'ia_gpai')
  const deployer = roles.includes('deployeur')
  // Analyse d'impact sur les droits fondamentaux : organismes publics, services
  // publics, et déployeurs d'un système de notation de crédit ou d'assurance (art. 27).
  const fria =
    deployer &&
    highRisk &&
    (str(a, 'autorite_publique') === 'oui' || list(a, 'ia_haut_risque').includes('services_essentiels'))
  return {
    roles,
    provider: roles.includes('fournisseur'),
    deployer,
    importer: roles.includes('importateur'),
    annexIII,
    annexI,
    highRisk,
    derogation,
    transparency,
    gpai: gpai === 'oui' || gpai === 'systemique',
    gpaiSystemic: gpai === 'systemique',
    prohibited: str(a, 'ia_pratiques'),
    fria,
  }
}

function qualifyAiAct(a: Answers): RegulationVerdict {
  const f = aiFacts(a)
  const isSme = ['micro', 'petite', 'moyenne'].includes(str(a, 'effectif'))

  const basis: LegalBasis[] = [
    {
      article: tr('Article 2, paragraphe 1', 'Article 2(1)'),
      label: tr("Fourniture ou utilisation de systèmes d'IA", 'Providing or using AI systems'),
      met: f.roles.length > 0,
      detail:
        f.roles.length > 0
          ? tr(
              `L'entité intervient en tant que ${f.roles.map((r) => AI_ROLE_LABEL[r] ?? r).join(', ')}. L'obligation de maîtrise de l'IA (art. 4) s'applique dès l'usage professionnel d'un système d'IA.`,
              `The entity acts as ${f.roles.map((r) => AI_ROLE_LABEL[r] ?? r).join(', ')}. The AI literacy obligation (Art. 4) applies as soon as an AI system is used professionally.`,
            )
          : tr(
              "Aucun système d'IA fourni ou utilisé dans un cadre professionnel : le règlement ne s'applique pas.",
              'No AI system is provided or used professionally: the regulation does not apply.',
            ),
    },
  ]

  if (f.roles.length > 0) {
    basis.push({
      article: tr('Article 5', 'Article 5'),
      label: tr('Absence de pratique interdite', 'No prohibited practice'),
      met: f.prohibited === 'non',
      detail:
        f.prohibited === 'oui'
          ? tr(
              "Au moins un usage déclaré relève d'une pratique interdite depuis le 2 février 2025. Il doit cesser : c'est le palier de sanction le plus lourd du règlement.",
              'At least one reported use is a practice prohibited since 2 February 2025. It must stop: this is the heaviest penalty tier in the regulation.',
            )
          : f.prohibited === 'incertain'
            ? tr(
                "Un usage reste à vérifier au regard de l'article 5 et des lignes directrices de la Commission. Tant que le doute subsiste, il doit être traité comme un risque majeur.",
                'One use still needs to be checked against Article 5 and the Commission guidelines. While in doubt, treat it as a major risk.',
              )
            : tr('Aucune pratique interdite déclarée.', 'No prohibited practice reported.'),
    })
    basis.push({
      article: tr('Article 6 et annexes I et III', 'Article 6 and Annexes I and III'),
      label: tr('Système à haut risque', 'High-risk AI system'),
      met: f.highRisk,
      detail: f.highRisk
        ? tr(
            `Au moins un système relève d'un domaine à haut risque${f.annexI ? " (composant de sécurité d'un produit de l'annexe I, applicable au 2 août 2028)" : ''}${f.annexIII.length > 0 ? " (annexe III, applicable au 2 décembre 2027)" : ''}. Les exigences des articles 8 à 27 s'appliquent selon le rôle de l'entité.`,
            `At least one system falls within a high-risk area${f.annexI ? ' (safety component of an Annex I product, applicable from 2 August 2028)' : ''}${f.annexIII.length > 0 ? ' (Annex III, applicable from 2 December 2027)' : ''}. Articles 8 to 27 apply according to the entity's role.`,
          )
        : f.derogation && f.annexIII.length > 0
          ? tr(
              "Les systèmes de l'annexe III déclarés bénéficient de la dérogation de l'article 6, paragraphe 3. Le fournisseur doit documenter cette appréciation et enregistrer le système (art. 49, paragraphe 2).",
              'The declared Annex III systems benefit from the Article 6(3) derogation. The provider must document this assessment and register the system (Art. 49(2)).',
            )
          : tr("Aucun système à haut risque déclaré.", 'No high-risk system reported.'),
    })
    if (f.transparency.length > 0) {
      basis.push({
        article: tr('Article 50', 'Article 50'),
        label: tr('Obligations de transparence', 'Transparency obligations'),
        met: true,
        detail: tr(
          "Les usages déclarés (interaction, contenus générés, hypertrucages ou reconnaissance des émotions) emportent l'information des personnes, applicable depuis le 2 août 2026.",
          'The declared uses (interaction, generated content, deep fakes or emotion recognition) require informing people, applicable since 2 August 2026.',
        ),
      })
    }
    if (f.gpai) {
      basis.push({
        article: tr('Articles 53 et 55', 'Articles 53 and 55'),
        label: tr("Fournisseur de modèle d'IA à usage général", 'Provider of a general-purpose AI model'),
        met: true,
        detail: f.gpaiSystemic
          ? tr(
              "Modèle présentant un risque systémique : évaluation et atténuation des risques, tests contradictoires, signalement des incidents graves au Bureau de l'IA et cybersécurité renforcée s'ajoutent aux obligations de l'article 53.",
              'Model with systemic risk: risk assessment and mitigation, adversarial testing, serious-incident reporting to the AI Office and enhanced cybersecurity come on top of Article 53.',
            )
          : tr(
              "Documentation technique, information des fournisseurs en aval, politique de respect du droit d'auteur et résumé des données d'entraînement, applicables depuis le 2 août 2025.",
              'Technical documentation, information for downstream providers, a copyright policy and a training-data summary, applicable since 2 August 2025.',
            ),
      })
    }
  }

  const status: VerdictStatus =
    f.roles.length === 0 ? 'hors_champ' : f.roles.length === 1 && f.importer ? 'indirect' : 'applicable'

  let qualification: string | null = null
  if (status !== 'hors_champ') {
    const level = f.highRisk ? tr('haut risque', 'high risk') : f.transparency.length > 0 ? tr('risque limité', 'limited risk') : tr('risque minimal', 'minimal risk')
    if (f.gpai && !f.highRisk) qualification = tr("Fournisseur de modèle d'IA à usage général", 'General-purpose AI model provider')
    else if (f.provider && f.deployer) qualification = tr(`Fournisseur et déployeur, ${level}`, `Provider and deployer, ${level}`)
    else if (f.provider) qualification = tr(`Fournisseur, ${level}`, `Provider, ${level}`)
    else if (f.deployer) qualification = tr(`Déployeur, ${level}`, `Deployer, ${level}`)
    else qualification = tr('Importateur ou distributeur', 'Importer or distributor')
  }

  const caveats: string[] = []
  if (status !== 'hors_champ' && f.prohibited !== 'non') {
    caveats.push(
      tr(
        "L'Omnibus IA ajoute au 2 décembre 2026 l'interdiction des systèmes générant des contenus pédopornographiques ou des contenus intimes non consentis.",
        'The AI Omnibus adds, from 2 December 2026, a ban on systems generating child sexual abuse material or non-consensual intimate content.',
      ),
    )
  }
  if (f.highRisk) {
    caveats.push(
      tr(
        "Le règlement (UE) 2026/1744 (Omnibus IA) a reporté les obligations des systèmes à haut risque : 2 décembre 2027 pour l'annexe III, 2 août 2028 pour l'annexe I. Ce délai sert à préparer, pas à différer l'inventaire.",
        'Regulation (EU) 2026/1744 (AI Omnibus) postponed high-risk obligations: 2 December 2027 for Annex III, 2 August 2028 for Annex I. The delay is for preparing, not for postponing the inventory.',
      ),
    )
  }
  if (f.deployer && status !== 'hors_champ') {
    caveats.push(
      tr(
        "Un déployeur qui met un système à haut risque sur le marché sous son nom, le modifie substantiellement ou en change la destination devient fournisseur au sens de l'article 25.",
        'A deployer that puts its name on a high-risk system, substantially modifies it or changes its intended purpose becomes a provider under Article 25.',
      ),
    )
  }
  if (f.fria) {
    caveats.push(
      tr(
        "Déployeur public, ou déployeur d'un système de notation de crédit ou de tarification d'assurance : une analyse d'impact sur les droits fondamentaux est requise avant la première utilisation (art. 27).",
        'Public deployer, or deployer of a credit-scoring or insurance-pricing system: a fundamental-rights impact assessment is required before first use (Art. 27).',
      ),
    )
  }
  if (status !== 'hors_champ') {
    caveats.push(
      tr(
        "En France, les autorités compétentes ne sont pas encore formellement désignées : le schéma gouvernemental confie la coordination à la DGCCRF, avec la CNIL et les autorités sectorielles.",
        'In France, competent authorities have not yet been formally designated: the government plan gives coordination to the DGCCRF, alongside the CNIL and sectoral authorities.',
      ),
    )
  }

  const tier = f.prohibited === 'oui' || f.prohibited === 'incertain' ? 'AIACT-T1' : 'AIACT-T2'
  return {
    regulation: 'AIACT',
    status,
    qualification,
    basis,
    caveats,
    exposure: status === 'hors_champ' ? null : exposure('AIACT', tier, a, isSme),
  }
}

// ---------------------------------------------------------------------------
// Qualification d'ensemble
// ---------------------------------------------------------------------------

export function qualify(answers: Answers): QualificationResult {
  const critical = str(answers, 'entite_critique') === 'oui'
  const nis2 = qualifyNis2(answers, critical)
  const ai = aiFacts(answers)

  return {
    verdicts: {
      RGPD: qualifyRgpd(answers),
      NIS2: nis2.verdict,
      DORA: qualifyDora(answers),
      CRA: qualifyCra(answers),
      AIACT: qualifyAiAct(answers),
    },
    nis2Category: nis2.category,
    derived: {
      nis2Category: nis2.category ?? 'aucune',
      mediumThreshold: meetsMediumThreshold(answers),
      largeThreshold: exceedsMediumThreshold(answers),
      turnover: turnoverEstimate(answers),
      isFinancial: str(answers, 'entite_financiere') === 'oui',
      doraPrevails: str(answers, 'entite_financiere') === 'oui' && nis2.verdict.status !== 'hors_champ',
      aiProvider: ai.provider,
      aiDeployer: ai.deployer,
      aiHighRisk: ai.highRisk,
      aiProviderHighRisk: ai.provider && ai.highRisk,
      aiDeployerHighRisk: ai.deployer && ai.highRisk,
      aiTransparency: ai.transparency.length > 0,
      aiGpai: ai.gpai,
      aiGpaiSystemic: ai.gpaiSystemic,
      aiFria: ai.fria,
      aiDerogation: ai.derogation && ai.annexIII.length > 0 && ai.provider,
      aiValueChain: ai.deployer || ai.importer,
    },
    completedAt: new Date().toISOString(),
  }
}

/** Règlements retenus comme applicables, par ordre de priorité d'examen. */
export function applicableRegulations(result: QualificationResult | null): RegulationId[] {
  if (!result) return []
  return (['RGPD', 'NIS2', 'DORA', 'CRA', 'AIACT'] as RegulationId[]).filter((id) => {
    const s = result.verdicts[id].status
    return s === 'applicable' || s === 'probable' || s === 'indirect'
  })
}

export const STATUS_LABEL: Record<VerdictStatus, string> = {
  applicable: tr('Applicable', 'Applicable'),
  probable: tr('Probable', 'Likely'),
  indirect: tr('Indirect', 'Indirect'),
  hors_champ: tr('Hors champ', 'Out of scope'),
}
