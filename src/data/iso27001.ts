import type { IsoControl, IsoThemeId, RegulationId } from '@/types/domain'
import { pick, tr } from '@/i18n'

/**
 * ISO/IEC 27001:2022, annexe A.
 *
 * Seuls les numéros et les intitulés des contrôles figurent ici, tels qu'ils
 * sont documentés publiquement par les sources professionnelles. Le texte
 * protégé de la norme (objectifs, mesures, recommandations de l'ISO/IEC 27002)
 * n'est pas reproduit.
 *
 * Les quatre thèmes : organisationnel (A.5, 37 contrôles), humain (A.6, 8),
 * physique (A.7, 14) et technologique (A.8, 34), soit 93 contrôles.
 */

const C = (id: string, theme: IsoThemeId, fr: string, en: string): IsoControl => ({ id, theme, title: pick(fr, en) })

export const ISO_CONTROLS: IsoControl[] = [
  // A.5 Organisationnel
  C('5.1', 'A5', "Politiques de sécurité de l'information", 'Policies for information security'),
  C('5.2', 'A5', "Fonctions et responsabilités liées à la sécurité de l'information", 'Information security roles and responsibilities'),
  C('5.3', 'A5', 'Séparation des tâches', 'Segregation of duties'),
  C('5.4', 'A5', 'Responsabilités de la direction', 'Management responsibilities'),
  C('5.5', 'A5', 'Contacts avec les autorités', 'Contact with authorities'),
  C('5.6', 'A5', "Contacts avec des groupes d'intérêt spécifiques", 'Contact with special interest groups'),
  C('5.7', 'A5', 'Renseignements sur les menaces', 'Threat intelligence'),
  C('5.8', 'A5', "Sécurité de l'information dans la gestion de projet", 'Information security in project management'),
  C('5.9', 'A5', 'Inventaire des informations et autres actifs associés', 'Inventory of information and other associated assets'),
  C('5.10', 'A5', 'Utilisation correcte des informations et autres actifs associés', 'Acceptable use of information and other associated assets'),
  C('5.11', 'A5', 'Restitution des actifs', 'Return of assets'),
  C('5.12', 'A5', 'Classification des informations', 'Classification of information'),
  C('5.13', 'A5', 'Marquage des informations', 'Labelling of information'),
  C('5.14', 'A5', 'Transfert des informations', 'Information transfer'),
  C('5.15', 'A5', "Contrôle d'accès", 'Access control'),
  C('5.16', 'A5', 'Gestion des identités', 'Identity management'),
  C('5.17', 'A5', "Informations d'authentification", 'Authentication information'),
  C('5.18', 'A5', "Droits d'accès", 'Access rights'),
  C('5.19', 'A5', "Sécurité de l'information dans les relations avec les fournisseurs", 'Information security in supplier relationships'),
  C('5.20', 'A5', "Sécurité de l'information dans les accords conclus avec les fournisseurs", 'Addressing information security within supplier agreements'),
  C('5.21', 'A5', "Gestion de la sécurité de l'information dans la chaîne d'approvisionnement TIC", 'Managing information security in the ICT supply chain'),
  C('5.22', 'A5', 'Surveillance, revue et gestion des changements des services fournisseurs', 'Monitoring, review and change management of supplier services'),
  C('5.23', 'A5', "Sécurité de l'information dans l'utilisation de services en nuage", 'Information security for use of cloud services'),
  C('5.24', 'A5', "Planification et préparation de la gestion des incidents de sécurité de l'information", 'Information security incident management planning and preparation'),
  C('5.25', 'A5', "Évaluation des événements de sécurité de l'information et prise de décision", 'Assessment and decision on information security events'),
  C('5.26', 'A5', "Réponse aux incidents de sécurité de l'information", 'Response to information security incidents'),
  C('5.27', 'A5', "Enseignements tirés des incidents de sécurité de l'information", 'Learning from information security incidents'),
  C('5.28', 'A5', 'Collecte des preuves', 'Collection of evidence'),
  C('5.29', 'A5', "Sécurité de l'information durant une perturbation", 'Information security during disruption'),
  C('5.30', 'A5', "Préparation des TIC pour la continuité d'activité", 'ICT readiness for business continuity'),
  C('5.31', 'A5', 'Exigences légales, statutaires, réglementaires et contractuelles', 'Legal, statutory, regulatory and contractual requirements'),
  C('5.32', 'A5', 'Droits de propriété intellectuelle', 'Intellectual property rights'),
  C('5.33', 'A5', 'Protection des enregistrements', 'Protection of records'),
  C('5.34', 'A5', 'Vie privée et protection des données à caractère personnel', 'Privacy and protection of personal data'),
  C('5.35', 'A5', "Revue indépendante de la sécurité de l'information", 'Independent review of information security'),
  C('5.36', 'A5', "Conformité aux politiques, règles et normes de sécurité de l'information", 'Compliance with policies, rules and standards for information security'),
  C('5.37', 'A5', "Procédures d'exploitation documentées", 'Documented operating procedures'),
  // A.6 Humain
  C('6.1', 'A6', 'Sélection des candidats', 'Screening'),
  C('6.2', 'A6', 'Termes et conditions du contrat de travail', 'Terms and conditions of employment'),
  C('6.3', 'A6', "Sensibilisation, enseignement et formation à la sécurité de l'information", 'Information security awareness, education and training'),
  C('6.4', 'A6', 'Processus disciplinaire', 'Disciplinary process'),
  C('6.5', 'A6', 'Responsabilités après la fin ou la modification du contrat de travail', 'Responsibilities after termination or change of employment'),
  C('6.6', 'A6', 'Accords de confidentialité ou de non-divulgation', 'Confidentiality or non-disclosure agreements'),
  C('6.7', 'A6', 'Travail à distance', 'Remote working'),
  C('6.8', 'A6', "Déclaration des événements de sécurité de l'information", 'Information security event reporting'),
  // A.7 Physique
  C('7.1', 'A7', 'Périmètres de sécurité physique', 'Physical security perimeters'),
  C('7.2', 'A7', 'Entrées physiques', 'Physical entry'),
  C('7.3', 'A7', 'Sécurisation des bureaux, des salles et des installations', 'Securing offices, rooms and facilities'),
  C('7.4', 'A7', 'Surveillance de la sécurité physique', 'Physical security monitoring'),
  C('7.5', 'A7', 'Protection contre les menaces physiques et environnementales', 'Protecting against physical and environmental threats'),
  C('7.6', 'A7', 'Travail dans les zones sécurisées', 'Working in secure areas'),
  C('7.7', 'A7', 'Bureau propre et écran vide', 'Clear desk and clear screen'),
  C('7.8', 'A7', 'Emplacement et protection du matériel', 'Equipment siting and protection'),
  C('7.9', 'A7', 'Sécurité des actifs hors des locaux', 'Security of assets off-premises'),
  C('7.10', 'A7', 'Supports de stockage', 'Storage media'),
  C('7.11', 'A7', 'Services support', 'Supporting utilities'),
  C('7.12', 'A7', 'Sécurité du câblage', 'Cabling security'),
  C('7.13', 'A7', 'Maintenance du matériel', 'Equipment maintenance'),
  C('7.14', 'A7', 'Élimination ou recyclage sécurisé du matériel', 'Secure disposal or re-use of equipment'),
  // A.8 Technologique
  C('8.1', 'A8', 'Terminaux des utilisateurs', 'User endpoint devices'),
  C('8.2', 'A8', "Droits d'accès privilégiés", 'Privileged access rights'),
  C('8.3', 'A8', "Restriction de l'accès aux informations", 'Information access restriction'),
  C('8.4', 'A8', 'Accès au code source', 'Access to source code'),
  C('8.5', 'A8', 'Authentification sécurisée', 'Secure authentication'),
  C('8.6', 'A8', 'Dimensionnement', 'Capacity management'),
  C('8.7', 'A8', 'Protection contre les logiciels malveillants', 'Protection against malware'),
  C('8.8', 'A8', 'Gestion des vulnérabilités techniques', 'Management of technical vulnerabilities'),
  C('8.9', 'A8', 'Gestion des configurations', 'Configuration management'),
  C('8.10', 'A8', 'Suppression des informations', 'Information deletion'),
  C('8.11', 'A8', 'Masquage des données', 'Data masking'),
  C('8.12', 'A8', 'Prévention de la fuite de données', 'Data leakage prevention'),
  C('8.13', 'A8', 'Sauvegarde des informations', 'Information backup'),
  C('8.14', 'A8', "Redondance des moyens de traitement de l'information", 'Redundancy of information processing facilities'),
  C('8.15', 'A8', 'Journalisation', 'Logging'),
  C('8.16', 'A8', 'Activités de surveillance', 'Monitoring activities'),
  C('8.17', 'A8', 'Synchronisation des horloges', 'Clock synchronisation'),
  C('8.18', 'A8', 'Utilisation de programmes utilitaires à privilèges', 'Use of privileged utility programs'),
  C('8.19', 'A8', 'Installation de logiciels sur des systèmes en exploitation', 'Installation of software on operational systems'),
  C('8.20', 'A8', 'Sécurité des réseaux', 'Networks security'),
  C('8.21', 'A8', 'Sécurité des services réseau', 'Security of network services'),
  C('8.22', 'A8', 'Cloisonnement des réseaux', 'Segregation of networks'),
  C('8.23', 'A8', 'Filtrage web', 'Web filtering'),
  C('8.24', 'A8', 'Utilisation de la cryptographie', 'Use of cryptography'),
  C('8.25', 'A8', 'Cycle de vie de développement sécurisé', 'Secure development life cycle'),
  C('8.26', 'A8', 'Exigences de sécurité des applications', 'Application security requirements'),
  C('8.27', 'A8', "Principes d'ingénierie et d'architecture des systèmes sécurisés", 'Secure system architecture and engineering principles'),
  C('8.28', 'A8', 'Codage sécurisé', 'Secure coding'),
  C('8.29', 'A8', "Tests de sécurité dans le développement et l'acceptation", 'Security testing in development and acceptance'),
  C('8.30', 'A8', 'Développement externalisé', 'Outsourced development'),
  C('8.31', 'A8', 'Séparation des environnements de développement, de test et de production', 'Separation of development, test and production environments'),
  C('8.32', 'A8', 'Gestion des changements', 'Change management'),
  C('8.33', 'A8', 'Informations de test', 'Test information'),
  C('8.34', 'A8', "Protection des systèmes d'information pendant les tests d'audit", 'Protection of information systems during audit testing'),
]

