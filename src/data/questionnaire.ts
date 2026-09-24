import type { Answers, Question } from '@/types/domain'
import { LANG } from '@/i18n'
import EN_QUESTIONNAIRE from '@/i18n/en/questionnaire.json'

/**
 * Questionnaire de qualification.
 *
 * Chaque question porte le fondement juridique qu'elle sert à établir. Ce
 * n'est pas un ornement : l'utilisateur doit pouvoir opposer la réponse de
 * la plateforme à un juriste, et une question dont on ignore ce qu'elle établit
 * ne mérite pas d'être posée.
 */

// ---------------------------------------------------------------------------
// Taxonomie des secteurs
// ---------------------------------------------------------------------------

export interface Sector {
  value: string
  label: string
  /** Annexe de NIS2 : I pour les secteurs hautement critiques, II pour les autres. */
  nis2Annex: 'I' | 'II' | null
  /** Le secteur emporte-t-il présomption d'entité financière au sens de DORA ? */
  financial?: boolean
}

export const SECTORS: Sector[] = [
  // Annexe I : secteurs hautement critiques
  { value: 'energie', label: 'Énergie', nis2Annex: 'I' },
  { value: 'transports', label: 'Transports', nis2Annex: 'I' },
  { value: 'banque', label: 'Secteur bancaire', nis2Annex: 'I', financial: true },
  { value: 'marches_financiers', label: 'Infrastructures des marchés financiers', nis2Annex: 'I', financial: true },
  { value: 'sante', label: 'Santé', nis2Annex: 'I' },
  { value: 'eau_potable', label: 'Eau potable', nis2Annex: 'I' },
  { value: 'eaux_usees', label: 'Eaux usées', nis2Annex: 'I' },
  { value: 'infra_numerique', label: 'Infrastructure numérique', nis2Annex: 'I' },
  { value: 'gestion_tic', label: 'Gestion des services TIC entre entreprises', nis2Annex: 'I' },
  { value: 'admin_publique', label: 'Administration publique', nis2Annex: 'I' },
  { value: 'espace', label: 'Espace', nis2Annex: 'I' },
  // Annexe II : autres secteurs critiques
  { value: 'poste', label: 'Services postaux et d\'expédition', nis2Annex: 'II' },
  { value: 'dechets', label: 'Gestion des déchets', nis2Annex: 'II' },
  { value: 'chimie', label: 'Fabrication, production et distribution de produits chimiques', nis2Annex: 'II' },
  { value: 'denrees', label: 'Production, transformation et distribution de denrées alimentaires', nis2Annex: 'II' },
  { value: 'fabrication', label: 'Fabrication (dispositifs médicaux, informatique, électronique, machines, véhicules)', nis2Annex: 'II' },
  { value: 'fournisseurs_num', label: 'Fournisseurs numériques (places de marché, moteurs de recherche, réseaux sociaux)', nis2Annex: 'II' },
  { value: 'recherche', label: 'Recherche', nis2Annex: 'II' },
  // Hors annexes
  { value: 'assurance', label: 'Assurance et réassurance', nis2Annex: null, financial: true },
  { value: 'conseil', label: 'Conseil et services professionnels', nis2Annex: null },
  { value: 'commerce', label: 'Commerce et distribution', nis2Annex: null },
  { value: 'immobilier', label: 'Immobilier et construction', nis2Annex: null },
  { value: 'education', label: 'Éducation et formation', nis2Annex: null },
  { value: 'autre', label: 'Autre secteur', nis2Annex: null },
]

export const SECTOR_BY_VALUE = new Map(SECTORS.map((s) => [s.value, s]))

/**
 * Types d'entités soumises à NIS2 quelle que soit leur taille (article 2,
 * paragraphe 2, et article 3, paragraphe 1, points b) et c)).
 */
export const SIZE_INDEPENDENT_TYPES = [
  { value: 'dns', label: 'Fournisseur de services DNS', essential: true },
  { value: 'tld', label: 'Registre de noms de domaine de premier niveau', essential: true },
  { value: 'confiance_qualifie', label: 'Prestataire de services de confiance qualifié', essential: true },
  { value: 'confiance_non_qualifie', label: 'Prestataire de services de confiance non qualifié', essential: false },
  { value: 'comm_electroniques', label: 'Fournisseur de réseaux ou services de communications électroniques accessibles au public', essential: false },
  { value: 'enregistrement_domaines', label: "Fournisseur de services d'enregistrement de noms de domaine", essential: false },
]

/**
 * Types de fournisseurs numériques visés par le règlement d'exécution
 * (UE) 2024/2690, qui leur impose des exigences techniques chiffrées.
 */
