import type { RecyfObjective } from '@/types/domain'
import { LANG, tr } from '@/i18n'
import EN from '@/i18n/en/recyf.json'

/**
 * ReCyF : Référentiel Cyber France, version 2.5 du 17 mars 2026.
 *
 * Publié par l'ANSSI, il traduit les exigences de NIS2 en vingt objectifs de
 * sécurité et cent cinquante-deux moyens acceptables de conformité.
 *
 * Deux choses le rendent précieux pour un exercice de cadrage :
 *   - l'applicabilité est encodée dans l'identifiant de chaque mesure,
 *     « EI/EE » valant pour toutes les entités, « EE » pour les seules
 *     entités essentielles. La qualification cesse d'être une étiquette :
 *     elle détermine quatre-vingt-quatorze mesures sur cent cinquante-deux ;
 *   - l'ANSSI y désigne les certifications et qualifications opposables lors
 *     d'un contrôle, ce qui permet d'éteindre un objectif par un certificat
 *     déjà détenu.
 *
 * Statut : document de travail tant que la loi de transposition et ses décrets
 * ne sont pas publiés. Les renvois du texte à « l'article 17 du PJL » ou au
 * « décret » signalent les points encore ouverts.
 */

const ISO = tr(
  "Un système de management de la sécurité de l'information certifié ISO/CEI 27001:2022 est opposable lors d'un contrôle, sur le périmètre couvert par la certification.",
  'An information security management system certified to ISO/IEC 27001:2022 can be relied on during an inspection, within the scope covered by the certification.',
)
const PACS = tr(
  "Le recours à un prestataire d'accompagnement et de conseil en sécurité qualifié par l'ANSSI, assorti du suivi du plan d'action issu de la prestation, est opposable lors d'un contrôle.",
  'Using a security support and advisory provider qualified by ANSSI, together with follow-up of the resulting action plan, can be relied on during an inspection.',
)