export const ISO_CONTROL_BY_ID = new Map(ISO_CONTROLS.map((c) => [c.id, c]))

export const ISO_THEME_META: Record<IsoThemeId, { code: string; label: string; count: number }> = {
  A5: { code: 'A.5', label: tr('Organisationnel', 'Organisational'), count: 37 },
  A6: { code: 'A.6', label: tr('Humain', 'People'), count: 8 },
  A7: { code: 'A.7', label: tr('Physique', 'Physical'), count: 14 },
  A8: { code: 'A.8', label: tr('Technologique', 'Technological'), count: 34 },
}

/**
 * Clauses du système de management (4 à 10). Elles ne font pas partie de
 * l'annexe A mais conditionnent toute certification : leur état se déduit du
 * statut déclaré de la démarche, sans saisie contrôle par contrôle.
 */
export const ISO_CLAUSES: { id: string; title: string }[] = [
  { id: 'C6.1', title: tr('Clause 6.1 : appréciation et traitement des risques', 'Clause 6.1: risk assessment and treatment') },
  { id: 'C7.2', title: tr('Clause 7.2 : compétences', 'Clause 7.2: competence') },
  { id: 'C7.5', title: tr('Clause 7.5 : informations documentées', 'Clause 7.5: documented information') },
  { id: 'C9.2', title: tr('Clause 9.2 : audit interne', 'Clause 9.2: internal audit') },
]