export const DIGITAL_PROVIDER_TYPES = [
  { value: 'cloud', label: "Fournisseur de services d'informatique en nuage" },
  { value: 'datacenter', label: 'Fournisseur de services de centres de données' },
  { value: 'cdn', label: 'Fournisseur de réseaux de diffusion de contenu' },
  { value: 'msp', label: 'Fournisseur de services gérés' },
  { value: 'mssp', label: 'Fournisseur de services de sécurité gérés' },
  { value: 'marketplace', label: 'Fournisseur de places de marché en ligne' },
  { value: 'moteur', label: 'Fournisseur de moteurs de recherche en ligne' },
  { value: 'reseau_social', label: 'Plateforme de services de réseaux sociaux' },
]

/** Catégories d'entités financières de l'article 2 de DORA. */
export const FINANCIAL_TYPES = [
  { value: 'credit', label: 'Établissement de crédit' },
  { value: 'paiement', label: 'Établissement de paiement' },
  { value: 'monnaie_elec', label: 'Établissement de monnaie électronique' },
  { value: 'investissement', label: "Entreprise d'investissement" },
  { value: 'crypto', label: 'Prestataire de services sur crypto-actifs' },
  { value: 'dct', label: 'Dépositaire central de titres' },
  { value: 'ccp', label: 'Contrepartie centrale' },
  { value: 'plateforme', label: 'Plateforme de négociation' },
  { value: 'referentiel', label: 'Référentiel central' },
  { value: 'gestionnaire_fonds', label: "Gestionnaire de fonds d'investissement alternatifs ou société de gestion" },
  { value: 'assurance', label: 'Entreprise d\'assurance ou de réassurance' },
  { value: 'intermediaire', label: "Intermédiaire d'assurance ou de réassurance" },
  { value: 'irp', label: 'Institution de retraite professionnelle' },
  { value: 'notation', label: 'Agence de notation de crédit' },
  { value: 'indices', label: "Administrateur d'indices de référence critiques" },
  { value: 'crowdfunding', label: 'Prestataire de services de financement participatif' },
  { value: 'titrisation', label: 'Référentiel des titrisations' },
  { value: 'prestataire_tic', label: 'Prestataire tiers de services TIC au secteur financier' },
]

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

const yesNo = [
  { value: 'oui', label: 'Oui' },
  { value: 'non', label: 'Non' },
]

