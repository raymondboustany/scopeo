import type { TimelineEvent } from '@/types/domain'
import { LANG } from '@/i18n'
import EN from '@/i18n/en/timeline.json'

/**
 * Échéancier réglementaire.
 *
 * Mélange délibérément trois natures de jalons : les dates acquises, qui
 * situent l'entité dans le temps réglementaire ; les échéances qui pèsent sur
 * les États membres, parce qu'un retard de transposition déplace la charge
 * sans la supprimer ; et les échéances récurrentes, qui structurent le plan
 * de charge annuel.
 *
 * Arrêté au 24 septembre 2026.
 */
const TIMELINE_FR: TimelineEvent[] = [
  {
    id: 'TL-RGPD-APP',
    date: '2018-05-25',
    regulation: 'RGPD',
    title: "Application du RGPD",
    detail: "Le règlement devient applicable dans l'ensemble de l'Union, sans mesure de transposition.",
    kind: 'application',
  },
  {
    id: 'TL-PUB-333',
    date: '2022-12-27',
    regulation: 'TRANSVERSE',
    title: "Publication de NIS2 et de DORA",
    detail:
      "Les deux textes paraissent le même jour au Journal officiel L 333. Cette simultanéité n'est pas fortuite : ils forment un dispositif articulé, où DORA est la lex specialis financière de NIS2.",
    kind: 'acte',
  },
  {
    id: 'TL-NIS2-VIG',
    date: '2023-01-16',
    regulation: 'NIS2',
    title: "Entrée en vigueur de NIS2",
    detail: "Vingtième jour suivant la publication. Le délai de transposition de vingt et un mois commence à courir.",
    kind: 'acte',
  },
  {
    id: 'TL-DORA-RTS1',
    date: '2024-03-13',
    regulation: 'DORA',
    title: "Premier paquet de normes techniques DORA",
    detail:
      "Règlements délégués 2024/1774 (cadre de gestion du risque TIC) et 2024/1772 (classification des incidents). Ce sont eux qui rendent les articles 15 et 18 opérationnels.",
    kind: 'acte',
  },
  {
    id: 'TL-NIS2-TRANSPO',
    date: '2024-10-17',
    regulation: 'NIS2',
    title: "Échéance de transposition de NIS2",
    detail:
      "Date limite pour l'adoption des dispositions nationales. La France ne l'a pas respectée : au 22 septembre 2026, le projet de loi résilience n'est toujours pas promulgué.",
    kind: 'transposition',
  },
  {
    id: 'TL-NIS2-EXEC',
    date: '2024-11-07',
    regulation: 'NIS2',
    title: "Entrée en vigueur du règlement d'exécution (UE) 2024/2690",
    detail:
      "Exigences techniques chiffrées et critères d'incident important pour les fournisseurs numériques : DNS, registres de noms de domaine, informatique en nuage, centres de données, réseaux de diffusion de contenu, services gérés et de sécurité gérés, places de marché, moteurs de recherche, réseaux sociaux, services de confiance. Pour ces acteurs, l'appréciation au cas par cas cède devant des seuils.",
    kind: 'acte',
    appliesWhen: [{ key: 'services_ict', op: 'eq', value: 'oui', label: 'Fournisseur de services numériques' }],
  },
  {
    id: 'TL-DORA-ITS-REG',
    date: '2024-11-29',
    regulation: 'DORA',
    title: "Modèles du registre d'information, règlement d'exécution (UE) 2024/2956",
    detail: "Quinze modèles de tableaux liés par des identifiants, fixant la structure exacte du registre à remettre annuellement.",
    kind: 'acte',
  },
  {
    id: 'TL-DORA-APP',
    date: '2025-01-17',
    regulation: 'DORA',
    title: "Application de DORA",
    detail:
      "Le règlement devient applicable aux entités financières. Aucune période transitoire n'a été accordée : les obligations sont exigibles en totalité dès cette date.",
    kind: 'application',
  },
  {
    id: 'TL-NIS2-A27',
    date: '2025-01-17',
    regulation: 'NIS2',
    title: "Transmission des informations d'identification (article 27)",
    detail:
      "Échéance à laquelle les fournisseurs numériques devaient transmettre leurs informations d'identification aux autorités compétentes, en vue du registre tenu par l'ENISA.",
    kind: 'echeance',
    appliesWhen: [{ key: 'services_ict', op: 'eq', value: 'oui', label: 'Fournisseur de services numériques' }],
  },
  {
    id: 'TL-NIS2-LISTE',
    date: '2025-04-17',
    regulation: 'NIS2',
    title: "Établissement des listes nationales d'entités essentielles et importantes",
    detail:
      "Date à laquelle les États membres devaient avoir établi la liste de leurs entités essentielles et importantes, puis la réexaminer au moins tous les deux ans.",
    kind: 'transposition',
  },
  {
    id: 'TL-ENISA-GUIDE',
    date: '2025-06-26',
    regulation: 'NIS2',
    title: "Guide de mise en œuvre technique de l'ENISA",
    detail:
      "Cent soixante-dix pages traduisant le règlement d'exécution 2024/2690 en mesures opérationnelles et en exemples de preuves attendues. Référence de facto pour les contrôles.",
    kind: 'acte',
  },
  {
    id: 'TL-DORA-TLPT',
    date: '2025-07-08',
    regulation: 'DORA',
    title: "Entrée en vigueur des normes techniques sur les tests fondés sur la menace",
    detail: "Règlement délégué (UE) 2025/1190, aligné sur la méthodologie TIBER-EU.",
    kind: 'acte',
  },
  {
    id: 'TL-DORA-SOUSTRAIT',
    date: '2025-07-22',
    regulation: 'DORA',
    title: "Entrée en vigueur des normes techniques sur la sous-traitance",
    detail:
      "Règlement délégué (UE) 2025/532 : ce que l'entité financière doit établir avant d'autoriser une chaîne de sous-traitance : visibilité sur les sous-traitants ultérieurs, risque de concentration, localisation des données.",
    kind: 'acte',
  },
  {
    id: 'TL-DORA-CTPP',
    date: '2025-11-18',
    regulation: 'DORA',
    title: "Désignation des dix-neuf premiers prestataires tiers critiques",
    detail:
      "Les autorités européennes de surveillance placent pour la première fois des fournisseurs d'informatique en nuage, de centres de données, de télécommunications et de logiciels sous supervision européenne directe.",
    kind: 'surveillance',
  },
  {
    id: 'TL-OMNIBUS',
    date: '2025-11-19',
    regulation: 'TRANSVERSE',
    title: "Proposition du paquet Digital Omnibus",
    detail:
      "La Commission propose de modifier le RGPD, la directive vie privée et communications électroniques, NIS2 et DORA. Le volet « intelligence artificielle » a été adopté par le Conseil le 29 juin 2026 ; le volet « données » reste en négociation.",
    kind: 'projet',
  },
  {
    id: 'TL-EDPB-AVIS',
    date: '2026-02-11',
    regulation: 'RGPD',
    title: "Avis conjoint 2/2026 du CEPD et du contrôleur européen",
    detail:
      "Position officielle des autorités européennes de protection des données sur le Digital Omnibus. Marqueur du débat en cours sur la définition de la donnée personnelle et le régime du consentement.",
    kind: 'projet',
  },
  {
    id: 'TL-RECYF',
    date: '2026-03-17',
    regulation: 'NIS2',
    title: "Publication du ReCyF version 2.5",
    detail:
      "L'ANSSI publie le Référentiel Cyber France : vingt objectifs de sécurité et cent cinquante-deux moyens acceptables de conformité, avec une applicabilité distincte pour les entités importantes et essentielles. Document de travail, mais c'est aujourd'hui la grille de lecture la plus opérationnelle de NIS2 en France.",
    kind: 'acte',
  },
  {
    id: 'TL-DORA-SUPERV',
    date: '2026-01-01',
    regulation: 'DORA',
    title: "Entrée en fonction des superviseurs principaux",
    detail:
      "Chaque prestataire tiers critique se voit affecter un superviseur principal, assisté d'équipes d'examen conjointes, qui conduit les évaluations de risque et arrête les plans de surveillance annuels et pluriannuels.",
    kind: 'surveillance',
  },
  {
    id: 'TL-CRA-PUB',
    date: '2024-12-10',
    regulation: 'CRA',
    title: "Entrée en vigueur du CRA",
    detail: "Le règlement (UE) 2024/2847 entre en vigueur vingt jours après sa publication. Il s'applique ensuite par paliers, jusqu'au 11 décembre 2027.",
    kind: 'acte',
  },
  {
    id: 'TL-CRA-DESC',
    date: '2025-11-29',
    regulation: 'CRA',
    title: "Description technique des produits importants et critiques",
    detail: "Entrée en vigueur du règlement d'exécution (UE) 2025/2392, qui précise les vingt-huit catégories des annexes III et IV. C'est lui qui détermine, produit par produit, si l'autoévaluation suffit ou si un tiers doit intervenir.",
    kind: 'acte',
  },
  {
    id: 'TL-CRA-ONEC',
    date: '2026-06-11',
    regulation: 'CRA',
    title: "Organismes d'évaluation de la conformité",
    detail: "Le chapitre IV devient applicable : les États membres notifient les organismes habilités à évaluer la conformité des produits. En France, l'ANSSI est l'autorité notifiante.",
    kind: 'application',
  },
  {
    id: 'TL-CRA-ART14',
    date: '2026-09-11',
    regulation: 'CRA',
    title: "Obligations de signalement du CRA",
    detail: "L'article 14 s'applique : tout fabricant notifie les vulnérabilités activement exploitées et les incidents graves via la plateforme unique de l'ENISA, avec une alerte sous 24 heures et une notification sous 72 heures. L'obligation vaut aussi pour les produits déjà sur le marché.",
    kind: 'application',
    appliesWhen: [{ key: 'cra_roles', op: 'has', value: ['fabricant'], label: 'Fabricant de produits numériques' }],
  },
  {
    id: 'TL-FR-AN',
    date: '2026-10-07',
    regulation: 'NIS2',
    title: "Examen du projet de loi résilience à l'Assemblée nationale",
    detail: "La conférence des présidents du 22 septembre 2026 a inscrit le texte transposant NIS2 à l'ordre du jour de la séance publique à partir du 7 octobre. C'est le premier signal concret d'un calendrier de mise en conformité exigible en France.",
    kind: 'transposition',
  },
  {
    id: 'TL-CRA-FULL',
    date: '2027-12-11',
    regulation: 'CRA',
    title: "Application intégrale du CRA",
    detail: "Exigences essentielles, évaluation de la conformité, marquage CE et obligations des importateurs et distributeurs deviennent exigibles. Un produit non conforme ne peut plus être mis sur le marché de l'Union.",
    kind: 'application',
  },
  {
    id: 'TL-FR-LOI',
    date: '2026-12-31',
    regulation: 'TRANSVERSE',
    title: "Promulgation attendue de la loi résilience",
    detail:
      "Le projet de loi relatif à la résilience des infrastructures critiques et au renforcement de la cybersécurité transpose NIS2 et la directive d'accompagnement de DORA. Après l'examen en séance publique ouvert le 7 octobre, suivront la navette, les décrets d'application et le ReCyF définitif. Date indicative.",
    kind: 'projet',
  },
  {
    id: 'TL-NIS2-REEXAM',
    date: '2027-04-17',
    regulation: 'NIS2',
    title: "Premier réexamen biennal des listes nationales",
    detail: "Les États membres réexaminent et mettent à jour la liste des entités essentielles et importantes, au moins tous les deux ans.",
    kind: 'echeance',
  },
  {
    id: 'TL-AI-VIG',
    date: '2024-08-01',
    regulation: 'AIACT',
    title: "Entrée en vigueur de l'AI Act",
    detail: "Le règlement (UE) 2024/1689 entre en vigueur vingt jours après sa publication au Journal officiel du 12 juillet 2024. Son application s'échelonne ensuite par paliers.",
    kind: 'acte',
  },
  {
    id: 'TL-AI-INTERDIT',
    date: '2025-02-02',
    regulation: 'AIACT',
    title: "Pratiques interdites et maîtrise de l'IA",
    detail: "Les chapitres I et II s'appliquent : les pratiques de l'article 5 sont interdites et les fournisseurs comme les déployeurs doivent développer la maîtrise de l'IA de leur personnel.",
    kind: 'application',
  },
  {
    id: 'TL-AI-GPAI',
    date: '2025-08-02',
    regulation: 'AIACT',
    title: "Modèles d'IA à usage général et gouvernance",
    detail: "Les obligations des fournisseurs de modèles d'IA à usage général, la gouvernance européenne et le régime des sanctions deviennent applicables.",
    kind: 'application',
  },
  {
    id: 'TL-AI-OMNIBUS',
    date: '2026-07-27',
    regulation: 'AIACT',
    title: "Entrée en vigueur de l'Omnibus IA",
    detail: "Le règlement (UE) 2026/1744 reporte les obligations des systèmes à haut risque, assouplit l'obligation de maîtrise de l'IA et étend les allègements des PME aux petites entreprises à moyenne capitalisation.",
    kind: 'acte',
  },
  {
    id: 'TL-AI-APP',
    date: '2026-08-02',
    regulation: 'AIACT',
    title: "Application générale de l'AI Act",
    detail: "Le règlement devient applicable, notamment les obligations de transparence de l'article 50 : information sur l'interaction avec une IA, marquage des contenus générés, signalement des hypertrucages.",
    kind: 'application',
    appliesWhen: [{ key: 'ia_roles', op: 'has', value: ['fournisseur', 'deployeur', 'importateur'], label: "Fournisseur ou déployeur de systèmes d'IA" }],
  },
  {
    id: 'TL-AI-OMNI-DEC',
    date: '2026-12-02',
    regulation: 'AIACT',
    title: 'Nouvelle interdiction et fin du délai de marquage',
    detail: "Interdiction des systèmes générant des contenus pédopornographiques ou intimes non consentis, et fin du délai accordé aux systèmes déjà sur le marché pour marquer les contenus qu'ils génèrent.",
    kind: 'echeance',
    appliesWhen: [{ key: 'ia_roles', op: 'has', value: ['fournisseur', 'deployeur', 'importateur'], label: "Fournisseur ou déployeur de systèmes d'IA" }],
  },
  {
    id: 'TL-AI-HR3',
    date: '2027-12-02',
    regulation: 'AIACT',
    title: "Systèmes d'IA à haut risque de l'annexe III",
    detail: "Date reportée par l'Omnibus IA : gestion des risques, gouvernance des données, documentation technique, contrôle humain, évaluation de la conformité et obligations des déployeurs deviennent exigibles pour les domaines de l'annexe III.",
    kind: 'application',
    appliesWhen: [{ key: 'ia_haut_risque', op: 'has', value: ['biometrie', 'infrastructures', 'education', 'emploi', 'services_essentiels', 'autorites'], label: "Système relevant de l'annexe III" }],
  },
  {
    id: 'TL-AI-HR1',
    date: '2028-08-02',
    regulation: 'AIACT',
    title: "Systèmes d'IA à haut risque de l'annexe I",
    detail: "Date reportée par l'Omnibus IA pour les systèmes d'IA composants de sécurité de produits couverts par la législation d'harmonisation de l'annexe I : machines, jouets, dispositifs médicaux, ascenseurs.",
    kind: 'application',
    appliesWhen: [{ key: 'ia_haut_risque', op: 'has', value: ['produit'], label: "Composant de sécurité d'un produit réglementé" }],
  },
]