export const ISO_CLAUSE_BY_ID = new Map(ISO_CLAUSES.map((c) => [c.id, c]))

// ---------------------------------------------------------------------------
// Table de correspondance
// ---------------------------------------------------------------------------

/**
 * Correspondance entre les exigences unifiées de Scopeo et les contrôles
 * ISO/IEC 27001.
 *
 * Deux niveaux de confiance :
 *   établie   : la correspondance est reconnue (équivalence ANSSI pour les
 *               objectifs 2 et 16 du ReCyF, tables publiées par l'ENISA pour
 *               le règlement d'exécution 2024/2690, pratique d'audit courante) ;
 *               elle alimente le pré-remplissage ;
 *   à valider : le lien existe mais son étendue relève d'une appréciation
 *               d'expert. Elle est affichée comme piste, jamais utilisée pour
 *               pré-remplir.
 *
 * Un plafond limite le pré-remplissage à « partiel » lorsqu'un texte
 * applicable exige plus que ce que les contrôles ISO couvrent.
 */
export interface IsoThemeMapping {
  themeId: string
  controls: string[]
  confidence: 'etablie' | 'a_valider'
  /** Plafond « partiel » lorsque l'un de ces textes est applicable. */
  capWhen?: RegulationId[]
  /** Plafond « partiel » lorsque l'une de ces obligations est dans le périmètre. */
  capWhenObligations?: string[]
  capReason?: string
  note?: string
}