export const QUESTIONS: Question[] = [
  // -------------------------------------------------------------------------
  // 1. Identité et taille
  // -------------------------------------------------------------------------
  {
    id: 'secteur',
    section: 'identite',
    sectionLabel: "Identité de l'entité",
    basis: 'NIS2, annexes I et II',
    question: "Dans quel secteur l'entité exerce-t-elle son activité principale ?",
    help: "Retenez le secteur le plus réglementé si l'entité en couvre plusieurs : la qualification s'apprécie activité par activité, et la plus contraignante commande.",
    type: 'select',
    options: SECTORS.map((s) => ({ value: s.value, label: s.label })),
    required: true,
  },
  {
    id: 'effectif',
    section: 'identite',
    sectionLabel: "Identité de l'entité",
    basis: 'Recommandation 2003/361/CE, annexe, article 2',
    question: "Quel est l'effectif de l'entité ?",
    help: "L'effectif s'apprécie au niveau du groupe lorsque l'entité est liée ou partenaire au sens de la recommandation européenne sur la définition des petites et moyennes entreprises.",
    type: 'radio',
    options: [
      { value: 'micro', label: 'Moins de 10 personnes', hint: 'Microentreprise' },
      { value: 'petite', label: 'De 10 à 49 personnes', hint: 'Petite entreprise' },
      { value: 'moyenne', label: 'De 50 à 249 personnes', hint: 'Moyenne entreprise' },
      { value: 'grande', label: '250 personnes ou plus', hint: 'Grande entreprise' },
    ],
    required: true,
  },
  {
    id: 'chiffre_affaires',
    section: 'identite',
    sectionLabel: "Identité de l'entité",
    basis: 'Recommandation 2003/361/CE ; NIS2, article 2, paragraphe 1',
    question: "Quel est le chiffre d'affaires annuel mondial de l'entité ?",
    help: "Ce montant sert deux usages distincts : établir le franchissement du seuil de taille, et valoriser l'exposition maximale aux sanctions, qui s'exprime en pourcentage du chiffre d'affaires mondial.",
    type: 'radio',
    options: [
      { value: 'lt2', label: "Moins de 2 M€" },
      { value: '2a10', label: "De 2 à 10 M€" },
      { value: '10a50', label: "De 10 à 50 M€" },
      { value: '50a250', label: "De 50 à 250 M€" },
      { value: '250a1000', label: "De 250 M€ à 1 Md€" },
      { value: 'gt1000', label: "Plus de 1 Md€" },
    ],
    required: true,
  },
  {
    id: 'bilan',
    section: 'identite',
    sectionLabel: "Identité de l'entité",
    basis: 'Recommandation 2003/361/CE, annexe, article 2',
    question: "Quel est le total du bilan annuel ?",
    help: "Le seuil de moyenne entreprise se franchit dès que l'effectif atteint 50 personnes, ou que le chiffre d'affaires et le total du bilan dépassent tous deux 10 M€.",
    type: 'radio',
    options: [
      { value: 'lte10', label: "10 M€ ou moins" },
      { value: '10a43', label: "De 10 à 43 M€" },
      { value: 'gt43', label: "Plus de 43 M€" },
    ],
    required: true,
  },
  {
    id: 'etablissement_ue',
    section: 'identite',
    sectionLabel: "Identité de l'entité",
    basis: "RGPD, article 3 ; NIS2, article 26",
    question: "L'entité est-elle établie dans l'Union européenne ?",
    help: "Une entité non établie dans l'Union peut néanmoins y être soumise : au RGPD si elle cible des personnes situées dans l'Union ou suit leur comportement, à NIS2 si elle y fournit des services relevant de la directive.",
    type: 'radio',
    options: yesNo,
    required: true,
  },
  {
    id: 'cible_ue',
    section: 'identite',
    sectionLabel: "Identité de l'entité",
    basis: 'RGPD, article 3, paragraphe 2',
    question: "L'entité offre-t-elle des biens ou services à des personnes situées dans l'Union, ou suit-elle leur comportement ?",
    help: "Ce critère fonde à lui seul l'application du RGPD à une entité établie hors de l'Union, et emporte l'obligation de désigner un représentant.",
    type: 'radio',
    options: yesNo,
    required: true,
    showIf: (a) => a.etablissement_ue === 'non',
  },
  {
    id: 'etats_membres',
    section: 'identite',
    sectionLabel: "Identité de l'entité",
    basis: 'NIS2, article 26 ; RGPD, article 56',
    question: "Dans combien d'États membres l'entité fournit-elle ses services ?",
    help: "Détermine l'autorité compétente et, pour le RGPD, l'éventuel recours au guichet unique auprès d'une autorité chef de file.",
    type: 'radio',
    options: [
      { value: 'un', label: 'Un seul' },
      { value: 'deux_cinq', label: 'De deux à cinq' },
      { value: 'six_plus', label: 'Six ou plus' },
    ],
    required: true,
  },

  // -------------------------------------------------------------------------
  // 2. Données personnelles
  // -------------------------------------------------------------------------
  {
    id: 'donnees_perso',
    section: 'donnees',
    sectionLabel: 'Données à caractère personnel',
    basis: 'RGPD, articles 2 et 4',
    question: "L'entité traite-t-elle des données à caractère personnel ?",
    help: "Données de clients, de salariés, de prospects, journaux contenant des adresses IP, images de vidéosurveillance. En pratique, la réponse négative est rare et mérite d'être vérifiée.",
    type: 'radio',
    options: [
      { value: 'oui', label: 'Oui' },
      { value: 'non', label: 'Non, aucune donnée personnelle' },
      { value: 'incertain', label: 'Incertain' },
    ],
    required: true,
  },
  {
    id: 'role_rgpd',
    section: 'donnees',
    sectionLabel: 'Données à caractère personnel',
    basis: 'RGPD, article 4, points 7 et 8',
    question: "À quel titre l'entité intervient-elle ?",
    help: "La qualité de responsable de traitement et celle de sous-traitant n'emportent pas les mêmes obligations. La plupart des organisations cumulent les deux selon les traitements.",
    type: 'radio',
    options: [
      { value: 'responsable', label: 'Responsable de traitement uniquement' },
      { value: 'sous_traitant', label: 'Sous-traitant uniquement' },
      { value: 'les_deux', label: 'Les deux, selon les traitements' },
    ],
    required: true,
    showIf: (a) => a.donnees_perso !== 'non',
  },
  {
    id: 'donnees_sensibles',
    section: 'donnees',
    sectionLabel: 'Données à caractère personnel',
    basis: 'RGPD, articles 9 et 10',
    question: "L'entité traite-t-elle des catégories particulières de données ?",
    help: "Données de santé, biométriques, génétiques, ou révélant l'origine raciale ou ethnique, les opinions politiques, les convictions religieuses ou philosophiques, l'appartenance syndicale, la vie ou l'orientation sexuelle. Également les données relatives aux condamnations et infractions.",
    type: 'radio',
    options: yesNo,
    required: true,
    showIf: (a) => a.donnees_perso !== 'non',
  },
  {
    id: 'suivi_grande_echelle',
    section: 'donnees',
    sectionLabel: 'Données à caractère personnel',
    basis: 'RGPD, article 37, paragraphe 1',
    question: "Les activités de base impliquent-elles un suivi régulier et systématique à grande échelle, ou un traitement à grande échelle de données sensibles ?",
    help: "C'est ce critère, et non la taille de l'organisation, qui déclenche l'obligation de désigner un délégué à la protection des données.",
    type: 'radio',
    options: [
      { value: 'oui', label: 'Oui' },
      { value: 'non', label: 'Non' },
      { value: 'incertain', label: 'Incertain' },
    ],
    required: true,
    showIf: (a) => a.donnees_perso !== 'non',
  },
  {
    id: 'autorite_publique',
    section: 'donnees',
    sectionLabel: 'Données à caractère personnel',
    basis: 'RGPD, article 37, paragraphe 1, point a)',
    question: "L'entité est-elle une autorité ou un organisme public ?",
    help: "La désignation d'un délégué à la protection des données est obligatoire pour toute autorité publique, sans condition de taille ni de nature des traitements.",
    type: 'radio',
    options: yesNo,
    required: true,
    showIf: (a) => a.donnees_perso !== 'non',
  },
  {
    id: 'transferts_hors_ue',
    section: 'donnees',
    sectionLabel: 'Données à caractère personnel',
    basis: 'RGPD, articles 44 à 49',
    question: "Des données personnelles sont-elles transférées hors de l'Union européenne ?",
    help: "Un accès distant depuis un pays tiers constitue un transfert, même sans copie des données. L'hébergement chez un fournisseur soumis à une législation extraterritoriale doit être examiné.",
    type: 'radio',
    options: yesNo,
    required: true,
    showIf: (a) => a.donnees_perso !== 'non',
  },
  {
    id: 'base_consentement',
    section: 'donnees',
    sectionLabel: 'Données à caractère personnel',
    basis: 'RGPD, articles 6 et 7',
    question: "Des traitements reposent-ils sur le consentement des personnes ?",
    help: "Le consentement impose de pouvoir démontrer son recueil et d'offrir un retrait aussi simple que le recueil, ce qui crée une charge technique propre.",
    type: 'radio',
    options: yesNo,
    required: true,
    showIf: (a) => a.donnees_perso !== 'non',
  },

  // -------------------------------------------------------------------------
  // 3. Activité numérique
  // -------------------------------------------------------------------------
  {
    id: 'type_taille_independante',
    section: 'numerique',
    sectionLabel: 'Activité numérique et criticité',
    basis: 'NIS2, article 2, paragraphe 2, et article 3',
    question: "L'entité relève-t-elle de l'un de ces types, soumis à NIS2 quelle que soit sa taille ?",
    help: "Ces catégories échappent au seuil de taille. Une entité de trois personnes fournissant des services DNS est une entité essentielle.",
    type: 'multi',
    options: [
      ...SIZE_INDEPENDENT_TYPES.map((t) => ({ value: t.value, label: t.label })),
      { value: 'aucun', label: 'Aucun de ces types' },
    ],
    required: true,
  },
  {
    id: 'services_ict',
    section: 'numerique',
    sectionLabel: 'Activité numérique et criticité',
    basis: "NIS2, article 21, paragraphe 5 ; règlement d'exécution (UE) 2024/2690",
    question: "L'entité fournit-elle des services numériques à d'autres organisations ?",
    help: "Informatique en nuage, centres de données, diffusion de contenu, services gérés ou de sécurité gérés, places de marché, moteurs de recherche, réseaux sociaux.",
    type: 'radio',
    options: yesNo,
    required: true,
  },
  {
    id: 'type_fournisseur_num',
    section: 'numerique',
    sectionLabel: 'Activité numérique et criticité',
    basis: "Règlement d'exécution (UE) 2024/2690, article 1er",
    question: "De quel type de fournisseur numérique s'agit-il ?",
    help: "Ces catégories sont soumises à des exigences techniques chiffrées et à des critères d'incident important prédéfinis, qui remplacent l'appréciation au cas par cas.",
    type: 'multi',
    options: DIGITAL_PROVIDER_TYPES,
    required: false,
    showIf: (a) => a.services_ict === 'oui',
  },
  {
    id: 'criticite_service',
    section: 'numerique',
    sectionLabel: 'Activité numérique et criticité',
    basis: 'NIS2, article 2, paragraphe 2, points b) à e)',
    question: "Une interruption des services de l'entité aurait-elle des conséquences au-delà de l'entité elle-même ?",
    help: "Un État membre peut identifier comme entité essentielle ou importante, sans condition de taille, une entité dont la perturbation aurait un impact significatif sur la sécurité publique, la sûreté publique ou la santé publique, ou pourrait induire un risque systémique.",
    type: 'radio',
    options: [
      { value: 'majeur', label: 'Oui, impact majeur sur la sécurité, la sûreté ou la santé publiques' },
      { value: 'modere', label: 'Oui, impact sur plusieurs organisations ou un nombre important d\'usagers' },
      { value: 'limite', label: "Non, impact limité à l'entité et à ses clients directs" },
    ],
    required: true,
  },

  {
    id: 'entite_critique',
    section: 'numerique',
    sectionLabel: 'Activité numérique et criticité',
    basis: 'NIS2, article 3, paragraphe 1, point f)',
    question: "L'entité a-t-elle été désignée entité critique, ou opérateur d'importance vitale ?",
    help: "Une entité désignée critique par l'État est de plein droit entité essentielle au sens de NIS2, quelle que soit sa taille. En France, la désignation comme opérateur d'importance vitale préfigure ce statut.",
    type: 'radio',
    options: [
      { value: 'oui', label: 'Oui' },
      { value: 'non', label: 'Non' },
      { value: 'incertain', label: 'Pas à notre connaissance' },
    ],
    required: true,
  },

  // -------------------------------------------------------------------------
  // 4. Secteur financier
  // -------------------------------------------------------------------------
  {
    id: 'entite_financiere',
    section: 'financier',
    sectionLabel: 'Secteur financier',
    basis: 'DORA, article 2, paragraphe 1',
    question: "L'entité figure-t-elle parmi les types d'entités financières visés par DORA ?",
    help: "La liste de l'article 2 est limitative. Une entité qui n'y figure pas n'est pas soumise à DORA, quelle que soit son activité financière de fait.",
    type: 'radio',
    options: yesNo,
    required: true,
  },
  {
    id: 'type_financier',
    section: 'financier',
    sectionLabel: 'Secteur financier',
    basis: 'DORA, article 2, paragraphe 1',
    question: "De quel type d'entité financière s'agit-il ?",
    type: 'select',
    options: FINANCIAL_TYPES,
    required: true,
    showIf: (a) => a.entite_financiere === 'oui',
  },
  {
    id: 'dora_regime_simplifie',
    section: 'financier',
    sectionLabel: 'Secteur financier',
    basis: 'DORA, article 16, paragraphe 1',
    question: "L'entité relève-t-elle du cadre simplifié de gestion du risque lié aux TIC ?",
    help: "Le cadre simplifié vise les petites entreprises d'investissement non interconnectées, les établissements de paiement et de monnaie électronique exemptés, et les petites institutions de retraite professionnelle. Il écarte les articles 5 à 15 au profit d'un socle allégé.",
    type: 'radio',
    options: [
      { value: 'oui', label: 'Oui' },
      { value: 'non', label: 'Non' },
      { value: 'incertain', label: 'Incertain' },
    ],
    required: true,
    showIf: (a) => a.entite_financiere === 'oui',
  },
  {
    id: 'dora_tlpt',
    section: 'financier',
    sectionLabel: 'Secteur financier',
    basis: 'DORA, article 26, paragraphe 8',
    question: "L'entité a-t-elle été identifiée par l'autorité compétente pour réaliser des tests de pénétration fondés sur la menace ?",
    help: "Cette identification relève de l'autorité, sur la base de critères de criticité et de profil de risque. Elle emporte l'obligation d'un test au moins triennal en production réelle.",
    type: 'radio',
    options: [
      { value: 'oui', label: 'Oui' },
      { value: 'non', label: 'Non' },
      { value: 'incertain', label: 'Pas encore notifiée' },
    ],
    required: true,
    showIf: (a) => a.entite_financiere === 'oui' && a.dora_regime_simplifie !== 'oui',
  },
  {
    id: 'tiers_ict_critiques',
    section: 'financier',
    sectionLabel: 'Secteur financier',
    basis: 'DORA, articles 28 à 30',
    question: "L'entité confie-t-elle à des prestataires tiers des services TIC soutenant des fonctions critiques ou importantes ?",
    help: "La réponse conditionne les obligations les plus lourdes de DORA : registre d'information, clauses contractuelles renforcées, évaluation du risque de concentration et stratégie de sortie.",
    type: 'radio',
    options: yesNo,
    required: true,
    showIf: (a) => a.entite_financiere === 'oui',
  },
  {
    id: 'clients_financiers',
    section: 'financier',
    sectionLabel: 'Secteur financier',
    basis: 'DORA, articles 30 et 31',
    question: "L'entité compte-t-elle des entités financières parmi ses clients ?",
    help: "Un prestataire TIC d'entités financières n'est pas directement soumis à DORA, mais en subit les effets par voie contractuelle : ses clients doivent lui imposer les clauses de l'article 30, y compris un droit d'audit sans restriction.",
    type: 'radio',
    options: [
      { value: 'oui', label: 'Oui' },
      { value: 'non', label: 'Non' },
      { value: 'incertain', label: 'Incertain' },
    ],
    required: true,
    showIf: (a) => a.entite_financiere === 'non' && a.services_ict === 'oui',
  },

  // -------------------------------------------------------------------------
  // 5. Produits numériques (CRA)
  // -------------------------------------------------------------------------
  {
    id: 'cra_roles',
    section: 'produits',
    sectionLabel: 'Produits numériques',
    basis: 'CRA, articles 3, 13, 19 et 20',
    question: "L'entité met-elle sur le marché de l'Union des produits comportant des éléments numériques ?",
    help: "Logiciel vendu ou distribué, application, objet connecté, équipement réseau, micrologiciel. Le CRA vise le produit, pas le service : une offre purement en nuage relève de NIS2. Un logiciel libre fourni hors de toute activité commerciale n'est pas concerné.",
    type: 'multi',
    options: [
      { value: 'fabricant', label: 'Oui, en tant que fabricant', hint: "Conçoit ou fait fabriquer le produit, et le commercialise sous son nom ou sa marque" },
      { value: 'importateur', label: 'Oui, en tant qu\'importateur', hint: "Met sur le marché de l'Union un produit d'un fabricant établi hors de l'Union" },
      { value: 'distributeur', label: 'Oui, en tant que distributeur', hint: 'Met à disposition un produit sans en modifier les propriétés' },
      { value: 'aucun', label: 'Non, aucun produit de ce type' },
    ],
    required: true,
  },
  {
    id: 'cra_categorie',
    section: 'produits',
    sectionLabel: 'Produits numériques',
    basis: "CRA, annexes III et IV ; règlement d'exécution (UE) 2025/2392",
    question: 'Quelle est la catégorie la plus élevée parmi les produits fabriqués ?',
    help: "La catégorie fixe la procédure d'évaluation de la conformité : autoévaluation pour les produits par défaut, norme harmonisée ou tierce partie pour la classe I, tierce partie obligatoire pour la classe II, certification européenne pour les produits critiques.",
    type: 'radio',
    options: [
      { value: 'defaut', label: 'Produit par défaut', hint: 'Environ 90 % des produits, autoévaluation' },
      { value: 'classe_i', label: 'Produit important de classe I', hint: 'Gestionnaire de mots de passe, navigateur, système d\'exploitation, routeur…' },
      { value: 'classe_ii', label: 'Produit important de classe II', hint: 'Hyperviseur, pare-feu, système de détection d\'intrusion…' },
      { value: 'critique', label: 'Produit critique', hint: 'Passerelle de compteur intelligent, carte à puce, élément sécurisé' },
    ],
    required: true,
    showIf: (a) => Array.isArray(a.cra_roles) && a.cra_roles.includes('fabricant'),
  },
  {
    id: 'cra_exclu',
    section: 'produits',
    sectionLabel: 'Produits numériques',
    basis: 'CRA, article 2, paragraphes 2 à 7',
    question: 'Ces produits relèvent-ils d\'une réglementation sectorielle exclue du CRA ?',
    help: "Dispositifs médicaux et de diagnostic in vitro, véhicules à moteur, aviation civile, équipements marins, ou produits développés exclusivement pour la défense ou la sécurité nationale. Ces produits suivent leur propre régime.",
    type: 'radio',
    options: [
      { value: 'non', label: 'Non' },
      { value: 'partiellement', label: 'Pour une partie des produits seulement' },
      { value: 'oui', label: 'Oui, pour la totalité des produits' },
    ],
    required: true,
    showIf: (a) => Array.isArray(a.cra_roles) && a.cra_roles.some((r) => r !== 'aucun'),
  },

  // -------------------------------------------------------------------------
  // 6. Intelligence artificielle
  // -------------------------------------------------------------------------
  {
    id: 'ia_roles',
    section: 'ia',
    sectionLabel: 'Intelligence artificielle',
    basis: 'AI Act, article 2 et article 3, points 3, 4, 6 et 7',
    question: "L'entité développe-t-elle, met-elle sur le marché ou utilise-t-elle des systèmes d'intelligence artificielle ?",
    help: "Un système d'IA infère, à partir des entrées qu'il reçoit, la manière de générer des prédictions, du contenu, des recommandations ou des décisions (art. 3, point 1). Un outil d'IA générative utilisé par les équipes, un module de tri de candidatures ou un agent conversationnel en relèvent. L'usage purement personnel et non professionnel est exclu.",
    type: 'multi',
    options: [
      { value: 'fournisseur', label: 'Oui, en tant que fournisseur', hint: "Développe ou fait développer un système ou un modèle d'IA et le met sur le marché ou en service sous son nom ou sa marque" },
      { value: 'deployeur', label: 'Oui, en tant que déployeur', hint: "Utilise sous son autorité un système d'IA dans un cadre professionnel" },
      { value: 'importateur', label: 'Oui, en tant qu\'importateur ou distributeur', hint: "Met à disposition dans l'Union un système d'IA d'un fournisseur tiers" },
      { value: 'aucun', label: "Non, aucun système d'IA" },
    ],
    required: true,
  },
  {
    id: 'ia_pratiques',
    section: 'ia',
    sectionLabel: 'Intelligence artificielle',
    basis: 'AI Act, article 5',
    question: "Un des usages de l'IA relève-t-il d'une pratique interdite ?",
    help: "Notation sociale, exploitation des vulnérabilités, manipulation subliminale, prédiction d'infraction fondée sur le seul profilage, moissonnage non ciblé d'images faciales, reconnaissance des émotions au travail ou à l'école, catégorisation biométrique sur des données sensibles, identification biométrique à distance en temps réel à des fins répressives. Ces interdictions s'appliquent depuis le 2 février 2025.",
    type: 'radio',
    options: [
      { value: 'non', label: 'Non' },
      { value: 'incertain', label: 'À vérifier' },
      { value: 'oui', label: 'Oui, au moins un usage' },
    ],
    required: true,
    showIf: (a) => Array.isArray(a.ia_roles) && a.ia_roles.some((r) => r !== 'aucun'),
  },
  {
    id: 'ia_haut_risque',
    section: 'ia',
    sectionLabel: 'Intelligence artificielle',
    basis: 'AI Act, article 6 et annexes I et III',
    question: "Les systèmes d'IA sont-ils utilisés ou fournis dans l'un de ces domaines ?",
    help: "Ces domaines font présumer un système à haut risque. Les obligations correspondantes s'appliquent au 2 décembre 2027 pour l'annexe III et au 2 août 2028 pour l'annexe I, depuis l'Omnibus IA.",
    type: 'multi',
    options: [
      { value: 'biometrie', label: 'Biométrie', hint: 'Identification à distance, catégorisation biométrique, reconnaissance des émotions' },
      { value: 'infrastructures', label: 'Infrastructures critiques', hint: "Composant de sécurité de la gestion du trafic, de l'eau, du gaz, du chauffage, de l'électricité ou des infrastructures numériques critiques" },
      { value: 'education', label: 'Éducation et formation', hint: 'Admission, évaluation des acquis, surveillance des examens' },
      { value: 'emploi', label: 'Emploi et gestion du personnel', hint: 'Recrutement, tri de candidatures, promotion, licenciement, attribution des tâches, évaluation' },
      { value: 'services_essentiels', label: 'Accès aux services essentiels', hint: "Solvabilité et note de crédit, tarification d'assurance vie et santé, prestations publiques, appels d'urgence" },
      { value: 'autorites', label: 'Répression, migration, justice ou processus démocratiques' },
      { value: 'produit', label: 'Composant de sécurité d\'un produit réglementé', hint: 'Machines, jouets, dispositifs médicaux, ascenseurs, équipements radio… (annexe I)' },
      { value: 'aucun', label: 'Aucun de ces domaines' },
    ],
    required: true,
    showIf: (a) => Array.isArray(a.ia_roles) && a.ia_roles.some((r) => r !== 'aucun'),
  },
  {
    id: 'ia_derogation',
    section: 'ia',
    sectionLabel: 'Intelligence artificielle',
    basis: 'AI Act, article 6, paragraphe 3',
    question: "Le système se limite-t-il à une tâche procédurale étroite ou préparatoire, sans influence significative sur la décision ?",
    help: "Un système de l'annexe III n'est pas à haut risque s'il ne présente pas de risque important pour la santé, la sécurité ou les droits fondamentaux. Cette dérogation ne vaut jamais pour un système qui effectue un profilage de personnes physiques, et le fournisseur qui l'invoque doit documenter son appréciation et enregistrer le système.",
    type: 'radio',
    options: [
      { value: 'non', label: 'Non, il influence la décision' },
      { value: 'incertain', label: 'Incertain' },
      { value: 'oui', label: 'Oui, tâche étroite ou préparatoire, sans profilage' },
    ],
    required: true,
    showIf: (a) =>
      Array.isArray(a.ia_haut_risque) && a.ia_haut_risque.some((v) => v !== 'aucun' && v !== 'produit'),
  },
  {
    id: 'ia_transparence',
    section: 'ia',
    sectionLabel: 'Intelligence artificielle',
    basis: 'AI Act, article 50',
    question: "Les systèmes d'IA donnent-ils lieu à l'un de ces usages ?",
    help: "Ces usages emportent des obligations de transparence envers les personnes, applicables depuis le 2 août 2026, quel que soit le niveau de risque du système.",
    type: 'multi',
    options: [
      { value: 'interaction', label: 'Interaction directe avec des personnes', hint: 'Agent conversationnel, assistant vocal' },
      { value: 'generation', label: 'Génération de contenus de synthèse', hint: 'Texte, image, son ou vidéo produits par le système' },
      { value: 'hypertrucage', label: "Hypertrucage ou texte publié pour informer le public" },
      { value: 'emotions', label: 'Reconnaissance des émotions ou catégorisation biométrique' },
      { value: 'aucun', label: 'Aucun de ces usages' },
    ],
    required: true,
    showIf: (a) => Array.isArray(a.ia_roles) && a.ia_roles.some((r) => r !== 'aucun'),
  },
  {
    id: 'ia_gpai',
    section: 'ia',
    sectionLabel: 'Intelligence artificielle',
    basis: 'AI Act, articles 51 à 55',
    question: "L'entité met-elle sur le marché de l'Union un modèle d'IA à usage général ?",
    help: "Un modèle entraîné sur un grand volume de données, capable d'exécuter un large éventail de tâches et intégrable dans des systèmes en aval. Le seuil de risque systémique est présumé atteint au-delà de 10^25 opérations en virgule flottante de calcul d'entraînement. Intégrer le modèle d'un tiers dans son produit ne fait pas de l'entité un fournisseur de modèle.",
    type: 'radio',
    options: [
      { value: 'non', label: 'Non' },
      { value: 'oui', label: 'Oui' },
      { value: 'systemique', label: 'Oui, présentant un risque systémique' },
    ],
    required: true,
    showIf: (a) => Array.isArray(a.ia_roles) && a.ia_roles.includes('fournisseur'),
  },

  // -------------------------------------------------------------------------
  // 7. État des lieux
  // -------------------------------------------------------------------------
  {
    id: 'incidents_recents',
    section: 'etat',
    sectionLabel: 'État des lieux',
    basis: "Élément de contexte, sans effet sur la qualification",
    question: "L'entité a-t-elle subi un incident de sécurité significatif au cours des deux dernières années ?",
    help: "Sans effet sur la qualification juridique, mais pertinent pour la priorisation : un antécédent récent accroît la probabilité d'un contrôle et la sévérité de son appréciation.",
    type: 'radio',
    options: [
      { value: 'recent', label: 'Oui, au cours des deux dernières années' },
      { value: 'ancien', label: 'Oui, il y a plus de deux ans' },
      { value: 'aucun', label: 'Aucun incident significatif connu' },
    ],
    required: true,
  },
]