/** Échéances récurrentes, sans date fixe, qui structurent le plan de charge annuel. */
const DUTIES_FR = [
  {
    id: 'DUTY-DORA-REGISTRE',
    regulation: 'DORA' as const,
    title: "Remise du registre d'information",
    cadence: 'Annuelle',
    detail: "Le registre de tous les accords contractuels TIC est remis à l'autorité compétente au moins une fois par an, aux modèles du règlement d'exécution 2024/2956.",
    basis: 'Article 28, paragraphe 3',
  },
  {
    id: 'DUTY-DORA-TESTS',
    regulation: 'DORA' as const,
    title: 'Tests des systèmes supportant des fonctions critiques',
    cadence: 'Annuelle',
    detail: "Tous les systèmes TIC soutenant des fonctions critiques ou importantes sont testés au moins une fois par an.",
    basis: 'Article 24, paragraphe 6',
  },
  {
    id: 'DUTY-DORA-TLPT',
    regulation: 'DORA' as const,
    title: 'Test de pénétration fondé sur la menace',
    cadence: 'Triennale',
    detail: "Les entités identifiées par l'autorité effectuent un test avancé au moins tous les trois ans, sur un périmètre validé en amont et attesté en aval.",
    basis: 'Article 26, paragraphe 1',
  },
  {
    id: 'DUTY-DORA-CADRE',
    regulation: 'DORA' as const,
    title: 'Réexamen du cadre de gestion du risque TIC',
    cadence: 'Annuelle, et après chaque incident majeur',
    detail: "Le cadre est réexaminé au moins annuellement, après chaque incident majeur, et à la suite des recommandations issues des audits et du contrôle prudentiel.",
    basis: 'Article 6, paragraphe 5',
  },
  {
    id: 'DUTY-NIS2-PSSI',
    regulation: 'NIS2' as const,
    title: "Revue de la politique de sécurité et de la liste des systèmes",
    cadence: 'Annuelle',
    detail: "Le ReCyF impose une revue annuelle de la politique de sécurité (2.B.4) et une validation annuelle du recensement des activités et systèmes (1.3).",
    basis: 'ReCyF 1.3-EI/EE et 2.B.4-EI/EE',
  },
  {
    id: 'DUTY-NIS2-HABILIT',
    regulation: 'NIS2' as const,
    title: "Revue des comptes, des droits d'accès et des règles de filtrage",
    cadence: 'Annuelle',
    detail: "Le ReCyF impose une revue annuelle des comptes (10.A.6), des droits d'accès (10.C.4), des règles de filtrage (7.B.5) et, pour les entités essentielles, de la configuration des annuaires et des ressources (11.B.6, 18.4).",
    basis: 'ReCyF, objectifs 7, 10, 11 et 18',
  },
  {
    id: 'DUTY-NIS2-SAUV',
    regulation: 'NIS2' as const,
    title: 'Test des sauvegardes et des restaurations',
    cadence: 'Annuelle',
    detail: "Les processus de sauvegarde et de restauration sont testés au minimum une fois par an, afin de vérifier la bonne réalisation des sauvegardes et leur restauration effective.",
    basis: 'ReCyF 13.2-EI/EE',
  },
  {
    id: 'DUTY-NIS2-RISQUE',
    regulation: 'NIS2' as const,
    title: "Réexamen de l'analyse de risques",
    cadence: 'Triennale, et en cas d\'incident',
    detail: "Les entités essentielles réexaminent leur analyse de risques au minimum tous les trois ans, et en cas d'incident ou d'évolution majeure du contexte.",
    basis: 'ReCyF 16.4-EE',
  },
  {
    id: 'DUTY-NIS2-EXERCICE',
    regulation: 'NIS2' as const,
    title: "Programme d'entraînement et d'exercices",
    cadence: 'Programme triennal',
    detail: "Les entités essentielles déclinent leur stratégie d'entraînement dans un programme triennal précisant fréquence, nature et objectifs des exercices.",
    basis: 'ReCyF 15.4-EE',
  },
  {
    id: 'DUTY-RGPD-REGISTRE',
    regulation: 'RGPD' as const,
    title: 'Mise à jour du registre des traitements',
    cadence: 'Continue',
    detail: "Le registre est tenu à jour en permanence et mis à disposition de l'autorité de contrôle sur demande.",
    basis: 'Article 30',
  },
  {
    id: 'DUTY-CRA-SUPPORT',
    regulation: 'CRA' as const,
    title: "Suivi des périodes d'assistance",
    cadence: 'Continue',
    detail: "Chaque produit reçoit des mises à jour de sécurité pendant sa période d'assistance, d'au moins cinq ans, et la date de fin est affichée au moment de l'achat.",
    basis: 'Article 13, paragraphes 8 et 19',
  },
  {
    id: 'DUTY-AI-INVENTAIRE',
    regulation: 'AIACT' as const,
    title: "Revue de l'inventaire et de la classification des systèmes d'IA",
    cadence: "À chaque nouveau cas d'usage",
    detail: "Chaque nouveau système, modification substantielle ou changement de destination déclenche une revue de la classification et des pratiques interdites.",
    basis: 'Articles 5, 6 et 25',
  },
  {
    id: 'DUTY-AI-JOURNAUX',
    regulation: 'AIACT' as const,
    title: 'Conservation des journaux des systèmes à haut risque',
    cadence: 'Continue',
    detail: "Les journaux générés automatiquement sont conservés au moins six mois par le fournisseur et par le déployeur, pour la partie sous leur contrôle.",
    basis: 'Articles 19 et 26, paragraphe 6',
  },
]

const EVENTS_EN = EN.events as Record<string, string[]>
const DUTIES_EN = EN.duties as Record<string, string[]>

export const TIMELINE: TimelineEvent[] =
  LANG === 'en'
    ? TIMELINE_FR.map((e) => {
        const x = EVENTS_EN[e.id]
        if (!x) return e
        return {
          ...e,
          title: x[0],
          detail: x[1],
          appliesWhen: e.appliesWhen?.map((c) => ({ ...c, label: x[2] ?? c.label })),
        }
      })
    : TIMELINE_FR

export const RECURRING_DUTIES =
  LANG === 'en'
    ? DUTIES_FR.map((d) => {
        const x = DUTIES_EN[d.id]
        return x ? { ...d, title: x[0], cadence: x[1], detail: x[2], basis: x[3] } : d
      })
    : DUTIES_FR