const RECYF_FR: RecyfObjective[] = [
  // =========================================================================
  // GOUVERNANCE
  // =========================================================================
  {
    n: 1,
    pillar: 'gouvernance',
    title: "Recensement des systèmes d'information",
    statement:
      "Réaliser et maintenir à jour la liste de l'ensemble des activités et services de l'entité ainsi que des systèmes d'information y contribuant. Les objectifs de sécurité s'appliquent à tous ces systèmes, sauf ceux dont l'entité justifie, analyse de risques à l'appui, qu'ils ne sont exposés ni à une dégradation ou interruption des activités, ni à une divulgation d'informations sensibles, ni à une altération des informations nécessaires aux activités. La mise en œuvre de mesures de sécurité ne suffit pas à justifier une exclusion.",
    scope: 'EI+EE',
    nis2: ['Article 21, paragraphe 1'],
    themes: ['DOC-03'],
    measures: [
      { id: '1.1-EI/EE', text: "Lister l'ensemble des activités et services, y compris ceux qui ne fondent pas la qualification d'entité importante ou essentielle ; pour chaque entrée, identifier un responsable et lister les systèmes d'information qui la supportent.", ei: true, ee: true },
      { id: '1.2-EI/EE', text: "Préciser dans cette liste les systèmes d'information exclus du périmètre et renseigner la justification de chaque exclusion.", ei: true, ee: true },
      { id: '1.3-EI/EE', text: "Valider et réexaminer la liste annuellement, et en tant que de besoin lors d'une évolution des activités ou de la mise en service d'un nouveau système.", ei: true, ee: true },
    ],
  },
  {
    n: 2,
    pillar: 'gouvernance',
    title: "Mise en œuvre d'un cadre de gouvernance de la sécurité numérique",
    statement:
      "Définir un cadre de gouvernance placé sous la responsabilité du dirigeant exécutif, comprenant une organisation, des rôles et responsabilités, des processus de gestion de la conformité, et une politique de sécurité des systèmes d'information. L'entité analyse sa conformité, identifie les écarts et établit un plan d'action suivi dans la durée pour les corriger.",
    scope: 'EI+EE',
    nis2: ['Article 20', 'Article 21, paragraphe 2, point a)'],
    themes: ['GOV-01', 'GOV-02', 'DOC-01'],
    equivalence: ISO,
    measures: [
      { id: '2.A.1-EI/EE', group: 'Rôles et responsabilités', text: "Le dirigeant exécutif est responsable de la sécurité numérique au sein de l'entité, et en particulier du suivi de la conformité des systèmes d'information aux mesures du référentiel.", ei: true, ee: true },
      { id: '2.A.2-EE', group: 'Rôles et responsabilités', text: "Désigner au moins une personne conseillant et accompagnant le dirigeant, qui devient le point de contact privilégié de l'ANSSI pour tous les sujets de sécurité numérique.", ei: false, ee: true },
      { id: '2.A.3-EI/EE', group: 'Rôles et responsabilités', text: "Définir et mettre en œuvre une organisation adaptée : responsable de la sécurité numérique, matrice de responsabilités, comitologie.", ei: true, ee: true },
      { id: '2.B.1-EI/EE', group: 'Politique de sécurité', text: "Définir et mettre en œuvre une politique de sécurité des systèmes d'information.", ei: true, ee: true },
      { id: '2.B.2-EI/EE', group: 'Politique de sécurité', text: "La politique comprend au minimum : gouvernance et rôles du personnel interne et externe, orientations stratégiques déclinées de la stratégie globale, engagement du dirigeant sur la sécurité et sur le respect des exigences légales issues de la transposition de NIS2, et prise en compte des spécificités sectorielles.", ei: true, ee: true },
      { id: '2.B.3-EI/EE', group: 'Politique de sécurité', text: "Le dirigeant exécutif approuve la politique de sécurité des systèmes d'information.", ei: true, ee: true },
      { id: '2.B.4-EI/EE', group: 'Politique de sécurité', text: "Revoir la politique au minimum annuellement et la mettre à jour lors d'évolutions majeures de la menace ou du contexte métier, technique ou organisationnel.", ei: true, ee: true },
      { id: '2.B.5-EI/EE', group: 'Politique de sécurité', text: "Décliner la politique en politiques thématiques couvrant au minimum l'usage du chiffrement, le contrôle d'accès physique et logique, la revue de l'application des mesures et la gestion des comptes.", ei: true, ee: true },
      { id: '2.C.1-EI/EE', group: 'Gestion de la conformité', text: "Pour chaque système d'information, réaliser et maintenir à jour une analyse de conformité au référentiel, tenant compte de la politique de sécurité.", ei: true, ee: true },
      { id: '2.C.2-EI/EE', group: 'Gestion de la conformité', text: "L'analyse identifie les écarts entre les mesures mises en œuvre et les mesures du référentiel.", ei: true, ee: true },
      { id: '2.C.3-EI/EE', group: 'Gestion de la conformité', text: "Établir et suivre un plan d'action corrigeant ces écarts, prévoyant au minimum une échéance raisonnable et un responsable par action ; justifier toute mesure alternative retenue.", ei: true, ee: true },
    ],
  },
  {
    n: 3,
    pillar: 'gouvernance',
    title: "Maîtrise de l'écosystème",
    statement:
      "Tenir à jour la liste des prestataires et fournisseurs informatiques intervenant dans les activités ou services, avec le périmètre et la nature de chaque prestation, et mettre en place des processus, notamment contractuels, garantissant que ces prestations sont conformes aux obligations pesant sur l'entité, en particulier en matière de gestion des risques et de notification des incidents.",
    scope: 'EI+EE',
    nis2: ['Article 21, paragraphe 2, point d)', 'Article 21, paragraphe 3'],
    themes: ['TIE-01', 'TIE-02', 'TIE-03'],
    measures: [
      { id: '3.A.1-EI/EE', group: "Cartographie de l'écosystème", text: "Définir et maintenir à jour une cartographie de l'écosystème contenant au minimum la liste des prestataires et fournisseurs informatiques avec lesquels existe une relation de droit ou de fait, et la liste des interconnexions avec les systèmes d'information de l'entité.", ei: true, ee: true },
      { id: '3.A.2-EI/EE', group: "Cartographie de l'écosystème", text: "Renseigner et maintenir à jour les coordonnées d'au moins un point de contact pour chaque entrée de la cartographie.", ei: true, ee: true },
      { id: '3.B.1-EI/EE', group: 'Sécurité dans les contrats', text: "S'assurer que la prestation est conforme aux obligations de l'entité et disposer des assurances contractuelles correspondantes : plan d'assurance sécurité, charte de télémaintenance, indicateurs de suivi.", ei: true, ee: true },
      { id: '3.B.2-EI/EE', group: 'Sécurité dans les contrats', text: "Vérifier périodiquement la conformité de la prestation, en s'appuyant le cas échéant sur les audits prévus aux mesures 17.2-EE, 17.4-EE et 17.5-EE.", ei: true, ee: true },
    ],
  },
  {
    n: 4,
    pillar: 'gouvernance',
    title: 'Intégration de la sécurité numérique dans la gestion des ressources humaines',
    statement:
      "Définir les procédures de sensibilisation des utilisateurs, en particulier des dirigeants, et de formation des personnes occupant des fonctions à responsabilité dans le domaine numérique. Intégrer la sécurité numérique à la gestion des ressources humaines, de l'arrivée d'un personnel jusqu'à son départ.",
    scope: 'EI+EE',
    nis2: ['Article 20, paragraphe 2', 'Article 21, paragraphe 2, points g) et i)'],
    themes: ['GOV-04', 'PRO-06'],
    measures: [
      { id: '4.1-EI/EE', text: "Définir et mettre en œuvre une charte d'usage des systèmes d'information, opposable à chaque utilisateur ; elle peut prévoir des dispositions spécifiques pour les administrateurs et couvrir les systèmes exclus du périmètre.", ei: true, ee: true },
      { id: '4.2-EI/EE', text: "Définir et mettre en œuvre un programme de sensibilisation à la sécurité numérique de l'ensemble des utilisateurs, comportant des actions tout au long de leur présence dans l'entité.", ei: true, ee: true },
      { id: '4.3-EE', text: "Prévoir des clauses de sécurité dans les contrats de travail, notamment des clauses de confidentialité valant pendant et après le contrat.", ei: false, ee: true },
      { id: '4.4-EI/EE', text: "Définir un processus de gestion des arrivées, départs et changements de fonction des personnels et des tiers : prise de connaissance des règles, attribution des accès, mise à jour lors d'un changement, et au départ restitution du matériel et désactivation de tous les accès logiques et physiques.", ei: true, ee: true },
      { id: '4.5-EI/EE', text: "Définir et mettre en œuvre, pour les fonctions à responsabilité dans le domaine numérique, un programme de formations dédiées adapté à ces responsabilités.", ei: true, ee: true },
    ],
  },
  {
    n: 16,
    pillar: 'gouvernance',
    title: "Mise en œuvre d'une approche par les risques",
    statement:
      "Mettre en œuvre une approche par les risques placée sous la responsabilité du dirigeant exécutif, permettant de connaître et de suivre l'évolution des risques pesant sur les systèmes d'information, de définir et suivre les mesures de sécurité destinées à les maîtriser, et d'accepter formellement les risques résiduels.",
    scope: 'EE',
    nis2: ['Article 21, paragraphe 2, point a)'],
    themes: ['RSK-01'],
    equivalence: `${ISO} ${PACS}`,
    measures: [
      { id: '16.1-EE', text: "Définir, mettre en œuvre et maintenir à jour une gouvernance par les risques garantissant que le risque numérique est pris en compte par le dirigeant exécutif et les responsables d'activité, et que les moyens financiers, humains et techniques adéquats sont alloués.", ei: false, ee: true },
      { id: '16.2-EE', text: "S'assurer que chaque système d'information fait l'objet d'une analyse de risques ; cette exigence peut être satisfaite par une analyse par activité ou service couvrant tous les systèmes qui la supportent.", ei: false, ee: true },
      { id: '16.3-EE', text: "Fonder l'analyse sur la politique de sécurité et les spécificités sectorielles, la maîtrise de l'écosystème, la maîtrise du système d'information, l'approche par conformité et les audits. La méthode EBIOS Risk Manager peut être utilisée.", ei: false, ee: true },
      { id: '16.4-EE', text: "Valider l'analyse, accepter les risques résiduels et mettre en œuvre le plan d'action ; réexaminer l'analyse au minimum tous les trois ans et en cas d'incident ou d'évolution majeure du contexte.", ei: false, ee: true },
    ],
  },
  {
    n: 17,
    pillar: 'gouvernance',
    title: "Audit de la sécurité des systèmes d'information",
    statement:
      "Réaliser ou faire réaliser, à intervalles réguliers et planifiés, des audits de sécurité permettant de vérifier l'atteinte des objectifs de sécurité et d'évaluer le niveau de sécurité des systèmes d'information.",
    scope: 'EE',
    nis2: ['Article 21, paragraphe 2, point f)', 'Article 32'],
    themes: ['RES-04'],
    equivalence: "Le recours à un prestataire d'audit de la sécurité des systèmes d'information qualifié par l'ANSSI est opposable lors d'un contrôle, dès lors que le périmètre de la prestation couvre l'application des mesures correctives.",
    measures: [
      { id: '17.1-EE', text: "Définir et mettre en œuvre un programme d'audit de l'ensemble des systèmes d'information, dont la profondeur et la fréquence tiennent compte de l'analyse de risque, de la criticité et de l'exposition de chaque système.", ei: false, ee: true },
      { id: '17.2-EE', text: "L'audit vérifie de manière indépendante l'atteinte des objectifs réglementaires (conformité aux mesures ou mise en œuvre de mesures alternatives) et évalue le niveau de sécurité au regard des menaces et vulnérabilités connues.", ei: false, ee: true },
      { id: '17.3-EE', text: "L'audit comprend au minimum une activité parmi : test d'intrusion couvrant les interfaces exposées, audit de configuration, audit d'architecture, audit organisationnel et physique, et le cas échéant audit de code.", ei: false, ee: true },
      { id: '17.4-EE', text: "Le rapport d'audit présente une synthèse de la conformité et du niveau de sécurité, les constats de non-conformité et les vulnérabilités identifiées, et les recommandations pour y remédier.", ei: false, ee: true },
      { id: '17.5-EE', text: "Définir et mettre en œuvre un plan d'action corrigeant les non-conformités et vulnérabilités, avec une échéance raisonnable et un responsable par action.", ei: false, ee: true },
    ],
  },

  // =========================================================================
  // PROTECTION
  // =========================================================================
  {
    n: 5,
    pillar: 'protection',
    title: "Maîtrise des systèmes d'information",
    statement:
      "Disposer d'au moins une cartographie des systèmes d'information suffisamment détaillée pour faciliter leur maintien en condition opérationnelle et de sécurité et améliorer la réactivité en cas d'incident. Définir et mettre en œuvre un processus de maintien en condition visant à appliquer les correctifs de sécurité et à limiter l'exposition aux vulnérabilités.",
    scope: 'EI+EE',
    nis2: ['Article 21, paragraphe 2, points e) et g)'],
    themes: ['DOC-03', 'DET-03', 'PRO-04'],
    measures: [
      { id: '5.A.1-EI/EE', group: 'Cartographie', text: "Élaborer et maintenir à jour au moins une cartographie des systèmes d'information dont le niveau de détail permet d'assurer leur maintien en condition et de réagir sans retard injustifié à un incident, notamment en identifiant les ressources vulnérables ou affectées.", ei: true, ee: true },
      { id: '5.B.1-EE', group: 'Maintien en condition', text: "Élaborer, mettre en œuvre et maintenir à jour une procédure de maintien en condition opérationnelle et de sécurité des ressources matérielles et logicielles.", ei: false, ee: true },
      { id: '5.B.2-EI/EE', group: 'Maintien en condition', text: "Maintenir à jour les bases de connaissances des outils de protection contre les codes malveillants : bases antivirales, signatures des solutions de détection sur les terminaux.", ei: true, ee: true },
      { id: '5.B.3-EI/EE', group: 'Maintien en condition', text: "Mettre en œuvre une veille sur les vulnérabilités, les correctifs et les mesures d'atténuation, diffusés notamment par les fournisseurs, un prestataire mandaté, le CERT-FR ou les CSIRT.", ei: true, ee: true },
      { id: '5.B.4-EI/EE', group: 'Maintien en condition', text: "Engager sans délai les actions d'installation des correctifs et appliquer sans retard injustifié les correctifs de sécurité sur les ressources exposées à des systèmes tiers et sur les postes de travail.", ei: true, ee: true },
      { id: '5.B.5-EE', group: 'Maintien en condition', text: "Planifier et installer les correctifs de sécurité sur l'ensemble des ressources, y compris celles non exposées à des systèmes d'information tiers.", ei: false, ee: true },
      { id: '5.B.6-EI/EE', group: 'Maintien en condition', text: "Lorsque des raisons techniques ou opérationnelles empêchent l'installation d'un correctif, mettre en œuvre des mesures d'atténuation : isolement de la ressource, contrôle d'accès renforcé.", ei: true, ee: true },
      { id: '5.B.7-EI/EE', group: 'Maintien en condition', text: "Maintenir les ressources logicielles, y compris embarquées, dans des versions bénéficiant du support de leur fournisseur et comportant les mises à jour de sécurité.", ei: true, ee: true },
      { id: '5.B.8-EI/EE', group: 'Maintien en condition', text: "Vérifier que toute nouvelle version logicielle est téléchargée depuis les ressources officielles mises à disposition par l'éditeur ou le fournisseur.", ei: true, ee: true },
      { id: '5.B.9-EI/EE', group: 'Maintien en condition', text: "Lorsqu'une version supportée ne peut être installée, mettre en œuvre des mesures réduisant les risques liés à l'utilisation d'une version obsolète.", ei: true, ee: true },
    ],
  },
  {
    n: 6,
    pillar: 'protection',
    title: 'Maîtrise des accès physiques aux locaux',
    statement:
      "Mettre en place des mécanismes de contrôle d'accès, de gestion des droits d'accès et de gestion des visiteurs afin que seules les personnes autorisées accèdent aux locaux, et en particulier aux locaux techniques et aux salles hébergeant des serveurs de données.",
    scope: 'EI+EE',
    nis2: ['Article 21, paragraphe 2', 'Article 21, paragraphe 2, point i)'],
    themes: ['PRO-05', 'PRO-03'],
    measures: [
      { id: '6.1-EI/EE', text: "Mettre en place des mesures limitant l'accès des personnes non autorisées aux locaux, salles serveurs et locaux techniques : registre des visiteurs, badges d'accès.", ei: true, ee: true },
      { id: '6.2-EE', text: "Assurer la protection physique des locaux, salles serveurs et locaux techniques (vidéosurveillance, gardiennage, alarme) permettant de prévenir, surveiller et réagir aux accès non autorisés.", ei: false, ee: true },
      { id: '6.3-EE', text: "Attribuer les droits d'accès physique au regard du besoin strictement nécessaire à l'exécution des missions.", ei: false, ee: true },
      { id: '6.4-EI/EE', text: "S'assurer que les personnes externes accédant aux locaux techniques et salles serveurs sont accompagnées ou dûment autorisées.", ei: true, ee: true },
    ],
  },
  {
    n: 7,
    pillar: 'protection',
    title: "Sécurisation de l'architecture des systèmes d'information",
    statement:
      "Identifier les besoins d'exposition des services et interfaces ainsi que les besoins d'interconnexion à des systèmes d'information tiers, et filtrer les communications entrantes et sortantes. Les entités essentielles cloisonnent en outre leurs systèmes en zones de sécurité cohérentes et contrôlent les communications entre ces zones.",
    scope: 'EI+EE',
    nis2: ['Article 21, paragraphe 2, points e) et h)'],
    themes: ['PRO-01', 'PRO-03'],
    measures: [
      { id: '7.A.1-EI/EE', group: 'Cloisonnement', text: "Cloisonner physiquement ou logiquement l'ensemble des systèmes d'information vis-à-vis des autres systèmes, y compris ceux exclus du périmètre et les systèmes tiers.", ei: true, ee: true },
      { id: '7.A.2-EE', group: 'Cloisonnement', text: "Cloisonner physiquement ou logiquement chaque système d'information vis-à-vis des autres, y compris ceux exclus du périmètre et les systèmes tiers.", ei: false, ee: true },
      { id: '7.A.3-EE', group: 'Cloisonnement', text: "Examiner, pour chaque système, la pertinence de définir des sous-systèmes regroupant des ressources de sensibilité, d'exposition et de sécurité homogènes ; justifier l'absence de sous-système.", ei: false, ee: true },
      { id: '7.A.4-EE', group: 'Cloisonnement', text: "Cloisonner entre eux, physiquement ou logiquement, les sous-systèmes identifiés.", ei: false, ee: true },
      { id: '7.A.5-EE', group: 'Cloisonnement', text: "Mettre en œuvre au moins un sous-système « passerelle sortante » permettant d'accéder aux systèmes tiers et d'authentifier, filtrer et tracer ces accès.", ei: false, ee: true },
      { id: '7.A.6-EE', group: 'Cloisonnement', text: "Mettre en œuvre au moins un sous-système « passerelle entrante » permettant d'exposer des ressources aux systèmes tiers et de filtrer et tracer les accès entrants.", ei: false, ee: true },
      { id: '7.A.7-EI/EE', group: 'Cloisonnement', text: "N'établir que les interconnexions nécessaires aux activités et services ou au maintien en condition, entre l'ensemble des systèmes d'information et les systèmes tiers ou les systèmes exclus du périmètre.", ei: true, ee: true },
      { id: '7.A.8-EE', group: 'Cloisonnement', text: "Appliquer la même restriction au niveau de chaque système d'information et entre les sous-systèmes.", ei: false, ee: true },
      { id: '7.B.1-EI/EE', group: 'Filtrage', text: "Définir et documenter les communications nécessaires aux activités et services et au maintien en condition, circulant entre les systèmes d'information et les systèmes tiers ou exclus.", ei: true, ee: true },
      { id: '7.B.2-EE', group: 'Filtrage', text: "Définir et documenter les communications nécessaires circulant entre les sous-systèmes d'un même système d'information.", ei: false, ee: true },
      { id: '7.B.3-EI/EE', group: 'Filtrage', text: "Mettre en œuvre au niveau des interconnexions des règles de filtrage n'autorisant que les communications identifiées ; bloquer toutes les autres par défaut.", ei: true, ee: true },
      { id: '7.B.4-EI/EE', group: 'Filtrage', text: "Filtrer par un ou plusieurs pare-feux dédiés au minimum les communications entre les systèmes d'information de l'entité et les systèmes tiers.", ei: true, ee: true },
      { id: '7.B.5-EI/EE', group: 'Filtrage', text: "Effectuer annuellement une revue de la mise en œuvre technique des règles de filtrage.", ei: true, ee: true },
    ],
  },
  {
    n: 8,
    pillar: 'protection',
    title: "Sécurisation des accès distants aux systèmes d'information",
    statement:
      "Mettre en place des mécanismes d'identification et d'authentification des personnes et processus automatiques accédant aux systèmes d'information depuis des systèmes tiers, ainsi que des mécanismes de sécurisation du canal de communication, des points d'entrée et de sortie, et des accès.",
    scope: 'EI+EE',
    nis2: ['Article 21, paragraphe 2, points h) et j)'],
    themes: ['PRO-03', 'PRO-02'],
    measures: [
      { id: '8.1-EI/EE', text: "Protéger les accès effectués à travers un système d'information tiers au moyen de mécanismes de chiffrement conformes aux recommandations de l'ANSSI : réseau privé virtuel TLS ou IPSec, protocoles applicatifs chiffrés.", ei: true, ee: true },
      { id: '8.2-EI/EE', text: "Protéger ces accès, lorsqu'ils sont effectués par les personnels et prestataires autorisés, par un mécanisme d'authentification conforme aux mesures relatives à l'authentification.", ei: true, ee: true },
      { id: '8.3-EE', text: "Le mécanisme d'authentification de ces accès est multifacteur et repose sur au moins un facteur de connaissance, par exemple une carte à puce et un code confidentiel.", ei: false, ee: true },
      { id: '8.4-EE', text: "Lorsque l'authentification multifacteur ne peut être mise en œuvre pour des raisons techniques ou opérationnelles, mettre en place des mesures réduisant le risque associé.", ei: false, ee: true },
      { id: '8.5-EE', text: "Protéger en permanence les mémoires de masse des postes et équipements mobiles permettant l'accès à distance depuis un lieu non maîtrisé, par chiffrement et authentification conformes à l'état de l'art recommandé par l'ANSSI.", ei: false, ee: true },
    ],
  },
  {
    n: 9,
    pillar: 'protection',
    title: "Protection des systèmes d'information contre les codes malveillants",
    statement:
      "Mettre en œuvre des mécanismes de protection contre les codes malveillants sur les ressources des systèmes d'information. Les entités essentielles s'assurent en outre que seules les ressources matérielles qu'elles gèrent, ou dont elles ont confié la gestion, se connectent aux systèmes d'information, ce qui interdit en pratique l'usage d'équipements personnels.",
    scope: 'EI+EE',
    nis2: ['Article 21, paragraphe 2, points e) et i)'],
    themes: ['PRO-01', 'PRO-04'],
    measures: [
      { id: '9.1-EI/EE', text: "Définir les ressources matérielles, en particulier les terminaux, autorisées à se connecter aux systèmes d'information. Cette mesure autorise l'usage d'équipements personnels.", ei: true, ee: true },
      { id: '9.2-EE', text: "N'autoriser la connexion que des ressources matérielles gérées par l'entité ou son prestataire mandaté et participant aux activités, services ou au maintien en condition. Cette mesure interdit l'usage d'équipements personnels.", ei: false, ee: true },
      { id: '9.3-EI/EE', text: "Mettre en œuvre des mesures organisationnelles ou techniques empêchant la connexion de ressources matérielles autres que celles identifiées à la mesure 9.1-EI/EE.", ei: true, ee: true },
      { id: '9.4-EE', text: "Mettre en œuvre des mesures empêchant la connexion de ressources autres que celles identifiées à la mesure 9.2-EE.", ei: false, ee: true },
      { id: '9.5-EI/EE', text: "N'autoriser que les supports amovibles réinscriptibles nécessaires aux activités et services ou au maintien en condition.", ei: true, ee: true },
      { id: '9.6-EI/EE', text: "Doter de mécanismes de protection contre l'exécution de codes malveillants (antivirus, détection sur les terminaux) les postes, serveurs et équipements mobiles traitant des données de sources externes.", ei: true, ee: true },
      { id: '9.7-EI/EE', text: "Analyser les données provenant de sources externes dès leur réception pour y rechercher des codes malveillants : passerelle de messagerie analysant les pièces jointes, sas de décontamination pour les supports amovibles.", ei: true, ee: true },
    ],
  },
  {
    n: 10,
    pillar: 'protection',
    title: "Gestion des identités et des accès des utilisateurs",
    statement:
      "Mettre en œuvre des mécanismes d'identification et d'authentification des utilisateurs et processus automatiques, ainsi que des processus de gestion des droits permettant l'attribution selon le besoin opérationnel, la révocation en cas de changement d'affectation et la désactivation du compte en cas de départ.",
    scope: 'EI+EE',
    nis2: ['Article 21, paragraphe 2, points i) et j)'],
    themes: ['PRO-03'],
    measures: [
      { id: '10.A.1-EI/EE', group: 'Identification', text: "Attribuer des comptes individuels aux utilisateurs et processus automatiques accédant aux ressources ; un utilisateur peut disposer de plusieurs comptes individuels.", ei: true, ee: true },
      { id: '10.A.2-EI/EE', group: 'Identification', text: "Réserver l'emploi d'un compte individuel à l'utilisateur ou au processus auquel il a été attribué.", ei: true, ee: true },
      { id: '10.A.3-EI/EE', group: 'Identification', text: "Lorsque des comptes individuels ne peuvent être créés, mettre en place des mesures réduisant le risque lié aux comptes partagés et assurant la traçabilité de leur usage.", ei: true, ee: true },
      { id: '10.A.4-EI/EE', group: 'Identification', text: "L'accès du public à une information diffusée librement ne requiert pas la création de comptes.", ei: true, ee: true },
      { id: '10.A.5-EI/EE', group: 'Identification', text: "Désactiver les comptes devenus inutiles dans les délais prévus par la politique de gestion des comptes.", ei: true, ee: true },
      { id: '10.A.6-EI/EE', group: 'Identification', text: "Effectuer au moins annuellement une revue des comptes vérifiant le respect des mesures d'identification et corrigeant les anomalies.", ei: true, ee: true },
      { id: '10.B.1-EI/EE', group: 'Authentification', text: "Protéger les accès aux ressources par un mécanisme d'authentification impliquant au moins un élément secret.", ei: true, ee: true },
      { id: '10.B.2-EI/EE', group: 'Authentification', text: "Changer les éléments secrets configurés par défaut avant la mise en service d'une ressource, et s'assurer auprès du fournisseur de disposer des moyens et droits de le faire.", ei: true, ee: true },
      { id: '10.B.3-EI/EE', group: 'Authentification', text: "Renouveler l'élément secret d'un compte partagé à chaque retrait d'un utilisateur de ce compte.", ei: true, ee: true },
      { id: '10.B.4-EI/EE', group: 'Authentification', text: "Restreindre la connaissance de l'élément secret aux seuls utilisateurs autorisés, le cas échéant au moyen d'un coffre-fort de mots de passe.", ei: true, ee: true },
      { id: '10.B.5-EI/EE', group: 'Authentification', text: "Rendre les facteurs d'authentification conformes aux recommandations de l'ANSSI en matière de complexité et de fréquence de renouvellement, en tenant compte des limites de la ressource.", ei: true, ee: true },
      { id: '10.B.6-EI/EE', group: 'Authentification', text: "Lorsque l'élément secret ne peut être modifié, mettre en œuvre un contrôle d'accès approprié et des mesures de réduction du risque lié à un secret fixe.", ei: true, ee: true },
      { id: '10.B.7-EE', group: 'Authentification', text: "Dans le cadre de cette exception, mettre également en œuvre des mesures assurant la traçabilité des accès.", ei: false, ee: true },
      { id: '10.C.1-EI/EE', group: "Droits d'accès", text: "N'attribuer de droits qu'aux utilisateurs et processus automatiques authentifiés.", ei: true, ee: true },
      { id: '10.C.2-EI/EE', group: "Droits d'accès", text: "N'attribuer à chaque utilisateur ou processus que les droits d'accès aux ressources nécessaires aux activités et services ou au maintien en condition.", ei: true, ee: true },
      { id: '10.C.3-EI/EE', group: "Droits d'accès", text: "Pour chaque ressource, n'attribuer les droits qu'aux utilisateurs et processus justifiant d'un besoin au regard de leurs missions.", ei: true, ee: true },
      { id: '10.C.4-EI/EE', group: "Droits d'accès", text: "Effectuer au moins annuellement une revue des droits d'accès et corriger les anomalies.", ei: true, ee: true },
    ],
  },
  {
    n: 11,
    pillar: 'protection',
    title: "Maîtrise de l'administration des systèmes d'information",
    statement:
      "Disposer de comptes d'administration exclusivement dédiés à cet usage et utilisés par les seules personnes autorisées. Les entités essentielles s'assurent en outre de la sécurisation de l'administration de leurs annuaires en s'appuyant sur les recommandations de l'ANSSI.",
    scope: 'EI+EE',
    nis2: ['Article 21, paragraphe 2, point i)'],
    themes: ['PRO-03'],
    measures: [
      { id: '11.A.1-EI/EE', group: "Comptes d'administration", text: "N'effectuer les actions d'administration qu'à partir de comptes d'administration, et n'utiliser ces comptes que pour des actions d'administration.", ei: true, ee: true },
      { id: '11.A.2-EI/EE', group: "Comptes d'administration", text: "N'utiliser les comptes d'administration que par des administrateurs ou des personnes autorisées.", ei: true, ee: true },
      { id: '11.A.3-EI/EE', group: "Comptes d'administration", text: "Appliquer aux comptes d'administration les mesures relatives à la gestion des identités et des accès.", ei: true, ee: true },
      { id: '11.A.4-EE', group: "Comptes d'administration", text: "N'utiliser un compte d'administration que pour se connecter aux ressources qu'il administre ou à une ressource d'administration.", ei: false, ee: true },
      { id: '11.A.5-EI/EE', group: "Comptes d'administration", text: "Lorsqu'une action d'administration ne peut être effectuée depuis un compte dédié, mettre en œuvre des mesures de contrôle de ces actions et de réduction du risque.", ei: true, ee: true },
      { id: '11.A.6-EE', group: "Comptes d'administration", text: "Établir et tenir à jour la liste des comptes d'administration des systèmes d'information.", ei: false, ee: true },
      { id: '11.A.7-EE', group: "Comptes d'administration", text: "Lors de toute modification d'un compte d'administration, vérifier la cohérence des droits avec les besoins d'utilisation et les restreindre au périmètre fonctionnel et technique du compte, de préférence par des groupes.", ei: false, ee: true },
      { id: '11.B.1-EI/EE', group: 'Sécurité des annuaires', text: "Appliquer sans retard injustifié les correctifs de sécurité sur les annuaires gérant les utilisateurs ou les ressources.", ei: true, ee: true },
      { id: '11.B.2-EE', group: 'Sécurité des annuaires', text: "Identifier, pour chaque annuaire, les ressources constituant son « cœur de confiance » : annuaire, ressources l'hébergeant ou permettant d'en prendre le contrôle.", ei: false, ee: true },
      { id: '11.B.3-EE', group: 'Sécurité des annuaires', text: "Réaliser les actions d'administration d'un cœur de confiance depuis des comptes d'administration dédiés à cet usage.", ei: false, ee: true },
      { id: '11.B.4-EE', group: 'Sécurité des annuaires', text: "Réaliser ces actions depuis des ressources exclusivement dédiées à l'administration des cœurs de confiance.", ei: false, ee: true },
      { id: '11.B.5-EE', group: 'Sécurité des annuaires', text: "Interdire les connexions externes à un cœur de confiance vers les ressources d'administration, par un dispositif de filtrage sur ces ressources.", ei: false, ee: true },
      { id: '11.B.6-EE', group: 'Sécurité des annuaires', text: "Effectuer annuellement une revue de la configuration des annuaires afin d'identifier tout élément inutile ou anormal, de préférence à l'aide d'un outil automatisé.", ei: false, ee: true },
      { id: '11.B.7-EE', group: 'Sécurité des annuaires', text: "Mettre en œuvre les recommandations de l'ANSSI relatives au cœur de confiance lorsqu'elles existent : guides de sécurisation, guides de réponse à incident, mémos techniques.", ei: false, ee: true },
    ],
  },
  {
    n: 18,
    pillar: 'protection',
    title: 'Sécurisation de la configuration des ressources',
    statement:
      "Limiter la surface d'attaque en n'installant et ne conservant que les ressources logicielles nécessaires, et en configurant les ressources de manière sécurisée en s'appuyant sur les recommandations de l'ANSSI, de l'éditeur ou du fabricant.",
    scope: 'EE',
    nis2: ['Article 21, paragraphe 2, point e)'],
    themes: ['PRO-04', 'DET-03'],
    measures: [
      { id: '18.1-EE', text: "N'installer et ne conserver que les ressources logicielles nécessaires aux activités et services ou au maintien en condition, par exemple au moyen d'un modèle de configuration centralisé.", ei: false, ee: true },
      { id: '18.2-EE', text: "Lorsqu'une ressource logicielle ne peut être désactivée ou désinstallée, mettre en œuvre des mesures réduisant le risque associé.", ei: false, ee: true },
      { id: '18.3-EE', text: "Configurer les ressources de manière sécurisée en s'appuyant sur les recommandations de l'éditeur, du fabricant ou de l'ANSSI.", ei: false, ee: true },
      { id: '18.4-EE', text: "Effectuer annuellement une revue de configuration vérifiant l'application des mesures précédentes, de préférence à l'aide d'outils automatisés.", ei: false, ee: true },
    ],
  },
  {
    n: 19,
    pillar: 'protection',
    title: "Administration depuis des ressources dédiées",
    statement:
      "Mettre en place, pour l'administration des systèmes d'information, des postes d'administration maîtrisés et conformes aux recommandations de l'ANSSI, ainsi qu'une sécurisation et un cloisonnement des flux dédiés à cette activité.",
    scope: 'EE',
    nis2: ['Article 21, paragraphe 2, points h) et i)'],
    themes: ['PRO-03', 'PRO-01'],
    equivalence: "Le recours à une prestation d'administration et de maintenance sécurisée qualifiée par l'ANSSI est opposable pour les mesures 19.2 à 19.7 et 19.10 à 19.12.",
    measures: [
      { id: '19.1-EE', text: "Effectuer les actions d'administration au moyen d'un réseau d'administration dédié.", ei: false, ee: true },
      { id: '19.2-EE', text: "Faire gérer et configurer les ressources des réseaux d'administration par l'entité ou le prestataire qu'elle a mandaté.", ei: false, ee: true },
      { id: '19.3-EE', text: "N'utiliser les ressources matérielles des réseaux d'administration que pour des actions d'administration.", ei: false, ee: true },
      { id: '19.4-EE', text: "N'utiliser le poste physique servant aux actions d'administration que pour cet usage.", ei: false, ee: true },
      { id: '19.5-EE', text: "Effectuer la connexion des administrateurs au réseau d'administration depuis un poste physique exclusivement dédié à l'administration.", ei: false, ee: true },
      { id: '19.6-EE', text: "Lorsqu'un poste dédié ne peut être fourni, mettre en œuvre des mesures de durcissement et de cloisonnement isolant le système d'exploitation d'administration de celui utilisé pour les autres actions, conformément aux recommandations de l'ANSSI.", ei: false, ee: true },
      { id: '19.7-EE', text: "Connecter les réseaux d'administration aux ressources administrées par une liaison réseau physique dédiée, et administrer ces ressources par leur interface d'administration physique.", ei: false, ee: true },
      { id: '19.8-EE', text: "Faire respecter au réseau d'administration les mêmes modalités de cloisonnement et de filtrage que celles appliquées entre et au sein des systèmes d'information.", ei: false, ee: true },
      { id: '19.9-EE', text: "Lorsqu'une ressource ne peut être administrée par liaison physique ou interface d'administration physique, mettre en œuvre des mesures de réduction du risque de nature logique, conformes aux recommandations de l'ANSSI.", ei: false, ee: true },
      { id: '19.10-EE', text: "Protéger les communications associées aux actions d'administration par des mécanismes de chiffrement et d'authentification conformes à l'état de l'art recommandé par l'ANSSI.", ei: false, ee: true },
      { id: '19.11-EE', text: "Cloisonner les communications d'administration transitant sur des réseaux non dédiés au moyen de mécanismes de chiffrement et d'authentification, par exemple des tunnels chiffrés.", ei: false, ee: true },
      { id: '19.12-EE', text: "Lorsque le chiffrement ou l'authentification de ces communications est impossible, mettre en œuvre des mesures protégeant la confidentialité et l'intégrité des flux et renforçant le contrôle et la traçabilité des actions d'administration.", ei: false, ee: true },
    ],
  },

  // =========================================================================
  // DÉFENSE
  // =========================================================================
  {
    n: 12,
    pillar: 'defense',
    title: 'Identification et réaction aux incidents de sécurité',
    statement:
      "Mettre en œuvre une organisation, des processus et des outils adaptés pour se préparer et réagir aux événements de sécurité susceptibles d'affecter la réalisation des activités ou la fourniture des services.",
    scope: 'EI+EE',
    nis2: ['Article 21, paragraphe 2, point b)', 'Article 23'],
    themes: ['REP-01', 'DET-02'],
    equivalence: PACS,
    measures: [
      { id: '12.1-EE', text: "Élaborer, maintenir à jour et mettre en œuvre une procédure de traitement des incidents de sécurité affectant les systèmes d'information.", ei: false, ee: true },
      { id: '12.2-EE', text: "Mettre en œuvre les outils permettant de collecter les signalements remontés par les employés, les clients et usagers des activités et services, et les prestataires et fournisseurs contractants.", ei: false, ee: true },
      { id: '12.3-EI/EE', text: "Définir et mettre en œuvre les mécanismes permettant d'analyser et de qualifier les événements remontés et d'identifier les incidents potentiels ou avérés.", ei: true, ee: true },
      { id: '12.4-EE', text: "Définir et mettre en œuvre les mécanismes organisationnels et techniques permettant de réagir en cas d'incident et de limiter les conséquences sur la fourniture des services ; les reprendre le cas échéant dans les plans de continuité et de reprise.", ei: false, ee: true },
      { id: '12.5-EE', text: "S'assurer qu'une analyse des causes est réalisée après chaque incident, visant à définir les mesures limitant la vraisemblance d'un nouvel incident ou son impact, et en conserver les preuves.", ei: false, ee: true },
      { id: '12.6-EI/EE', text: "Conserver les relevés techniques pouvant servir d'éléments de preuve en cas de judiciarisation, pour une durée pertinente au regard de la protection des données à caractère personnel et de la finalité du traitement.", ei: true, ee: true },
      { id: '12.7-EE', text: "Protéger les relevés techniques relatifs aux analyses d'incidents d'un incident qui les rendrait inexploitables, par exemple par un stockage hors ligne face à un rançongiciel.", ei: false, ee: true },
    ],
  },
  {
    n: 20,
    pillar: 'defense',
    title: "Supervision de la sécurité des systèmes d'information",
    statement:
      "Dimensionner et opérer le système supportant la supervision de sécurité en adéquation avec la capacité opérationnelle, afin de prendre en compte journaux et événements sans retard injustifié et au maximum sous 24 heures ; mettre en œuvre une démarche d'amélioration continue de la couverture des scénarios de menaces ; conserver les événements et journaux pendant au moins trois mois, sans préjudice des autres obligations légales, notamment en matière de protection des données à caractère personnel.",
    scope: 'EE',
    nis2: ['Article 21, paragraphe 2, points b) et f)'],
    themes: ['DET-01', 'DET-02'],
    equivalence: "Le recours à une prestation de détection des incidents de sécurité qualifiée par l'ANSSI est opposable pour les mesures relatives au dimensionnement, à la maîtrise de l'architecture et à la collecte.",
    measures: [
      { id: '20.1-EE', text: "Dimensionner et opérer le système supportant la supervision de sécurité en adéquation avec la capacité opérationnelle des équipes, afin de traiter journaux et événements sans retard injustifié et au maximum sous 24 heures ouvrées.", ei: false, ee: true },
      { id: '20.2-EE', text: "Élaborer et mettre en œuvre une démarche d'amélioration continue de la supervision : sources de collecte supplémentaires, amélioration des processus, centralisation, corrélation, prise en compte de scénarios de menace additionnels.", ei: false, ee: true },
      { id: '20.3-EE', text: "Maîtriser, directement ou par le prestataire mandaté, l'architecture et la configuration du système supportant la supervision : chaînes de collecte, d'analyse, d'investigation et de signalement.", ei: false, ee: true },
      { id: '20.4-EE', text: "Collecter les données de supervision et les événements de sécurité utiles à la détection des scénarios principaux de menaces, reflétant la variété des activités du système d'information : réseau, système, applicatif, utilisateur.", ei: false, ee: true },
      { id: '20.5-EE', text: "Conserver les données de supervision et les événements de sécurité pendant au moins trois mois, sans préjudice des autres obligations légales et réglementaires, notamment le règlement général sur la protection des données.", ei: false, ee: true },
      { id: '20.6-EE', text: "Protéger les données de supervision et les événements de sécurité d'un incident les rendant inexploitables, par exemple par un stockage hors ligne.", ei: false, ee: true },
    ],
  },

  // =========================================================================
  // RÉSILIENCE
  // =========================================================================
  {
    n: 13,
    pillar: 'resilience',
    title: "Continuité et reprise d'activité",
    statement:
      "Mettre en œuvre des mécanismes de sauvegarde et de restauration opérationnels et les tester au minimum une fois par an. Les entités essentielles définissent et maintiennent à jour des plans de continuité et de reprise d'activité adaptés aux besoins de leurs activités et services.",
    scope: 'EI+EE',
    nis2: ['Article 21, paragraphe 2, point c)'],
    themes: ['RES-01', 'RES-03'],
    measures: [
      { id: '13.1-EI/EE', text: "Définir et mettre en œuvre des procédures de sauvegarde et de restauration des systèmes d'information et des données qu'ils manipulent.", ei: true, ee: true },
      { id: '13.2-EI/EE', text: "Tester au minimum une fois par an les processus de sauvegarde et de restauration, afin de vérifier la bonne réalisation des sauvegardes et leur bonne restauration.", ei: true, ee: true },
      { id: '13.3-EI/EE', text: "Protéger les sauvegardes d'un incident les rendant inexploitables, par exemple par un stockage hors ligne face à un rançongiciel.", ei: true, ee: true },
      { id: '13.4-EE', text: "Définir et documenter, pour chaque activité et service, la durée maximale d'interruption admissible et le point de rétablissement des données.", ei: false, ee: true },
      { id: '13.5-EI/EE', text: "Dimensionner les mécanismes de sauvegarde pour répondre aux besoins de disponibilité des différents services et activités.", ei: true, ee: true },
      { id: '13.6-EE', text: "Définir et mettre en œuvre un plan de continuité et un plan de reprise d'activité adaptés aux scénarios de crise d'origine cyber et cohérents avec la durée maximale d'interruption admissible et le point de rétablissement.", ei: false, ee: true },
      { id: '13.7-EE', text: "Appuyer l'identification des mesures de continuité sur la cartographie de l'écosystème, la procédure de gestion des incidents et la procédure de gestion des crises d'origine cyber.", ei: false, ee: true },
    ],
  },
  {
    n: 14,
    pillar: 'resilience',
    title: "Réaction aux crises d'origine cyber",
    statement:
      "Mettre en œuvre une organisation, des processus et des outils adaptés pour se préparer et réagir aux crises d'origine cyber, et tenir à disposition des autorités les informations relatives aux parties prenantes externes pertinentes. Les entités essentielles mettent en œuvre des retours d'expérience après chaque entraînement, exercice ou crise réelle.",
    scope: 'EI+EE',
    nis2: ['Article 21, paragraphe 2, points c) et j)'],
    themes: ['RES-02', 'REP-03'],
    equivalence: PACS,
    measures: [
      { id: '14.1-EI/EE', text: "Définir, maintenir à jour et mettre en œuvre une procédure de gestion de crise en cas d'incident de sécurité nécessitant le passage en mode crise.", ei: true, ee: true },
      { id: '14.2-EI/EE', text: "Maintenir à jour une liste imprimée des personnes mobilisables dans la gestion de crise sur les sujets de sécurité numérique, avec leurs coordonnées.", ei: true, ee: true },
      { id: '14.3-EI/EE', text: "Rendre cette liste accessible dans un format adapté à la nature de la crise : sur papier si les systèmes d'information sont indisponibles, sous forme numérique si la version papier ne l'est pas.", ei: true, ee: true },
      { id: '14.4-EI/EE', text: "Maintenir à jour un annuaire des parties prenantes externes pertinentes dans la gestion de crise, en s'appuyant sur la cartographie de l'écosystème.", ei: true, ee: true },
      { id: '14.5-EE', text: "Mettre en œuvre des retours d'expérience identifiant les axes d'amélioration et les mesures associées après un entraînement, un exercice ou une crise réelle.", ei: false, ee: true },
      { id: '14.6-EE', text: "Définir, maintenir à jour et mettre en œuvre les critères d'activation et de désactivation du dispositif de gestion de crise prenant en compte les menaces cyber.", ei: false, ee: true },
      { id: '14.7-EE', text: "Définir, maintenir à jour et mettre en œuvre les procédures et mécanismes de gestion de crise adaptés à la menace cyber, en s'appuyant sur les recommandations de l'ANSSI.", ei: false, ee: true },
      { id: '14.8-EE', text: "Définir et mettre en œuvre les mesures permettant d'isoler, de protéger et le cas échéant de reconstruire les systèmes d'information concernés, activables en cas d'incident, en tenant compte des infrastructures et services externalisés.", ei: false, ee: true },
      { id: '14.9-EE', text: "Définir une stratégie de communication adaptée aux crises d'origine cyber : scénarios, schéma d'organisation, outils de pilotage et éléments de langage sur les sujets sensibles.", ei: false, ee: true },
      { id: '14.10-EE', text: "S'assurer de la disponibilité de moyens de communication de secours, si possible sécurisés, lorsque les moyens habituels sont indisponibles.", ei: false, ee: true },
    ],
  },
  {
    n: 15,
    pillar: 'resilience',
    title: 'Exercices, tests et entraînements',
    statement:
      "Réaliser des exercices, tests et entraînements à intervalles réguliers pour vérifier la capacité de l'organisation, des processus, des outils et de la préparation à faire face aux incidents de sécurité et aux crises d'origine cyber.",
    scope: 'EI+EE',
    nis2: ['Article 21, paragraphe 2, points c) et f)'],
    themes: ['RES-04', 'RES-02'],
    equivalence: PACS,
    measures: [
      { id: '15.1-EI/EE', text: "Sensibiliser les personnes mobilisables dans le dispositif de gestion de crise et mettre en œuvre a minima un exercice sur table, à une fréquence définie par l'entité.", ei: true, ee: true },
      { id: '15.2-EE', text: "Définir et mettre en œuvre une stratégie d'entraînement comportant la liste des acteurs, la liste des exercices, les objectifs visés, les moyens de vérification, les scénarios prioritaires et la comitologie de suivi.", ei: false, ee: true },
      { id: '15.3-EE', text: "Faire porter cette stratégie sur la gestion des alertes relatives aux incidents, vulnérabilités et menaces, la continuité et la reprise d'activité, et la gestion des crises d'origine cyber.", ei: false, ee: true },
      { id: '15.4-EE', text: "Décliner la stratégie dans un programme triennal d'entraînement et d'exercice précisant fréquence, nature et objectifs, permettant de tester la gestion des incidents, la gestion de crise, la coopération avec l'écosystème et le volet cyber des plans de continuité et de reprise.", ei: false, ee: true },
    ],
  },
]