export const QUESTION_SECTIONS = [
  { id: 'identite', label: "Identité de l'entité", hint: "Secteur, taille et implantation : ces trois éléments commandent l'essentiel de la qualification." },
  { id: 'donnees', label: 'Données à caractère personnel', hint: "Champ d'application du RGPD et intensité des obligations." },
  { id: 'numerique', label: 'Activité numérique et criticité', hint: "Champ d'application de NIS2, y compris les cas où la taille est indifférente." },
  { id: 'financier', label: 'Secteur financier', hint: "Champ d'application de DORA et articulation avec NIS2." },
  { id: 'produits', label: 'Produits numériques', hint: "Champ d'application du CRA : produits matériels et logiciels mis sur le marché de l'Union." },
  { id: 'ia', label: 'Intelligence artificielle', hint: "Champ d'application de l'AI Act : rôle de l'entité, niveau de risque des systèmes et obligations de transparence." },
  { id: 'etat', label: 'État des lieux', hint: "Élément de contexte utilisé pour la priorisation, non pour la qualification." },
]

/** Questions effectivement posées compte tenu des réponses déjà données. */
export function visibleQuestions(answers: Answers): Question[] {
  return QUESTIONS.filter((q) => !q.showIf || q.showIf(answers))
}

export function isComplete(answers: Answers): boolean {
  return visibleQuestions(answers)
    .filter((q) => q.required)
    .every((q) => {
      const v = answers[q.id]
      if (Array.isArray(v)) return v.length > 0
      return v !== undefined && v !== null && v !== ''
    })
}