export const ISO_MAPPING: IsoThemeMapping[] = [
  {
    themeId: 'GOV-02',
    controls: ['5.2', '5.5'],
    confidence: 'etablie',
    capWhen: ['RGPD', 'CRA'],
    capReason: tr(
      "L'indépendance du délégué à la protection des données et le point de contact utilisateurs du CRA ne relèvent pas d'ISO 27001.",
      "The independence of the data protection officer and the CRA user contact point are outside ISO 27001.",
    ),
  },
  {
    themeId: 'GOV-04',
    controls: ['6.3', 'C7.2'],
    confidence: 'etablie',
    capWhen: ['NIS2', 'DORA'],
    capReason: tr(
      "La formation obligatoire des membres de l'organe de direction (NIS2, DORA) n'est pas exigée en tant que telle par ISO 27001.",
      'Mandatory training of management body members (NIS2, DORA) is not required as such by ISO 27001.',
    ),
  },
  { themeId: 'RSK-01', controls: ['C6.1', '5.8'], confidence: 'etablie', note: tr('Équivalence reconnue par l\'ANSSI pour l\'objectif 16 du ReCyF.', 'Equivalence recognised by ANSSI for ReCyF objective 16.') },
  { themeId: 'PRO-01', controls: ['8.1', '8.7', '8.9', '8.20', '8.21', '8.22', '8.23'], confidence: 'etablie' },
  { themeId: 'PRO-02', controls: ['8.24'], confidence: 'etablie' },
  { themeId: 'PRO-03', controls: ['5.15', '5.16', '5.17', '5.18', '8.2', '8.3', '8.5'], confidence: 'etablie' },
  {
    themeId: 'PRO-04',
    controls: ['5.8', '8.25', '8.26', '8.27', '8.28', '8.29', '8.31', '8.32'],
    confidence: 'etablie',
    capWhen: ['CRA'],
    capReason: tr(
      "Les propriétés de sécurité exigées du produit par l'annexe I du CRA vont au-delà du processus de développement sécurisé d'ISO 27001.",
      "The product security properties required by CRA Annex I go beyond ISO 27001's secure development process.",
    ),
  },
  { themeId: 'PRO-05', controls: ['7.1', '7.2', '7.3', '7.4', '7.5', '7.8', '7.11', '7.12'], confidence: 'etablie' },
  { themeId: 'PRO-06', controls: ['6.1', '6.2', '6.4', '6.5', '6.6'], confidence: 'etablie' },
  { themeId: 'DET-01', controls: ['8.15', '8.17'], confidence: 'etablie' },
  { themeId: 'DET-02', controls: ['8.16', '5.7'], confidence: 'etablie' },
  {
    themeId: 'DET-03',
    controls: ['8.8'],
    confidence: 'etablie',
    capWhen: ['CRA'],
    capReason: tr(
      "La politique de divulgation coordonnée et la nomenclature logicielle exigées par le CRA dépassent la gestion des vulnérabilités techniques d'ISO 27001.",
      "The coordinated disclosure policy and software bill of materials required by the CRA go beyond ISO 27001's technical vulnerability management.",
    ),
  },
  { themeId: 'REP-01', controls: ['5.24', '5.25', '5.26', '5.27', '5.28', '6.8'], confidence: 'etablie' },
  { themeId: 'RES-01', controls: ['5.29', '5.30', '8.14'], confidence: 'etablie' },
  { themeId: 'RES-02', controls: ['5.24', '5.26', '5.29'], confidence: 'a_valider', note: tr('La gestion de crise relève surtout d\'ISO 22301.', 'Crisis management mostly falls under ISO 22301.') },
  { themeId: 'RES-03', controls: ['8.13'], confidence: 'etablie' },
  {
    themeId: 'RES-04',
    controls: ['5.35', '5.36', 'C9.2', '8.29'],
    confidence: 'etablie',
    capWhenObligations: ['DORA-A26'],
    capReason: tr(
      "Les tests de pénétration fondés sur la menace de DORA n'ont pas d'équivalent dans ISO 27001.",
      "DORA's threat-led penetration tests have no equivalent in ISO 27001.",
    ),
  },
  { themeId: 'RES-05', controls: ['8.8', '8.32'], confidence: 'a_valider', note: tr("La période d'assistance d'au moins cinq ans du CRA n'a pas d'équivalent.", 'The CRA minimum five-year support period has no equivalent.') },
  {
    themeId: 'TIE-01',
    controls: ['5.19', '5.20'],
    confidence: 'etablie',
    capWhen: ['DORA'],
    capReason: tr(
      "Les clauses contractuelles obligatoires de l'article 30 de DORA sont plus détaillées que les accords fournisseurs d'ISO 27001.",
      "The mandatory contractual clauses of DORA Article 30 are more detailed than ISO 27001 supplier agreements.",
    ),
  },
  {
    themeId: 'TIE-02',
    controls: ['5.19', '5.22'],
    confidence: 'etablie',
    capWhen: ['DORA'],
    capReason: tr(
      "Le registre d'information DORA, à quinze modèles normalisés, n'a pas d'équivalent dans ISO 27001.",
      'The DORA register of information, with fifteen standard templates, has no equivalent in ISO 27001.',
    ),
  },
  { themeId: 'TIE-03', controls: ['5.21', '5.22', '5.23'], confidence: 'etablie' },
  { themeId: 'TIE-04', controls: ['5.23', '5.30'], confidence: 'a_valider', note: tr('Le risque de concentration et la stratégie de sortie de DORA dépassent ISO 27001.', "DORA's concentration risk and exit strategy go beyond ISO 27001.") },
  { themeId: 'DON-03', controls: ['5.14', '5.34'], confidence: 'a_valider' },
  { themeId: 'DOC-01', controls: ['5.1', '5.37', 'C7.5'], confidence: 'etablie' },
  { themeId: 'DOC-02', controls: ['5.33'], confidence: 'a_valider' },
  { themeId: 'DOC-03', controls: ['5.9', '5.12'], confidence: 'etablie' },
]

