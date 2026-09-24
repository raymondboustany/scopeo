import type { Regulation, RegulationId } from '@/types/domain'
import { LANG, LOCALE, tr } from '@/i18n'
import EN_REGULATIONS from '@/i18n/en/regulations.json'

/**
 * Régime juridique des cinq textes couverts.
 *
 * Toutes les dates, références et plafonds de sanction sont repris des textes
 * publiés au Journal officiel de l'Union européenne. L'état de transposition
 * française est arrêté au 24 septembre 2026.
 */

export const REGULATIONS: Record<RegulationId, Regulation> = {
  // -------------------------------------------------------------------------
  RGPD: {
    id: 'RGPD',
    shortName: 'RGPD',
    name: 'Règlement général sur la protection des données',
    reference: 'Règlement (UE) 2016/679',
    celex: '32016R0679',
    kind: 'reglement',
    purpose:
      "Protéger les personnes physiques à l'égard du traitement de leurs données à caractère personnel et encadrer la libre circulation de ces données.",
    scopeSummary:
      "Tout responsable de traitement ou sous-traitant établi dans l'Union, ainsi que tout acteur hors Union qui cible des personnes situées dans l'Union ou suit leur comportement (art. 3). Aucun seuil de taille : le texte s'applique dès le premier traitement.",
    adopted: '2016-04-27',
    entryIntoForce: '2016-05-24',
    application: '2018-05-25',
    officialJournal: 'JO L 119 du 4.5.2016, p. 1',
    eurLexUrl: 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32016R0679',
    euAuthorities: ['Comité européen de la protection des données (CEPD)', 'Contrôleur européen de la protection des données (CEPD-EDPS)'],
    frAuthorities: ['CNIL'],
    frenchStatus: {
      status: 'applicable_direct',
      label: "Applicable directement depuis le 25 mai 2018",
      note: "Complété en droit interne par la loi n° 78-17 du 6 janvier 1978 modifiée (loi Informatique et Libertés) et son décret d'application n° 2019-536.",
      url: 'https://www.cnil.fr/fr/reglement-europeen-protection-donnees',
    },
    sanctions: [
      {
        id: 'RGPD-T1',
        label: 'Premier palier : 10 M€ ou 2 % du CA mondial',
        turnoverPct: 2,
        capEur: 10_000_000,
        capRule: 'le_plus_eleve',
        basis: 'Article 83, paragraphe 4',
        note: "Manquements aux obligations du responsable et du sous-traitant (art. 8, 11, 25 à 39, 42 et 43), notamment sécurité, registre, analyse d'impact et désignation du délégué.",
      },
      {
        id: 'RGPD-T2',
        label: 'Second palier : 20 M€ ou 4 % du CA mondial',
        turnoverPct: 4,
        capEur: 20_000_000,
        capRule: 'le_plus_eleve',
        basis: 'Article 83, paragraphe 5',
        note: "Violations des principes de base, des droits des personnes et des règles de transfert hors Union. C'est le palier le plus lourd du droit européen des données.",
      },
    ],
    implementingActs: [
      {
        reference: 'Lignes directrices CEPD',
        title: "Corpus de lignes directrices du Comité européen de la protection des données (sécurité, violations, transferts, analyse d'impact)",
        kind: 'lignes_directrices',
        date: '2018-05-25',
        status: 'en_vigueur',
        url: 'https://www.edpb.europa.eu/our-work-tools/general-guidance/guidelines-recommendations-best-practices_fr',
        note: "Non contraignantes en droit, mais constituent la doctrine de référence des autorités de contrôle.",
      },
      {
        reference: 'Décision (UE) 2021/914',
        title: "Clauses contractuelles types pour le transfert de données vers des pays tiers",
        kind: 'reglement_execution',
        date: '2021-06-04',
        status: 'en_vigueur',
        url: 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32021D0914',
      },
      {
        reference: 'Digital Omnibus, COM(2025) 837',
        title: "Proposition de règlement modifiant le RGPD, la directive vie privée et communications électroniques, NIS2 et DORA",
        kind: 'reglement_execution',
        date: '2025-11-19',
        status: 'projet',
        url: 'https://www.europarl.europa.eu/legislative-train/theme-a-new-plan-for-europe-s-sustainable-prosperity-and-competitiveness/file-digital-package',
        note: "Volet « données » toujours en négociation au 22 septembre 2026. Le CEPD et le CEPD-EDPS ont rendu l'avis conjoint 2/2026 le 11 février 2026. À surveiller : définition de la donnée personnelle, régime des cookies, base juridique de l'intérêt légitime.",
      },
    ],
    articleCount: 99,
  },

  // -------------------------------------------------------------------------
  NIS2: {
    id: 'NIS2',
    shortName: 'NIS2 (ReCyF)',
    framework: {
      name: 'ReCyF',
      version: '2.5',
      date: '2026-03-17',
      issuer: 'ANSSI',
      note: "Les exigences NIS2 sont détaillées et structurées par le Référentiel Cyber France (ReCyF) de l'ANSSI, qui traduit les objectifs de la directive en mesures actionnables pour les entités françaises. Document de travail, susceptible d'évoluer avant la publication du décret d'application.",
    },
    name: 'Directive sur un niveau élevé commun de cybersécurité dans l\'Union',
    reference: 'Directive (UE) 2022/2555',
    celex: '32022L2555',
    kind: 'directive',
    purpose:
      "Relever le niveau de cybersécurité des entités qui soutiennent des activités critiques pour l'économie et la société, et organiser la coopération entre États membres.",
    scopeSummary:
      "Entités des secteurs de l'annexe I (hautement critiques) et de l'annexe II (critiques) atteignant au moins la taille d'une moyenne entreprise : 50 salariés, ou 10 M€ de chiffre d'affaires et de bilan (art. 2 et 3). Certaines entités sont visées quelle que soit leur taille, notamment les fournisseurs de services DNS, les registres de noms de domaine, les prestataires de services de confiance et les fournisseurs de réseaux de communications électroniques publics.",
    adopted: '2022-12-14',
    entryIntoForce: '2023-01-16',
    application: '2024-10-18',
    transpositionDeadline: '2024-10-17',
    officialJournal: 'JO L 333 du 27.12.2022, p. 80',
    eurLexUrl: 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32022L2555',
    euAuthorities: ['ENISA', 'Groupe de coopération NIS', 'Réseau des CSIRT'],
    frAuthorities: ['ANSSI'],
    frenchStatus: {
      status: 'en_cours',
      label: "Non transposée au 24 septembre 2026",
      note: "Le projet de loi relatif à la résilience des infrastructures critiques et au renforcement de la cybersécurité, déposé au Sénat le 15 octobre 2024, y a été adopté en première lecture le 12 mars 2025, puis adopté en commission spéciale à l'Assemblée nationale le 10 septembre 2025. La conférence des présidents du 22 septembre 2026 a inscrit l'examen en séance publique à partir du 7 octobre 2026. La France reste en retard de transposition ; l'ANSSI a toutefois publié le ReCyF, qui fixe les objectifs de sécurité attendus.",
      url: 'https://www.legifrance.gouv.fr/dossierlegislatif/JORFDOLE000050320631/',
    },
    sanctions: [
      {
        id: 'NIS2-EE',
        label: 'Entité essentielle : 10 M€ ou 2 % du CA mondial',
        turnoverPct: 2,
        capEur: 10_000_000,
        capRule: 'le_plus_eleve',
        basis: 'Article 34, paragraphe 4',
        note: "Plafond minimal que les États membres doivent prévoir pour les violations des articles 21 et 23. Le droit national peut aller au-delà.",
      },
      {
        id: 'NIS2-EI',
        label: 'Entité importante : 7 M€ ou 1,4 % du CA mondial',
        turnoverPct: 1.4,
        capEur: 7_000_000,
        capRule: 'le_plus_eleve',
        basis: 'Article 34, paragraphe 5',
        note: "Plafond minimal applicable aux entités importantes pour les mêmes manquements.",
      },
      {
        id: 'NIS2-DIR',
        label: 'Responsabilité des organes de direction',
        basis: 'Articles 20 et 32, paragraphe 6',
        note: "Au-delà de l'amende, l'autorité peut suspendre temporairement une certification ou interdire à une personne physique exerçant des responsabilités dirigeantes d'exercer ces fonctions. Cette sanction ne vise que les entités essentielles.",
      },
    ],
    implementingActs: [
      {
        reference: "Règlement d'exécution (UE) 2024/2690",
        title: "Exigences techniques et méthodologiques des mesures de gestion des risques, et cas dans lesquels un incident est considéré comme important, pour certains fournisseurs numériques",
        kind: 'reglement_execution',
        date: '2024-10-17',
        status: 'en_vigueur',
        url: 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=OJ:L_202402690',
        note: "En vigueur depuis le 7 novembre 2024. Vise les fournisseurs de services DNS, registres de noms de domaine de premier niveau, informatique en nuage, centres de données, réseaux de diffusion de contenu, services gérés et de sécurité gérés, places de marché, moteurs de recherche, réseaux sociaux et prestataires de services de confiance. Pour ces acteurs, il remplace l'appréciation au cas par cas par des seuils chiffrés.",
      },
      {
        reference: 'ENISA Technical Implementation Guidance',
        title: "Guide de mise en œuvre technique du règlement d'exécution 2024/2690",
        kind: 'lignes_directrices',
        date: '2025-06-26',
        status: 'en_vigueur',
        url: 'https://www.enisa.europa.eu/publications/implementation-guidance-on-nis-2-security-measures',
        note: "170 pages traduisant chaque exigence en mesures opérationnelles et en exemples de preuves attendues.",
      },
      {
        reference: 'ReCyF v2.5',
        title: "Référentiel Cyber France : objectifs de sécurité et moyens acceptables de conformité",
        kind: 'referentiel',
        date: '2026-03-17',
        status: 'adopte',
        url: 'https://messervices.cyber.gouv.fr/documents-ressources/20260317_NIS_V2_ReCyF_v2.5.pdf',
        note: "Publié par l'ANSSI. Traduit NIS2 en 20 objectifs de sécurité et 152 moyens acceptables de conformité, avec une applicabilité distincte pour les entités importantes et essentielles. Document de travail tant que la loi de transposition et ses décrets ne sont pas publiés.",
      },
    ],
    articleCount: 46,
  },

  // -------------------------------------------------------------------------
  DORA: {
    id: 'DORA',
    shortName: 'DORA',
    name: "Règlement sur la résilience opérationnelle numérique du secteur financier",
    reference: 'Règlement (UE) 2022/2554',
    celex: '32022R2554',
    kind: 'reglement',
    purpose:
      "Garantir que le secteur financier européen puisse résister, réagir et se rétablir face aux perturbations et menaces liées aux technologies de l'information et de la communication.",
    scopeSummary:
      "Vingt et un types d'entités financières énumérés à l'article 2 : établissements de crédit, de paiement et de monnaie électronique, entreprises d'investissement, prestataires de services sur crypto-actifs, dépositaires centraux, contreparties centrales, plateformes de négociation, référentiels centraux, gestionnaires de fonds, entreprises d'assurance et de réassurance, intermédiaires, institutions de retraite professionnelle, agences de notation, administrateurs d'indices de référence, prestataires de services de financement participatif, ainsi que les prestataires tiers de services TIC. Un régime allégé s'applique aux microentreprises.",
    adopted: '2022-12-14',
    entryIntoForce: '2023-01-16',
    application: '2025-01-17',
    officialJournal: 'JO L 333 du 27.12.2022, p. 1',
    eurLexUrl: 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32022R2554',
    euAuthorities: ['ABE (EBA)', 'AEMF (ESMA)', 'AEAPP (EIOPA)', 'Forum de supervision'],
    frAuthorities: ['ACPR', 'AMF', 'Banque de France'],
    frenchStatus: {
      status: 'applicable_direct',
      label: 'Applicable directement depuis le 17 janvier 2025',
      note: "Règlement d'application directe. L'ACPR et l'AMF exercent la supervision des entités françaises ; les autorités européennes de surveillance assurent la supervision directe des prestataires tiers critiques désignés.",
      url: 'https://acpr.banque-france.fr/',
    },
    sanctions: [
      {
        id: 'DORA-NAT',
        label: 'Sanctions administratives nationales',
        basis: 'Articles 50 à 52',
        note: "DORA ne fixe pas de plafond européen harmonisé pour les entités financières : chaque État membre détermine des sanctions effectives, proportionnées et dissuasives. En France, les plafonds sont ceux du code monétaire et financier applicables à la catégorie d'entité concernée. Les autorités peuvent en outre publier les sanctions et engager la responsabilité des personnes physiques dirigeantes.",
      },
      {
        id: 'DORA-CTPP',
        label: "Prestataire tiers critique : astreinte de 1 % du CA mondial journalier",
        turnoverPct: 1,
        basis: 'Article 35, paragraphes 6 à 8',
        note: "Astreinte journalière plafonnée à 1 % du chiffre d'affaires quotidien moyen mondial de l'exercice précédent, pendant six mois au maximum. Elle vise les prestataires tiers critiques de services TIC désignés, non les entités financières clientes.",
      },
    ],
    implementingActs: [
      {
        reference: 'Règlement délégué (UE) 2024/1774',
        title: "Normes techniques de réglementation précisant le cadre de gestion du risque lié aux TIC",
        kind: 'rts',
        date: '2024-03-13',
        status: 'en_vigueur',
        url: 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R1774',
        note: "Contenu minimal des politiques de sécurité, gestion des accès, chiffrement, cloisonnement réseau, gestion des changements, continuité et communication de crise. C'est le texte qui rend l'article 15 de DORA opérationnel.",
      },
      {
        reference: 'Règlement délégué (UE) 2024/1772',
        title: "Normes techniques de réglementation sur la classification des incidents liés aux TIC",
        kind: 'rts',
        date: '2024-03-13',
        status: 'en_vigueur',
        url: 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R1772',
        note: "Critères et seuils d'importance permettant de qualifier un incident de majeur, et donc déclarable.",
      },
      {
        reference: "Règlement d'exécution (UE) 2024/2956",
        title: "Modèles harmonisés du registre d'information sur les accords contractuels TIC",
        kind: 'its',
        date: '2024-11-29',
        status: 'en_vigueur',
        url: 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R2956',
        note: "Fixe la structure exacte du registre d'information à remettre annuellement à l'autorité compétente. Quinze modèles de tableaux liés entre eux par des identifiants.",
      },
      {
        reference: 'Règlement délégué (UE) 2025/301',
        title: "Normes techniques sur le contenu et les délais de déclaration des incidents majeurs",
        kind: 'rts',
        date: '2024-10-23',
        status: 'en_vigueur',
        url: 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32025R0301',
        note: "Fixe les trois échéances de déclaration : notification initiale, rapport intermédiaire, rapport final.",
      },
      {
        reference: 'Règlement délégué (UE) 2025/532',
        title: "Normes techniques sur la sous-traitance des services TIC soutenant des fonctions critiques ou importantes",
        kind: 'rts',
        date: '2025-03-24',
        status: 'en_vigueur',
        url: 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32025R0532',
        note: "En vigueur depuis le 22 juillet 2025. Encadre ce que l'entité financière doit vérifier avant d'autoriser une chaîne de sous-traitance : visibilité sur les sous-traitants ultérieurs, risque de concentration, localisation des données.",
      },
      {
        reference: 'Règlement délégué (UE) 2025/1190',
        title: "Normes techniques sur les tests de pénétration fondés sur la menace",
        kind: 'rts',
        date: '2025-03-06',
        status: 'en_vigueur',
        url: 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32025R1190',
        note: "En vigueur depuis le 8 juillet 2025. Méthodologie alignée sur TIBER-EU : renseignement sur la menace, équipe rouge, périmètre, attestation de l'autorité.",
      },
      {
        reference: 'Désignation des prestataires tiers critiques',
        title: "Première liste de prestataires tiers critiques de services TIC désignés par les autorités européennes de surveillance",
        kind: 'lignes_directrices',
        date: '2025-11-18',
        status: 'en_vigueur',
        url: 'https://www.eba.europa.eu/publications-and-media/press-releases/european-supervisory-authorities-designate-critical-ict-third-party-providers-under-digital',
        note: "Dix-neuf prestataires désignés, majoritairement fournisseurs d'informatique en nuage et de centres de données. Depuis 2026, chacun se voit affecter un superviseur principal assisté d'équipes d'examen conjointes.",
      },
    ],
    articleCount: 64,
  },

  // -------------------------------------------------------------------------
  CRA: {
    id: 'CRA',
    shortName: 'CRA',
    name: 'Règlement sur la cyberrésilience',
    reference: 'Règlement (UE) 2024/2847',
    celex: '32024R2847',
    kind: 'reglement',
    purpose:
      "Garantir que les produits comportant des éléments numériques (matériels et logiciels) sont mis sur le marché avec moins de vulnérabilités, et que leurs fabricants en assurent la sécurité pendant toute leur période d'assistance.",
    scopeSummary:
      "Tout produit comportant des éléments numériques mis à disposition sur le marché de l'Union, dont l'utilisation prévue inclut une connexion de données directe ou indirecte à un appareil ou à un réseau. Les obligations pèsent principalement sur le fabricant, et, dans une moindre mesure, sur l'importateur et le distributeur. Sont exclus les produits relevant de réglementations sectorielles équivalentes : dispositifs médicaux, véhicules à moteur, aviation civile, équipements marins, et les produits développés exclusivement pour la défense ou la sécurité nationale. Les services en nuage purs relèvent de NIS2, non du CRA.",
    adopted: '2024-10-23',
    entryIntoForce: '2024-12-10',
    application: '2027-12-11',
    officialJournal: 'JO L, 2024/2847, 20.11.2024',
    eurLexUrl: 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R2847',
    euAuthorities: ['Commission européenne', 'ENISA, plateforme unique de signalement', 'Groupe de coopération administrative (ADCO)'],
    frAuthorities: ['ANFR, surveillance du marché (pressentie)', 'ANSSI, autorité notifiante', 'CERT-FR, CSIRT coordinateur'],
    frenchStatus: {
      status: 'applicable_direct',
      label: 'Application progressive : signalements depuis le 11 septembre 2026',
      note: "Règlement d'application directe, applicable par paliers (art. 71) : organismes d'évaluation de la conformité depuis le 11 juin 2026, obligations de signalement de l'article 14 depuis le 11 septembre 2026, ensemble des exigences au 11 décembre 2027. En France, l'ANSSI est l'autorité notifiante et la surveillance du marché est pressentie pour l'ANFR ; la désignation formelle reste à confirmer.",
      url: 'https://cyber.gouv.fr/reglementation/cybersecurite-des-produits/cyber-resilience-act/',
    },
    sanctions: [
      {
        id: 'CRA-T1',
        label: 'Exigences essentielles : 15 M€ ou 2,5 % du CA mondial',
        turnoverPct: 2.5,
        capEur: 15_000_000,
        capRule: 'le_plus_eleve',
        basis: 'Article 64, paragraphe 2',
        note: "Non-respect des exigences essentielles de l'annexe I et des obligations des articles 13 (fabricant) et 14 (signalement). Les micro et petites entreprises ne sont pas sanctionnées pour le seul dépassement du délai d'alerte précoce de 24 heures (art. 64 § 10).",
      },
      {
        id: 'CRA-T2',
        label: 'Autres obligations : 10 M€ ou 2 % du CA mondial',
        turnoverPct: 2,
        capEur: 10_000_000,
        capRule: 'le_plus_eleve',
        basis: 'Article 64, paragraphe 3',
        note: "Obligations des importateurs et distributeurs (art. 18 à 23), marquage CE, documentation technique et procédures d'évaluation de la conformité.",
      },
      {
        id: 'CRA-T3',
        label: 'Informations inexactes : 5 M€ ou 1 % du CA mondial',
        turnoverPct: 1,
        capEur: 5_000_000,
        capRule: 'le_plus_eleve',
        basis: 'Article 64, paragraphe 4',
        note: "Fourniture d'informations inexactes, incomplètes ou trompeuses aux organismes notifiés et aux autorités de surveillance du marché.",
      },
    ],
    implementingActs: [
      {
        reference: "Règlement d'exécution (UE) 2025/2392",
        title: "Description technique des catégories de produits importants et critiques",
        kind: 'reglement_execution',
        date: '2025-11-28',
        status: 'en_vigueur',
        url: 'https://eur-lex.europa.eu/eli/reg_impl/2025/2392/oj',
        note: "En vigueur depuis le 29 novembre 2025. Précise les vingt-huit catégories des annexes III (classes I et II) et IV, qui déterminent la procédure d'évaluation de la conformité applicable : autoévaluation, tierce partie ou certification européenne.",
      },
      {
        reference: 'Plateforme unique de signalement',
        title: "Canal de notification des vulnérabilités activement exploitées et des incidents graves",
        kind: 'lignes_directrices',
        date: '2026-09-11',
        status: 'en_vigueur',
        url: 'https://www.enisa.europa.eu/',
        note: "Opérée par l'ENISA (art. 16), elle transmet simultanément au CSIRT coordinateur de l'État membre concerné, soit le CERT-FR pour la France.",
      },
    ],
    articleCount: 71,
  },

  // -------------------------------------------------------------------------
  AIACT: {
    id: 'AIACT',
    shortName: 'AI Act',
    name: "Règlement sur l'intelligence artificielle",
    reference: 'Règlement (UE) 2024/1689',
    celex: '32024R1689',
    kind: 'reglement',
    purpose:
      "Encadrer la mise sur le marché, la mise en service et l'utilisation des systèmes d'intelligence artificielle selon leur niveau de risque, afin de protéger la santé, la sécurité et les droits fondamentaux.",
    scopeSummary:
      "Fournisseurs qui mettent sur le marché ou en service un système ou un modèle d'IA dans l'Union, déployeurs établis ou situés dans l'Union, ainsi qu'importateurs, distributeurs et mandataires (art. 2). Les obligations dépendent du niveau de risque : pratiques interdites (art. 5), systèmes à haut risque (art. 6, annexes I et III), obligations de transparence (art. 50) et modèles d'IA à usage général (chapitre V). Sont exclus les usages exclusivement militaires, de défense ou de sécurité nationale, la recherche scientifique et l'usage personnel non professionnel.",
    adopted: '2024-06-13',
    entryIntoForce: '2024-08-01',
    application: '2026-08-02',
    officialJournal: 'JO L, 2024/1689, 12.7.2024',
    eurLexUrl: 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R1689',
    euAuthorities: ["Bureau de l'IA (Commission européenne)", "Comité européen de l'intelligence artificielle", "Groupe scientifique d'experts indépendants"],
    frAuthorities: ['DGCCRF, coordination de la surveillance du marché (pressentie)', 'CNIL, données personnelles et biométrie (pressentie)', 'Autorités sectorielles : ACPR, Arcom, ANSM (pressenties)'],
    frenchStatus: {
      status: 'applicable_direct',
      label: "Application progressive, calendrier modifié par l'Omnibus IA",
      note: "Règlement d'application directe, applicable par paliers (art. 113) : pratiques interdites et maîtrise de l'IA depuis le 2 février 2025, modèles d'IA à usage général et gouvernance depuis le 2 août 2025, transparence et régime général depuis le 2 août 2026. Le règlement (UE) 2026/1744, dit « Omnibus IA », en vigueur depuis le 27 juillet 2026, reporte les systèmes à haut risque de l'annexe III au 2 décembre 2027 et ceux de l'annexe I au 2 août 2028. En France, la désignation des autorités compétentes (DGCCRF en coordination, CNIL et autorités sectorielles) dépend d'un projet de loi encore en discussion.",
      url: 'https://www.entreprises.gouv.fr/priorites-et-actions/transition-numerique/soutenir-le-developpement-de-lia-au-service-de-0',
    },
    sanctions: [
      {
        id: 'AIACT-T1',
        label: 'Pratiques interdites : 35 M€ ou 7 % du CA mondial',
        turnoverPct: 7,
        capEur: 35_000_000,
        capRule: 'le_plus_eleve',
        basis: 'Article 99, paragraphe 3',
        note: "Non-respect de l'interdiction des pratiques de l'article 5. C'est le plafond le plus élevé du droit européen du numérique. Pour les PME, le montant le plus faible des deux est retenu (art. 99 § 6).",
      },
      {
        id: 'AIACT-T2',
        label: 'Autres obligations : 15 M€ ou 3 % du CA mondial',
        turnoverPct: 3,
        capEur: 15_000_000,
        capRule: 'le_plus_eleve',
        basis: 'Article 99, paragraphe 4',
        note: "Obligations des fournisseurs (art. 16), mandataires, importateurs, distributeurs et déployeurs (art. 26), et obligations de transparence (art. 50). Les fournisseurs de modèles d'IA à usage général relèvent d'un plafond équivalent fixé par la Commission (art. 101).",
      },
      {
        id: 'AIACT-T3',
        label: 'Informations inexactes : 7,5 M€ ou 1 % du CA mondial',
        turnoverPct: 1,
        capEur: 7_500_000,
        capRule: 'le_plus_eleve',
        basis: 'Article 99, paragraphe 5',
        note: "Fourniture d'informations inexactes, incomplètes ou trompeuses aux organismes notifiés ou aux autorités nationales compétentes.",
      },
    ],
    implementingActs: [
      {
        reference: 'Règlement (UE) 2026/1744',
        title: "Omnibus numérique sur l'IA : simplification et report du calendrier des systèmes à haut risque",
        kind: 'reglement_execution',
        date: '2026-07-08',
        status: 'en_vigueur',
        url: 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32026R1744',
        note: "Publié au JO le 24 juillet 2026, en vigueur le 27 juillet 2026. Reporte les systèmes à haut risque de l'annexe III au 2 décembre 2027 et ceux de l'annexe I au 2 août 2028. Réécrit l'article 4 : la maîtrise de l'IA devient une obligation de moyens. Ajoute une interdiction visant la génération de contenus pédopornographiques ou intimes non consentis (2 décembre 2026) et accorde jusqu'au 2 décembre 2026 aux systèmes déjà sur le marché pour le marquage des contenus générés. Étend les allègements des PME aux petites entreprises à moyenne capitalisation. Le corpus local conserve la version initiale publiée au JO ; les citations de l'article 4 renvoient à cette version.",
      },
      {
        reference: 'Lignes directrices C(2025) 884',
        title: "Lignes directrices de la Commission sur les pratiques d'IA interdites",
        kind: 'lignes_directrices',
        date: '2025-02-04',
        status: 'en_vigueur',
        url: 'https://digital-strategy.ec.europa.eu/fr/library/commission-publishes-guidelines-prohibited-artificial-intelligence-ai-practices-defined-ai-act',
        note: "Non contraignantes, mais constituent l'interprétation de référence de l'article 5.",
      },
      {
        reference: 'Code de bonnes pratiques GPAI',
        title: "Code de bonnes pratiques pour les modèles d'IA à usage général",
        kind: 'lignes_directrices',
        date: '2025-07-10',
        status: 'en_vigueur',
        url: 'https://digital-strategy.ec.europa.eu/fr/policies/contents-code-gpai',
        note: "Outil volontaire permettant de démontrer le respect des articles 53 et 55 : transparence, droit d'auteur, sûreté et sécurité.",
      },
    ],
    articleCount: 113,
  },
}