interface ObjectiveEn {
  title: string
  statement: string
  equivalence?: string
  measures: Record<string, string>
}

/** « Article 21, paragraphe 2, points e) et g) » → « Article 21(2)(e) and (g) ». */
function articleEn(a: string): string {
  return a
    .replace(/, paragraphe (\d+)/, '($1)')
    .replace(/, points? ([a-z])\)(?: et ([a-z])\))?/, (_, x: string, y?: string) => `(${x})${y ? ` and (${y})` : ''}`)
}

function localize(o: RecyfObjective): RecyfObjective {
  const e = (EN.objectives as Record<string, ObjectiveEn>)[String(o.n)]
  const groups = EN.groups as Record<string, string>
  if (!e) return o
  return {
    ...o,
    title: e.title,
    statement: e.statement,
    equivalence: e.equivalence ?? o.equivalence,
    nis2: o.nis2.map(articleEn),
    measures: o.measures.map((m) => ({
      ...m,
      text: e.measures[m.id] ?? m.text,
      group: m.group ? (groups[m.group] ?? m.group) : undefined,
    })),
  }
}

export const RECYF_OBJECTIVES: RecyfObjective[] = LANG === 'en' ? RECYF_FR.map(localize) : RECYF_FR

export const RECYF_BY_N = new Map(RECYF_OBJECTIVES.map((o) => [o.n, o]))

export const RECYF_PILLARS = [
  { id: 'gouvernance', label: tr('Gouvernance', 'Governance'), objectives: [1, 2, 3, 4, 16, 17] },
  { id: 'protection', label: tr('Protection', 'Protection'), objectives: [5, 6, 7, 8, 9, 10, 11, 18, 19] },
  { id: 'defense', label: tr('Défense', 'Defence'), objectives: [12, 20] },
  { id: 'resilience', label: tr('Résilience', 'Resilience'), objectives: [13, 14, 15] },
] as const

export const RECYF_META = {
  version: '2.5',
  date: '2026-03-17',
  issuer: 'ANSSI',
  url: 'https://messervices.cyber.gouv.fr/documents-ressources/20260317_NIS_V2_ReCyF_v2.5.pdf',
  status: tr("Document de travail, publié avant l'adoption de la loi de transposition et de ses décrets", 'Working document, published before the transposition act and its decrees were adopted'),
  totalMeasures: RECYF_OBJECTIVES.reduce((n, o) => n + o.measures.length, 0),
}