export const ISO_MAPPING_BY_THEME = new Map(ISO_MAPPING.map((m) => [m.themeId, m]))

// ---------------------------------------------------------------------------
// Ce qu'ISO 27001 ne couvre pas par nature
// ---------------------------------------------------------------------------

export type IsoStructuralCategory = 'notification' | 'dirigeants' | 'tests_dora'

export const ISO_STRUCTURAL_LABEL: Record<IsoStructuralCategory, string> = {
  notification: tr('Délais de notification réglementaire', 'Regulatory notification deadlines'),
  dirigeants: tr('Responsabilité juridique personnelle des dirigeants', 'Personal legal liability of management'),
  tests_dora: tr('Tests de résilience opérationnelle avancés (DORA)', 'Advanced operational resilience testing (DORA)'),
}

/** Exigences unifiées structurellement hors du champ d'ISO 27001. */
export const ISO_STRUCTURAL_THEMES: Record<string, IsoStructuralCategory> = {
  'REP-02': 'notification',
  'REP-03': 'notification',
  'GOV-01': 'dirigeants',
}

/** Obligations structurellement hors du champ d'ISO 27001. */
export const ISO_STRUCTURAL_OBLIGATIONS: Record<string, IsoStructuralCategory> = {
  'RGPD-A33': 'notification',
  'RGPD-A34': 'notification',
  'NIS2-A3': 'notification',
  'NIS2-A23-1': 'notification',
  'NIS2-A23-2': 'notification',
  'NIS2-A23-4': 'notification',
  'DORA-A19': 'notification',
  'CRA-A14-VULN': 'notification',
  'CRA-A14-INC': 'notification',
  'CRA-A14-USERS': 'notification',
  'AIACT-A73': 'notification',
  'NIS2-A20': 'dirigeants',
  'DORA-A5': 'dirigeants',
  'DORA-A26': 'tests_dora',
}

/** Objectifs ReCyF pour lesquels l'ANSSI reconnaît une certification ISO 27001 en cours de validité. */
export const ISO_RECYF_EQUIVALENCE = [2, 16]

/** Référentiels pour lesquels le pré-remplissage est proposé. */
export const ISO_PREFILL_REGULATIONS: RegulationId[] = ['NIS2', 'DORA', 'CRA']