// ---------------------------------------------------------------------------
// Interface en anglais : libellés remplacés au chargement
// ---------------------------------------------------------------------------

interface RegulationEn {
  shortName: string
  name: string
  reference: string
  officialJournal: string
  purpose: string
  scopeSummary: string
  euAuthorities: string[]
  frAuthorities: string[]
  frenchStatus: { label: string; note: string }
  sanctions: Record<string, [string, string, string]>
  acts: [string, string, string | null][]
  framework?: string
}

if (LANG === 'en') {
  for (const [id, en] of Object.entries(EN_REGULATIONS as unknown as Record<RegulationId, RegulationEn>)) {
    const r = REGULATIONS[id as RegulationId]
    Object.assign(r, {
      shortName: en.shortName,
      name: en.name,
      reference: en.reference,
      officialJournal: en.officialJournal,
      purpose: en.purpose,
      scopeSummary: en.scopeSummary,
      euAuthorities: en.euAuthorities,
      frAuthorities: en.frAuthorities,
      frenchStatus: { ...r.frenchStatus, ...en.frenchStatus },
      eurLexUrl: r.eurLexUrl.replace('/FR/', '/EN/'),
    })
    for (const t of r.sanctions) {
      const e = en.sanctions[t.id]
      if (e) [t.label, t.basis, t.note] = e
    }
    r.implementingActs.forEach((a, i) => {
      const e = en.acts[i]
      if (!e) return
      a.reference = e[0]
      a.title = e[1]
      if (e[2]) a.note = e[2]
    })
    if (r.framework && en.framework) r.framework.note = en.framework
  }
}

export const REGULATION_ORDER: RegulationId[] = ['RGPD', 'NIS2', 'DORA', 'CRA', 'AIACT']

export const REGULATION_LIST = REGULATION_ORDER.map((id) => REGULATIONS[id])

/** « basé sur ReCyF v2.5, mars 2026 » : la version de travail sur laquelle NIS2 s'appuie. */
export function frameworkNote(): string {
  const f = REGULATIONS.NIS2.framework
  if (!f) return ''
  const month = new Date(f.date).toLocaleDateString(LOCALE, { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return tr(`basé sur ${f.name} v${f.version}, ${month}`, `based on ${f.name} v${f.version}, ${month}`)
}