// ---------------------------------------------------------------------------
// Interface en anglais
// ---------------------------------------------------------------------------

/**
 * La langue est fixée au chargement : les libellés sont remplacés une fois,
 * avant tout usage, sans toucher aux valeurs qui portent le raisonnement.
 */
function applyEnglish() {
  const en = EN_QUESTIONNAIRE as unknown as {
    sections: Record<string, [string, string]>
    sectors: Record<string, string>
    size: Record<string, string>
    digital: Record<string, string>
    fin: Record<string, string>
    yesNo: Record<string, string>
    questions: Record<string, { basis?: string; question?: string; help?: string; options?: Record<string, [string, string?]> }>
  }
  for (const s of SECTORS) s.label = en.sectors[s.value] ?? s.label
  for (const t of SIZE_INDEPENDENT_TYPES) t.label = en.size[t.value] ?? t.label
  for (const t of DIGITAL_PROVIDER_TYPES) t.label = en.digital[t.value] ?? t.label
  for (const t of FINANCIAL_TYPES) t.label = en.fin[t.value] ?? t.label
  for (const s of QUESTION_SECTIONS) {
    const t = en.sections[s.id]
    if (t) [s.label, s.hint] = t
  }
  // Listes de référence dont les options sont des copies : secteurs et types hors taille.
  const listFor: Record<string, Record<string, string>> = { secteur: en.sectors, type_taille_independante: en.size }
  for (const q of QUESTIONS) {
    const t = en.questions[q.id]
    q.sectionLabel = en.sections[q.section]?.[0] ?? q.sectionLabel
    if (!t) continue
    if (t.basis) q.basis = t.basis
    if (t.question) q.question = t.question
    if (t.help) q.help = t.help
    for (const o of q.options ?? []) {
      const own = t.options?.[o.value]
      if (own) {
        o.label = own[0]
        if (own[1]) o.hint = own[1]
      } else if (listFor[q.id]?.[o.value]) o.label = listFor[q.id][o.value]
      else if (en.yesNo[o.value] && (o.label === 'Oui' || o.label === 'Non')) o.label = en.yesNo[o.value]
    }
  }
}

if (LANG === 'en') applyEnglish()
