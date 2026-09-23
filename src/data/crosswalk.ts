import type { CrosswalkTheme } from '@/types/domain'

/**
 * Carte de croisement — exigences unifiées.
 *
 * Chaque thème répond à une question : « quelle action unique satisfait
 * simultanément les textes applicables, et où cette mutualisation cesse-t-elle
 * d'être possible ? »
 *
 * Trois relations sont distinguées :
 *   recouvrement — une action bien menée couvre tous les textes listés ;
 *   divergence   — même sujet, exigences inconciliables : la règle la plus
 *                  stricte s'impose, et elle est nommée ;
 *   hiérarchie   — un texte prime explicitement sur l'autre (lex specialis).
 */
export const CROSSWALK: CrosswalkTheme[] = [
  // ==========================================================================
  // GOUVERNANCE
  // ==========================================================================
  {
    id: 'GOV-01',
    code: 'GOV-01',
    title: "Responsabilité de l'organe de direction",
    domain: 'gouvernance',
    summary:
      "Les trois textes majeurs remontent la conformité au niveau de l'organe de direction, mais avec des conséquences juridiques très inégales. Le RGPD impose de démontrer la conformité sans viser les dirigeants personnellement ; NIS 2 rend les dirigeants responsables de la violation de l'article 21 et permet de leur interdire d'exercer ; DORA leur confie la responsabilité finale du cadre de gestion du risque TIC.",
    unifiedAction:
      "Instituer une instance de gouvernance unique — comité sécurité et conformité — qui approuve formellement les politiques, suit les indicateurs et consigne ses décisions. Une seule délibération, correctement rédigée, vaut approbation au titre des trois textes.",
    relation: 'divergence',
    mappings: [
      {
        regulation: 'RGPD',
        obligationIds: ['RGPD-A5', 'RGPD-A24'],
        requirement: "Mettre en œuvre des mesures permettant de démontrer la conformité, et les réexaminer.",
        nuance: "La responsabilité est celle de la personne morale. Aucune sanction personnelle du dirigeant n'est prévue par le règlement.",
      },
      {
        regulation: 'NIS2',
        obligationIds: ['NIS2-A20'],
        requirement: "Faire approuver les mesures par l'organe de direction, en superviser la mise en œuvre, former ses membres.",
        nuance: "Les dirigeants peuvent être tenus responsables de la violation de l'article 21, et se voir temporairement interdire d'exercer des fonctions dirigeantes (art. 32 § 6).",
      },
      {
        regulation: 'DORA',
        obligationIds: ['DORA-A5', 'DORA-A6'],
        requirement: "L'organe de direction définit, approuve, supervise et répond du cadre de gestion du risque TIC.",
        nuance: "Obligation de formation régulière et d'allocation budgétaire explicite — DORA est le seul texte à exiger un budget identifié.",
      },
    ],
    strictest: {
      regulation: 'NIS2',
      rule: "Formation obligatoire des membres de l'organe de direction et responsabilité personnelle engageable, pouvant aller jusqu'à l'interdiction d'exercer.",
      rationale:
        "C'est le seul des trois textes à prévoir une sanction atteignant la personne physique dirigeante. Calibrer la gouvernance sur NIS 2 satisfait mécaniquement le RGPD et l'essentiel de DORA ; l'inverse n'est pas vrai.",
    },
    recyf: [2],
    evidence: ["Charte de gouvernance sécurité et conformité", "Comptes rendus d'approbation datés", "Attestations de formation des dirigeants"],
    effort: 3,
  },
  {
    id: 'GOV-02',
    code: 'GOV-02',
    title: 'Fonction dédiée et point de contact',
    domain: 'gouvernance',
    summary:
      "Chaque texte impose une figure de référence, mais leurs statuts sont incompatibles : le délégué à la protection des données doit être indépendant et sans conflit d'intérêts, tandis que le point de contact NIS 2 et le responsable DORA sont des fonctions opérationnelles. Fusionner ces rôles dans une seule personne expose à un conflit d'intérêts opposable.",
    unifiedAction:
      "Cartographier les rôles exigés par chaque texte applicable et les attribuer distinctement, en documentant l'absence de conflit d'intérêts pour la fonction de délégué. Une même direction peut les coordonner, mais le délégué ne peut pas être celui qui décide des moyens du traitement.",
    relation: 'divergence',
    mappings: [
      {
        regulation: 'RGPD',
        obligationIds: ['RGPD-A37-39', 'RGPD-A27'],
        requirement: "Désigner un délégué à la protection des données lorsque les critères de l'article 37 sont réunis, et un représentant si l'entité n'est pas établie dans l'Union.",
        nuance: "Le délégué ne reçoit aucune instruction sur l'exercice de ses missions et ne peut être relevé pour les avoir exercées.",
      },
      {
        regulation: 'NIS2',
        obligationIds: ['NIS2-A3', 'NIS2-A26'],
        requirement: "Désigner un point de contact pour l'autorité nationale et, le cas échéant, un représentant dans l'Union.",
        nuance: "Le ReCyF fait de ce point de contact l'interlocuteur privilégié de l'ANSSI, attendu des seules entités essentielles.",
      },
      {
        regulation: 'DORA',
        obligationIds: ['DORA-A6', 'DORA-A14'],
        requirement: "Identifier une fonction de contrôle indépendante du risque TIC et désigner un responsable de la communication de crise.",
        nuance: "L'indépendance porte ici sur la fonction de contrôle, pas sur la communication.",
      },
      { regulation: 'CRA', obligationIds: ['CRA-A13-CONTACT'], requirement: "Désigner un point de contact unique permettant aux utilisateurs de joindre le fabricant, notamment pour signaler une vulnérabilité.", nuance: "Le contact est tourné vers les utilisateurs du produit, non vers une autorité." },
    ],
    strictest: {
      regulation: 'RGPD',
      rule: "Indépendance fonctionnelle du délégué, absence de conflit d'intérêts, rattachement au niveau le plus élevé, impossibilité de le sanctionner pour l'exercice de ses missions.",
      rationale:
        "C'est la seule exigence de statut, et non de simple désignation. Un responsable de la sécurité qui déciderait des moyens de traitement ne peut pas cumuler la fonction de délégué : la CNIL a déjà sanctionné ce cumul.",
    },
    recyf: [2],
    evidence: ["Organigramme des rôles réglementaires", "Lettres de mission", "Analyse d'absence de conflit d'intérêts"],
    effort: 2,
  },
  {
    id: 'GOV-03',
    code: 'GOV-03',
    title: "Enregistrement et déclaration d'identité",
    domain: 'gouvernance',
    summary:
      "Se faire connaître de l'autorité est une obligation propre aux textes cyber. Le RGPD a supprimé la déclaration préalable en 2018 ; NIS 2 et DORA organisent au contraire un recensement, selon des logiques opposées : déclarative et d'identité pour NIS 2, prudentielle et contractuelle pour DORA.",
    unifiedAction:
      "Constituer une fiche d'identité réglementaire unique — raison sociale, établissements, plages d'adresses IP, secteurs, États membres desservis, contacts — et la maintenir comme source unique pour toutes les déclarations. Fixer une alerte à deux semaines sur toute modification.",
    relation: 'recouvrement',
    mappings: [
      {
        regulation: 'NIS2',
        obligationIds: ['NIS2-A3', 'NIS2-A27', 'NIS2-A26'],
        requirement: "Communiquer identité, coordonnées, plages d'adresses IP, secteur et États membres desservis ; signaler toute modification sous deux semaines.",
        nuance: "L'enregistrement est déclaratif : c'est à l'entité de se manifester, y compris si elle n'a pas été sollicitée.",
      },
      {
        regulation: 'DORA',
        obligationIds: ['DORA-A28'],
        requirement: "Remettre annuellement le registre d'information des accords TIC à l'autorité compétente.",
        nuance: "Il ne s'agit pas d'un enregistrement d'identité mais d'une remise périodique de données structurées, aux quinze modèles imposés.",
      },
    ],
    recyf: [1],
    evidence: ["Fiche d'identité réglementaire", "Accusés d'enregistrement", "Journal des modifications déclarées"],
    effort: 1,
  },
  {
    id: 'GOV-04',
    code: 'GOV-04',
    title: 'Formation et sensibilisation',
    domain: 'gouvernance',
    summary:
      "Les quatre textes imposent de former, mais ne visent pas les mêmes publics. NIS 2 et DORA rendent la formation des dirigeants obligatoire, ce que le RGPD n'exige pas.",
    unifiedAction:
      "Bâtir un programme annuel à trois niveaux — organe de direction, personnel, profils sensibles — couvrant protection des données, cybersécurité et résilience, avec émargement et mesure d'assimilation. Un seul programme, trois parcours.",
    relation: 'recouvrement',
    mappings: [
      { regulation: 'RGPD', obligationIds: ['RGPD-A24', 'RGPD-A32'], requirement: "Garantir que toute personne agissant sous autorité ne traite les données que sur instruction, ce qui suppose de l'avoir formée." },
      { regulation: 'NIS2', obligationIds: ['NIS2-A20', 'NIS2-A21-2g'], requirement: "Formation obligatoire des membres de l'organe de direction, et cyberhygiène pour l'ensemble des utilisateurs.", nuance: "Le ReCyF étend la sensibilisation aux prestataires agissant pour le compte de l'entité." },
      { regulation: 'DORA', obligationIds: ['DORA-A5', 'DORA-A13'], requirement: "Programmes de sensibilisation et de formation obligatoires pour le personnel et l'organe de direction, proportionnés au risque." },
    ],
    recyf: [4],
    evidence: ["Plan de formation annuel", "Feuilles d'émargement", "Résultats des tests de sensibilisation"],
    effort: 2,
  },

  // ==========================================================================
  // RISQUES
  // ==========================================================================
  {
    id: 'RSK-01',
    code: 'RSK-01',
    title: 'Analyse de risque et approche par les risques',
    domain: 'risques',
    summary:
      "C'est le point de mutualisation le plus rentable du dispositif : les quatre textes exigent une analyse de risque. Les périmètres diffèrent cependant — droits des personnes pour le RGPD, réseaux et systèmes pour NIS 2, fonctions critiques pour DORA, produit mis sur le marché pour le CRA.",
    unifiedAction:
      "Conduire une analyse de risque unique, structurée par actif et par fonction, dont les sorties alimentent les quatre lectures : impact sur les personnes, impact sur les services, impact sur les fonctions critiques, impact sur la continuité physique. Une méthode unique — EBIOS Risk Manager s'y prête — et quatre restitutions.",
    relation: 'recouvrement',
    mappings: [
      { regulation: 'RGPD', obligationIds: ['RGPD-A32', 'RGPD-A35'], requirement: "Apprécier le risque pour les droits et libertés des personnes physiques et calibrer les mesures en conséquence.", nuance: "Le risque s'apprécie du point de vue de la personne concernée, non de l'organisation. C'est un renversement de perspective que les autres textes n'opèrent pas." },
      { regulation: 'NIS2', obligationIds: ['NIS2-A21-1', 'NIS2-A21-2a'], requirement: "Fonder les mesures sur une approche « tous risques » couvrant l'environnement physique.", nuance: "Le ReCyF réserve l'obligation d'une méthode formelle d'analyse de risque aux entités essentielles (objectif 16)." },
      { regulation: 'DORA', obligationIds: ['DORA-A6', 'DORA-A8'], requirement: "Cadre documenté, réexaminé annuellement et après chaque incident majeur, adossé au recensement des fonctions critiques ou importantes." },
      { regulation: 'CRA', obligationIds: ['CRA-A13-RISK'], requirement: "Évaluation des risques de cybersécurité par produit, documentée et mise à jour pendant toute la période d'assistance.", nuance: "Le risque s'apprécie à l'échelle du produit et de son utilisation raisonnablement prévisible, non de l'organisation qui le fabrique." },
    ],
    recyf: [16],
    evidence: ["Méthode d'analyse de risque documentée", "Registre des risques", "Traces de réexamen"],
    effort: 4,
  },
  {
    id: 'RSK-02',
    code: 'RSK-02',
    title: "Analyse d'impact préalable",
    domain: 'risques',
    summary:
      "Seul le RGPD impose une analyse d'impact préalable formelle, assortie d'une consultation de l'autorité en cas de risque résiduel élevé. Aucun autre texte n'a d'équivalent : NIS 2 et DORA raisonnent en évaluation continue, non en autorisation préalable.",
    unifiedAction:
      "Intégrer le déclenchement d'une analyse d'impact au jalon de conception des projets, en réutilisant les livrables de l'analyse de risque générale pour la partie menaces et mesures. Seule la partie « atteinte aux droits et libertés » est spécifique au RGPD.",
    relation: 'recouvrement',
    mappings: [
      { regulation: 'RGPD', obligationIds: ['RGPD-A35', 'RGPD-A36', 'RGPD-A9'], requirement: "Analyse d'impact obligatoire en cas de risque élevé ; consultation préalable de l'autorité si le risque résiduel demeure élevé." },
      { regulation: 'DORA', obligationIds: ['DORA-A8', 'DORA-A29'], requirement: "Évaluation préalable du risque de concentration avant tout accord portant sur une fonction critique ou importante.", nuance: "Même logique d'évaluation ex ante, mais portant sur la dépendance à un tiers et non sur les droits des personnes." },
    ],
    evidence: ["Analyses d'impact réalisées", "Critères de déclenchement documentés"],
    effort: 3,
  },

  // ==========================================================================
  // PROTECTION
  // ==========================================================================
  {
    id: 'PRO-01',
    code: 'PRO-01',
    title: 'Mesures techniques et organisationnelles de sécurité',
    domain: 'protection',
    summary:
      "Le recouvrement le plus large et le plus connu : RGPD article 32, NIS 2 article 21 et DORA article 9 exigent tous des mesures de sécurité adaptées au risque. Mais là où le RGPD s'arrête à une obligation de moyens, NIS 2 et DORA énumèrent des mesures nommées, et DORA en fixe le contenu minimal par norme technique.",
    unifiedAction:
      "Établir une politique de sécurité des systèmes d'information unique, dont l'architecture épouse les dix mesures de l'article 21 § 2 de NIS 2 et les chapitres du règlement délégué 2024/1774. Cette structure couvre par construction l'article 32 du RGPD, qui est moins exigeant.",
    relation: 'recouvrement',
    mappings: [
      { regulation: 'RGPD', obligationIds: ['RGPD-A32'], requirement: "Mesures appropriées garantissant un niveau de sécurité adapté au risque, dont pseudonymisation et chiffrement.", nuance: "Obligation de résultat sur la finalité, de moyens sur les modalités : aucune mesure n'est nommée comme obligatoire." },
      { regulation: 'NIS2', obligationIds: ['NIS2-A21-1', 'NIS2-A21-2a', 'NIS2-A21-2i'], requirement: "Dix catégories de mesures nommément énumérées à l'article 21 § 2, applicables au minimum.", nuance: "Le règlement d'exécution 2024/2690 rend ces mesures chiffrées et opposables pour les fournisseurs numériques." },
      { regulation: 'DORA', obligationIds: ['DORA-A9', 'DORA-A7'], requirement: "Politiques, procédures et outils TIC assurant résilience, continuité, disponibilité et sécurité des données.", nuance: "Le règlement délégué 2024/1774 fixe le contenu minimal obligatoire de chaque politique — c'est le niveau de détail le plus élevé des quatre textes." },
      { regulation: 'CRA', obligationIds: ['CRA-ANX1-P1'], requirement: "Exigences essentielles de sécurité du produit mis sur le marché (annexe I, partie I).", nuance: "Obligation de résultat portant sur le produit, pas sur le système d'information de l'entreprise." },
    ],
    recyf: [5, 7, 9, 18],
    evidence: ["Politique de sécurité des systèmes d'information", "Référentiel de mesures et de contrôles", "Rapports d'évaluation d'efficacité"],
    effort: 5,
  },
  {
    id: 'PRO-02',
    code: 'PRO-02',
    title: 'Chiffrement et cryptographie',
    domain: 'protection',
    summary:
      "Le RGPD cite le chiffrement comme mesure appropriée et en fait une cause d'exonération de la communication aux personnes en cas de violation. NIS 2 et DORA vont plus loin en exigeant une politique cryptographique formalisée, incluant la gestion du cycle de vie des clés.",
    unifiedAction:
      "Rédiger une politique cryptographique unique définissant algorithmes, longueurs de clés, cas d'usage et gestion du cycle de vie, puis l'appliquer au repos et en transit. Cette politique sert simultanément de mesure article 32 et d'exonération potentielle de l'article 34.",
    relation: 'recouvrement',
    mappings: [
      { regulation: 'RGPD', obligationIds: ['RGPD-A32', 'RGPD-A34'], requirement: "Chiffrement cité comme mesure appropriée ; dispense de communication aux personnes si les données sont rendues incompréhensibles.", nuance: "C'est la seule disposition du RGPD où une mesure technique précise produit un effet juridique direct." },
      { regulation: 'NIS2', obligationIds: ['NIS2-A21-2h'], requirement: "Politiques et procédures relatives à l'utilisation de la cryptographie et, le cas échéant, du chiffrement." },
      { regulation: 'DORA', obligationIds: ['DORA-A9'], requirement: "Chiffrement des données au repos, en transit et, le cas échéant, en cours d'utilisation.", nuance: "DORA est le seul à viser explicitement le chiffrement en cours d'utilisation." },
      { regulation: 'CRA', obligationIds: ['CRA-ANX1-P1'], requirement: "Protection de la confidentialité et de l'intégrité des données stockées, transmises ou traitées par le produit, notamment par chiffrement." },
    ],
    recyf: [7],
    evidence: ["Politique cryptographique", "Inventaire des clés et certificats", "Configuration des protocoles"],
    effort: 3,
  },
  {
    id: 'PRO-03',
    code: 'PRO-03',
    title: 'Gestion des identités et des accès',
    domain: 'protection',
    summary:
      "Trois textes convergent sur le contrôle d'accès, mais NIS 2 est le seul à nommer explicitement l'authentification multifacteur, et le ReCyF y consacre deux objectifs entiers avec une distinction nette entre accès utilisateurs et accès d'administration.",
    unifiedAction:
      "Déployer un dispositif unique de gestion des identités : moindre privilège, revue périodique des habilitations, authentification multifacteur sur les accès distants et les comptes à privilèges, et séparation stricte des comptes d'administration.",
    relation: 'recouvrement',
    mappings: [
      { regulation: 'RGPD', obligationIds: ['RGPD-A32', 'RGPD-A5'], requirement: "Garantir la confidentialité, et limiter l'accessibilité des données au strict nécessaire." },
      { regulation: 'NIS2', obligationIds: ['NIS2-A21-2i', 'NIS2-A21-2j'], requirement: "Politiques de contrôle d'accès, gestion des actifs, et recours à l'authentification multifacteur ou continue selon les besoins." },
      { regulation: 'DORA', obligationIds: ['DORA-A9'], requirement: "Gestion des accès fondée sur le moindre privilège, avec contrôles renforcés sur les accès privilégiés." },
      { regulation: 'CRA', obligationIds: ['CRA-ANX1-P1'], requirement: "Protection du produit contre les accès non autorisés par des mécanismes d'authentification et de gestion des accès." },
    ],
    recyf: [8, 10, 11, 19],
    evidence: ["Politique de contrôle d'accès", "Comptes rendus de revue d'habilitations", "Périmètre de déploiement de l'authentification multifacteur"],
    effort: 4,
  },
  {
    id: 'PRO-04',
    code: 'PRO-04',
    title: 'Sécurité par conception, développement et changements',
    domain: 'protection',
    summary:
      "Le RGPD impose la protection des données dès la conception et par défaut ; NIS 2 vise la sécurité de l'acquisition, du développement et de la maintenance ; DORA encadre la gestion des changements TIC. Trois formulations d'une même discipline d'ingénierie.",
    unifiedAction:
      "Insérer dans le cycle de vie projet un jalon de sécurité et de protection des données unique, couvrant exigences de sécurité, minimisation, paramétrage par défaut, revue de code et procédure de changement avec retour arrière.",
    relation: 'recouvrement',
    mappings: [
      { regulation: 'RGPD', obligationIds: ['RGPD-A25'], requirement: "Protection des données dès la conception et par défaut : minimisation du volume, de l'étendue, de la durée et de l'accessibilité.", nuance: "Le « par défaut » est une obligation autonome : la configuration initiale doit être la plus protectrice, sans action de l'utilisateur." },
      { regulation: 'NIS2', obligationIds: ['NIS2-A21-2e'], requirement: "Sécurité de l'acquisition, du développement et de la maintenance, y compris traitement et divulgation des vulnérabilités." },
      { regulation: 'DORA', obligationIds: ['DORA-A9'], requirement: "Procédure documentée de gestion des changements TIC, avec validation et réversibilité." },
      { regulation: 'CRA', obligationIds: ['CRA-ANX1-P1', 'CRA-A13-RISK'], requirement: "Sécurité dès la conception, configuration sécurisée par défaut, surface d'attaque réduite.", nuance: "Le CRA est le texte le plus exigeant sur la conception : il en fait une condition de mise sur le marché." },
    ],
    recyf: [5, 18],
    evidence: ["Méthodologie projet incluant le jalon sécurité", "Politique de développement sécurisé", "Registre des changements"],
    effort: 4,
  },
  {
    id: 'PRO-05',
    code: 'PRO-05',
    title: 'Sécurité physique et environnementale',
    domain: 'protection',
    summary:
      "Aucun des textes ne construit de régime détaillé de protection physique, mais aucun ne l'exclut. NIS 2 vise expressément l'environnement physique dans son approche « tous risques », et c'est le ReCyF qui en donne la traduction concrète : registre des visiteurs, droits d'accès physique au strict besoin, protection renforcée des salles serveurs pour les entités essentielles.",
    unifiedAction:
      "Traiter la sécurité physique comme un volet à part entière de la politique de sécurité : contrôle des accès aux locaux, détection d'intrusion, surveillance, protection des zones hébergeant des systèmes critiques.",
    relation: 'recouvrement',
    mappings: [
      { regulation: 'RGPD', obligationIds: ['RGPD-A32'], requirement: "La sécurité du traitement couvre implicitement la protection physique des supports.", nuance: "Aucune exigence physique nommée : elle se déduit de l'obligation générale de sécurité." },
      { regulation: 'NIS2', obligationIds: ['NIS2-A21-1'], requirement: "L'approche « tous risques » vise expressément l'environnement physique des réseaux et systèmes." },
      { regulation: 'DORA', obligationIds: ['DORA-A9'], requirement: "Protection des composantes et infrastructures physiques pertinentes." },
    ],
    recyf: [6],
    evidence: ["Plan de sécurité physique des sites", "Procédures de contrôle d'accès aux locaux", "Registre des visiteurs"],
    effort: 3,
  },
  {
    id: 'PRO-06',
    code: 'PRO-06',
    title: 'Sécurité des ressources humaines',
    domain: 'protection',
    summary:
      "NIS 2 encadre le cycle de vie des personnes — arrivée, mobilité, départ — et le ReCyF y ajoute les clauses de confidentialité dans les contrats de travail. Toute vérification menée à ce titre est un traitement de données qui doit lui-même être conforme au RGPD : un cas net où un texte engendre une obligation au titre d'un autre.",
    unifiedAction:
      "Formaliser les procédures d'arrivée, de mobilité et de départ avec restitution systématique des accès, identifier les fonctions sensibles, et encadrer toute vérification d'antécédents par une base juridique et une information des personnes conformes au RGPD.",
    relation: 'recouvrement',
    mappings: [
      { regulation: 'RGPD', obligationIds: ['RGPD-A5', 'RGPD-A9'], requirement: "Toute vérification d'antécédents constitue un traitement, soumis à base juridique, minimisation et information.", nuance: "Les données d'infractions relèvent de l'article 10 et ne peuvent être traitées que sous contrôle de l'autorité publique." },
      { regulation: 'NIS2', obligationIds: ['NIS2-A21-2i', 'NIS2-A21-2g'], requirement: "Sécurité des ressources humaines et pratiques de cyberhygiène." },
    ],
    recyf: [4, 10],
    evidence: ["Procédures arrivée / mobilité / départ", "Liste des fonctions sensibles", "Base juridique des vérifications"],
    effort: 3,
  },

  // ==========================================================================
  // DÉTECTION
  // ==========================================================================
  {
    id: 'DET-01',
    code: 'DET-01',
    title: 'Journalisation et traçabilité',
    domain: 'detection',
    summary:
      "La journalisation illustre une tension récurrente : les textes cyber poussent à collecter et conserver largement, le RGPD impose de minimiser et de borner la conservation. Les journaux contenant des identifiants et des adresses IP sont des données personnelles.",
    unifiedAction:
      "Définir une politique de journalisation unique fixant, par catégorie de journal, ce qui est collecté, pourquoi, pendant combien de temps et qui y accède — puis inscrire cette politique au registre des traitements. Le besoin de détection fixe le plancher, la minimisation fixe le plafond.",
    relation: 'divergence',
    mappings: [
      { regulation: 'RGPD', obligationIds: ['RGPD-A5', 'RGPD-A30'], requirement: "Limiter la conservation à la durée nécessaire et documenter le traitement que constitue la journalisation.", nuance: "La CNIL retient généralement six mois comme durée de conservation de principe des journaux techniques, sauf obligation légale contraire." },
      { regulation: 'NIS2', obligationIds: ['NIS2-A21-2b', 'NIS2-A21-2i'], requirement: "Journalisation nécessaire à la détection, à la qualification et à l'investigation des incidents." },
      { regulation: 'DORA', obligationIds: ['DORA-A10', 'DORA-A17'], requirement: "Journalisation des incidents et surveillance des activités, avec conservation permettant l'analyse des causes profondes.", nuance: "Les normes techniques imposent une conservation cohérente avec les besoins d'investigation prudentielle." },
    ],
    strictest: {
      regulation: 'DORA',
      rule: "Conservation suffisante pour permettre l'analyse des causes profondes et la reconstitution prudentielle des incidents, ce qui excède la durée de principe retenue en matière de journaux techniques.",
      rationale:
        "Lorsque DORA s'applique, la durée de conservation doit être portée au niveau prudentiel, mais elle doit alors être justifiée et documentée au registre des traitements. C'est la durée, et non la collecte, qui doit être arbitrée.",
    },
    recyf: [20],
    evidence: ["Politique de journalisation", "Matrice des durées de conservation par type de journal", "Inscription au registre des traitements"],
    effort: 3,
  },
  {
    id: 'DET-02',
    code: 'DET-02',
    title: 'Détection et supervision de sécurité',
    domain: 'detection',
    summary:
      "NIS 2 et DORA exigent une capacité de détection active. Le ReCyF réserve la supervision avancée aux entités essentielles, ce qui en fait l'un des rares points où la qualification NIS 2 change matériellement l'investissement à consentir.",
    unifiedAction:
      "Mettre en place une capacité de détection dimensionnée sur la qualification : dispositifs de détection et traitement des alertes pour toutes les entités, supervision continue avec analyse des événements pour les entités essentielles et les entités financières.",
    relation: 'recouvrement',
    mappings: [
      { regulation: 'NIS2', obligationIds: ['NIS2-A21-2b', 'NIS2-A30'], requirement: "Capacité d'identification et de réaction aux incidents ; participation facultative aux dispositifs de partage." },
      { regulation: 'DORA', obligationIds: ['DORA-A10', 'DORA-A45'], requirement: "Mécanismes de détection rapide des activités anormales, lignes d'alerte multiples, seuils définis." },
      { regulation: 'RGPD', obligationIds: ['RGPD-A33'], requirement: "Sans capacité de détection, le délai de 72 heures de notification devient inapplicable.", nuance: "L'obligation de détection est indirecte mais contraignante : l'autorité apprécie la date de prise de connaissance au regard des moyens dont l'organisation aurait dû disposer." },
    ],
    recyf: [12, 20],
    evidence: ["Description du dispositif de détection", "Procédure de traitement des alertes", "Indicateurs de couverture"],
    effort: 4,
  },
  {
    id: 'DET-03',
    code: 'DET-03',
    title: 'Gestion des vulnérabilités',
    domain: 'detection',
    summary:
      "NIS 2 traite la vulnérabilité sous l'angle de la divulgation coordonnée ; DORA sous celui du test périodique. La combinaison des deux donne un cycle complet : découvrir, qualifier, corriger, vérifier.",
    unifiedAction:
      "Organiser un cycle unique de gestion des vulnérabilités avec veille, délais de correction différenciés par criticité, et canal de divulgation coordonnée accessible depuis l'extérieur.",
    relation: 'recouvrement',
    mappings: [
      { regulation: 'NIS2', obligationIds: ['NIS2-A21-2e'], requirement: "Traitement et divulgation des vulnérabilités, intégrés à la sécurité du développement et de la maintenance." },
      { regulation: 'DORA', obligationIds: ['DORA-A25', 'DORA-A24'], requirement: "Évaluations de vulnérabilité, analyses de sources ouvertes, analyses de la sécurité des réseaux, avec correction des déficiences selon un calendrier arrêté." },
      { regulation: 'RGPD', obligationIds: ['RGPD-A32'], requirement: "L'absence de correction d'une vulnérabilité connue est régulièrement retenue comme manquement à l'obligation de sécurité." },
      { regulation: 'CRA', obligationIds: ['CRA-ANX1-P2', 'CRA-A14-VULN'], requirement: "Nomenclature logicielle, correction sans délai, tests réguliers, divulgation coordonnée et publication des vulnérabilités corrigées.", nuance: "Seul texte à imposer une nomenclature logicielle et la publication des vulnérabilités corrigées." },
    ],
    recyf: [5, 18],
    evidence: ["Procédure de gestion des vulnérabilités", "Délais de correction par criticité", "Politique de divulgation coordonnée"],
    effort: 3,
  },

  // ==========================================================================
  // RÉPONSE
  // ==========================================================================
  {
    id: 'REP-01',
    code: 'REP-01',
    title: 'Processus de gestion des incidents',
    domain: 'reponse',
    summary:
      "Les quatre textes exigent un processus de gestion des incidents, mais chacun définit son propre seuil de qualification : violation de données pour le RGPD, incident important pour NIS 2, incident majeur pour DORA, incident grave affectant la sécurité d'un produit pour le CRA. Un même événement peut relever de plusieurs qualifications simultanément.",
    unifiedAction:
      "Construire une procédure unique de gestion des incidents, dont l'étape de qualification applique en parallèle les quatre grilles et déclenche automatiquement les notifications correspondantes. Le processus est commun ; seule la qualification est multiple.",
    relation: 'recouvrement',
    mappings: [
      { regulation: 'RGPD', obligationIds: ['RGPD-A33'], requirement: "Qualifier la violation, documenter tout incident même non notifié, évaluer le risque pour les personnes." },
      { regulation: 'NIS2', obligationIds: ['NIS2-A21-2b', 'NIS2-A23-1'], requirement: "Processus de gestion des incidents et qualification de l'incident important selon deux critères alternatifs." },
      { regulation: 'DORA', obligationIds: ['DORA-A17', 'DORA-A18', 'DORA-A13'], requirement: "Processus documenté, classification selon sept critères, analyse des causes profondes après chaque perturbation majeure.", nuance: "DORA est le seul à imposer une grille de classification chiffrée par norme technique." },
      { regulation: 'CRA', obligationIds: ['CRA-A14-INC'], requirement: "Qualification des incidents graves ayant des répercussions sur la sécurité d'un produit." },
    ],
    recyf: [12],
    evidence: ["Procédure unique de gestion des incidents", "Grille de qualification à quatre entrées", "Registre des incidents"],
    effort: 4,
  },
  {
    id: 'REP-02',
    code: 'REP-02',
    title: "Notification des incidents à l'autorité",
    domain: 'reponse',
    summary:
      "C'est la divergence la plus opérationnelle du dispositif : quatre régimes de notification, quatre autorités, quatre horloges. Un incident touchant une banque et des données personnelles peut appeler une déclaration à l'ACPR, une alerte à l'ANSSI et une notification à la CNIL, avec des délais et des contenus distincts.",
    unifiedAction:
      "Établir une matrice de notification unique — événement, qualification, autorité, délai, modèle, responsable — et la répéter en exercice. L'horloge la plus courte commande la mobilisation de la cellule de crise, même si les autres délais sont plus longs.",
    relation: 'divergence',
    mappings: [
      { regulation: 'RGPD', obligationIds: ['RGPD-A33'], requirement: "Notification à la CNIL dans les 72 heures après prise de connaissance, sauf risque improbable pour les droits et libertés." },
      { regulation: 'NIS2', obligationIds: ['NIS2-A23-1', 'NIS2-A23-4'], requirement: "Alerte précoce au CSIRT sous 24 heures, notification d'incident sous 72 heures, rapport final sous un mois.", nuance: "Délai unique de 24 heures pour les prestataires de services de confiance." },
      { regulation: 'DORA', obligationIds: ['DORA-A19', 'DORA-A18'], requirement: "Notification initiale, rapport intermédiaire et rapport final à l'autorité compétente, selon les délais du règlement délégué 2025/301, sur modèles harmonisés obligatoires." },
      { regulation: 'CRA', obligationIds: ['CRA-A14-VULN', 'CRA-A14-INC'], requirement: "Alerte précoce sous 24 heures, notification sous 72 heures, rapport final 14 jours après correctif ou un mois après notification, via la plateforme unique de l'ENISA.", nuance: "Déclenché par un produit, non par un système d'information : un éditeur peut devoir notifier au titre du CRA sans être assujetti à NIS 2." },
    ],
    strictest: {
      regulation: 'DORA',
      rule: "La notification initiale DORA est la plus précoce du dispositif, et elle emprunte un modèle harmonisé obligatoire dont l'usage n'est pas laissé à l'appréciation de l'entité.",
      rationale:
        "Pour une entité financière traitant des données personnelles, la contrainte de conception est la suivante : la cellule de crise doit être en mesure de produire une première déclaration structurée en quelques heures, alors que la qualification RGPD de la violation n'est souvent pas encore établie. Dimensionner sur DORA, puis dérouler NIS 2 et le RGPD.",
    },
    evidence: ["Matrice de notification multi-autorités", "Modèles pré-remplis par régime", "Comptes rendus d'exercices de notification"],
    effort: 4,
  },
  {
    id: 'REP-03',
    code: 'REP-03',
    title: 'Communication aux personnes et aux destinataires',
    domain: 'reponse',
    summary:
      "Au-delà de l'autorité, les textes imposent d'informer ceux qui subissent l'incident : les personnes concernées pour le RGPD, les destinataires des services pour NIS 2, les clients pour DORA, les utilisateurs du produit pour le CRA. Les déclencheurs diffèrent — risque élevé, atteinte à la fourniture du service, incidence sur les intérêts financiers, vulnérabilité exploitée.",
    unifiedAction:
      "Préparer un jeu de modèles de communication par public et par déclencheur, validés en amont par les directions juridique et communication, afin que la rédaction ne soit pas produite sous la pression de la crise.",
    relation: 'recouvrement',
    mappings: [
      { regulation: 'RGPD', obligationIds: ['RGPD-A34'], requirement: "Communication aux personnes concernées en cas de risque élevé, sauf données rendues incompréhensibles par chiffrement." },
      { regulation: 'NIS2', obligationIds: ['NIS2-A23-2'], requirement: "Information des destinataires des services sur les incidents importants et les mesures face aux cybermenaces." },
      { regulation: 'DORA', obligationIds: ['DORA-A19', 'DORA-A14'], requirement: "Information des clients lorsque l'incident a une incidence sur leurs intérêts financiers ; plan de communication de crise." },
      { regulation: 'CRA', obligationIds: ['CRA-A14-USERS'], requirement: "Information des utilisateurs sur les vulnérabilités exploitées et les incidents graves, avec les mesures qu'ils peuvent prendre." },
    ],
    recyf: [14],
    evidence: ["Modèles de communication par public", "Plan de communication de crise", "Historique des communications émises"],
    effort: 2,
  },

  // ==========================================================================
  // RÉSILIENCE
  // ==========================================================================
  {
    id: 'RES-01',
    code: 'RES-01',
    title: 'Continuité des activités et reprise',
    domain: 'resilience',
    summary:
      "Le RGPD exige de pouvoir rétablir la disponibilité des données dans des délais appropriés ; NIS 2 et DORA construisent un régime complet de continuité. DORA est le plus prescriptif : objectifs de rétablissement chiffrés, tests annuels, déclaration des pertes.",
    unifiedAction:
      "Bâtir un plan de continuité unique, fondé sur les fonctions critiques identifiées, avec des objectifs de temps et de point de rétablissement définis par fonction, testé au minimum annuellement.",
    relation: 'recouvrement',
    mappings: [
      { regulation: 'RGPD', obligationIds: ['RGPD-A32'], requirement: "Capacité à rétablir la disponibilité et l'accès aux données dans des délais appropriés en cas d'incident." },
      { regulation: 'NIS2', obligationIds: ['NIS2-A21-2c'], requirement: "Continuité des activités, gestion des sauvegardes, reprise des activités et gestion des crises." },
      { regulation: 'DORA', obligationIds: ['DORA-A11', 'DORA-A12'], requirement: "Politique de continuité TIC, objectifs de rétablissement, tests annuels, registre des activités pendant les perturbations.", nuance: "DORA impose en outre d'estimer et de déclarer aux autorités les coûts et pertes agrégés des incidents majeurs." },
    ],
    recyf: [13],
    evidence: ["Plan de continuité d'activité", "Objectifs de rétablissement par fonction", "Rapports de tests annuels"],
    effort: 5,
  },
  {
    id: 'RES-02',
    code: 'RES-02',
    title: 'Gestion de crise',
    domain: 'resilience',
    summary:
      "NIS 2 et DORA imposent une organisation de crise formalisée. Le ReCyF ajoute une exigence souvent négligée : disposer de moyens de communication de secours indépendants du système d'information courant — précisément parce qu'une crise d'origine cyber peut rendre la messagerie inutilisable.",
    unifiedAction:
      "Formaliser un dispositif de crise unique — composition, critères de déclenchement, main courante, moyens de communication de secours hors du système d'information principal — et l'exercer selon une périodicité définie.",
    relation: 'recouvrement',
    mappings: [
      { regulation: 'NIS2', obligationIds: ['NIS2-A21-2c', 'NIS2-A21-2j'], requirement: "Gestion des crises et systèmes sécurisés de communication d'urgence au sein de l'entité." },
      { regulation: 'DORA', obligationIds: ['DORA-A11', 'DORA-A14'], requirement: "Fonction de gestion de crise, plans de communication, personne désignée pour la communication externe." },
    ],
    recyf: [14],
    evidence: ["Dispositif de gestion de crise", "Annuaire de crise hors ligne", "Comptes rendus d'exercices"],
    effort: 4,
  },
  {
    id: 'RES-03',
    code: 'RES-03',
    title: 'Sauvegardes et restauration',
    domain: 'resilience',
    summary:
      "DORA est ici nettement plus exigeant que les autres textes : il impose la séparation physique et logique des systèmes de sauvegarde et la vérification des données restaurées dans un environnement isolé avant retour en production — deux mesures que ni le RGPD ni NIS 2 ne nomment.",
    unifiedAction:
      "Définir une politique de sauvegarde unique alignée sur le niveau DORA : périmètre et fréquence par criticité, isolement physique et logique, tests de restauration périodiques en environnement séparé.",
    relation: 'recouvrement',
    mappings: [
      { regulation: 'RGPD', obligationIds: ['RGPD-A32'], requirement: "Rétablissement de la disponibilité et de l'accès aux données en cas d'incident." },
      { regulation: 'NIS2', obligationIds: ['NIS2-A21-2c'], requirement: "Gestion des sauvegardes dans le cadre de la continuité des activités." },
      { regulation: 'DORA', obligationIds: ['DORA-A12'], requirement: "Séparation physique et logique des sauvegardes, vérification des données restaurées en environnement isolé, capacités redondantes de niveau équivalent.", nuance: "Exigence directement issue du retour d'expérience sur les rançongiciels ayant chiffré les sauvegardes en même temps que la production." },
    ],
    recyf: [13],
    evidence: ["Politique de sauvegarde", "Preuves d'isolement des sauvegardes", "Rapports de tests de restauration"],
    effort: 4,
  },
  {
    id: 'RES-04',
    code: 'RES-04',
    title: 'Tests, exercices et audits',
    domain: 'resilience',
    summary:
      "Tous les textes demandent de vérifier l'efficacité des mesures, mais l'intensité varie fortement : simple évaluation régulière pour le RGPD, audits réservés aux entités essentielles dans le ReCyF, programme complet et tests de pénétration fondés sur la menace tous les trois ans pour DORA.",
    unifiedAction:
      "Construire un plan pluriannuel de contrôle unique combinant contrôles internes, audits, tests techniques et exercices, dont la profondeur est calibrée sur le régime le plus exigeant applicable à l'entité.",
    relation: 'divergence',
    mappings: [
      { regulation: 'RGPD', obligationIds: ['RGPD-A32', 'RGPD-A40-43'], requirement: "Procédure visant à tester, analyser et évaluer régulièrement l'efficacité des mesures.", nuance: "Aucune périodicité ni méthode imposée." },
      { regulation: 'NIS2', obligationIds: ['NIS2-A21-2f', 'NIS2-A32', 'NIS2-A24'], requirement: "Politiques d'évaluation de l'efficacité ; les entités essentielles sont soumises à des audits de sécurité à leurs frais.", nuance: "Le ReCyF réserve l'obligation d'audit périodique aux entités essentielles (objectif 17)." },
      { regulation: 'DORA', obligationIds: ['DORA-A24', 'DORA-A25', 'DORA-A26'], requirement: "Programme de tests annuel sur les fonctions critiques, éventail de tests imposé, tests de pénétration fondés sur la menace au moins triennaux pour les entités identifiées." },
      { regulation: 'CRA', obligationIds: ['CRA-A32-CONF', 'CRA-ANX1-P2'], requirement: "Évaluation de la conformité selon la catégorie du produit, et tests de sécurité efficaces et réguliers.", nuance: "Pour les produits de classe II et critiques, l'évaluation par un tiers est obligatoire." },
    ],
    strictest: {
      regulation: 'DORA',
      rule: "Test de pénétration fondé sur la menace au moins tous les trois ans, en production réelle, sur un périmètre validé par l'autorité et attesté par elle.",
      rationale:
        "C'est le seul dispositif où l'autorité valide le périmètre en amont et atteste du résultat en aval. Un programme de tests calibré sur cette exigence absorbe sans difficulté les attentes de NIS 2 et du RGPD.",
    },
    recyf: [15, 17],
    evidence: ["Plan pluriannuel de contrôle", "Rapports d'audit et de tests", "Attestations d'autorité le cas échéant"],
    effort: 5,
  },

  {
    id: 'RES-05',
    code: 'RES-05',
    title: 'Maintien en sécurité et fin de vie',
    domain: 'resilience',
    summary:
      "Le même sujet vu des deux côtés de la relation commerciale. Le CRA oblige le fabricant à garantir des mises à jour de sécurité pendant au moins cinq ans et à annoncer la fin d'assistance ; NIS 2 et DORA obligent l'entité utilisatrice à ne faire tourner que des versions supportées et à anticiper les systèmes en fin de vie. Une entreprise qui édite un logiciel et en consomme d'autres porte les deux obligations à la fois.",
    unifiedAction:
      "Tenir un registre unique des produits et composants avec leur date de fin d'assistance — celles que l'entité garantit en tant que fabricant, et celles dont elle dépend en tant qu'utilisatrice — et planifier chaque migration avant l'échéance.",
    relation: 'recouvrement',
    mappings: [
      { regulation: 'CRA', obligationIds: ['CRA-A13-SUPPORT', 'CRA-ANX1-P2'], requirement: "Période d'assistance d'au moins cinq ans, mises à jour de sécurité gratuites conservées dix ans, et affichage de la date de fin d'assistance.", nuance: "Obligation du fabricant envers ses clients." },
      { regulation: 'NIS2', obligationIds: ['NIS2-A21-2e'], requirement: "Maintenance sécurisée des systèmes et correction des vulnérabilités.", nuance: "Le ReCyF impose des versions bénéficiant du support de leur éditeur, et des mesures compensatoires pour toute version obsolète (5.B.7 et 5.B.9)." },
      { regulation: 'DORA', obligationIds: ['DORA-A7', 'DORA-A8'], requirement: "Systèmes TIC tenus à jour et évaluation des systèmes en fin de vie.", nuance: "Obligation de l'utilisateur : le recours à un système non supporté pour une fonction critique est un risque TIC à traiter." },
    ],
    recyf: [5],
    evidence: ["Registre des dates de fin d'assistance", "Plan de migration des composants en fin de vie", "Politique de période d'assistance des produits édités"],
    effort: 3,
  },
  // ==========================================================================
  // TIERS
  // ==========================================================================
  {
    id: 'TIE-01',
    code: 'TIE-01',
    title: 'Encadrement contractuel des tiers',
    domain: 'tiers',
    summary:
      "Le RGPD et DORA imposent tous deux des mentions contractuelles obligatoires, mais elles ne se recouvrent presque pas : l'article 28 du RGPD porte sur le traitement des données, l'article 30 de DORA sur la résilience du service. Un contrat conforme à l'un ne l'est pas à l'autre.",
    unifiedAction:
      "Construire un corpus de clauses unique, organisé en trois blocs — protection des données (article 28 du RGPD), résilience et service (article 30 de DORA), sécurité de la chaîne (article 21 § 2 d) de NIS 2) — et le décliner selon la nature du prestataire.",
    relation: 'divergence',
    mappings: [
      { regulation: 'RGPD', obligationIds: ['RGPD-A28', 'RGPD-A26'], requirement: "Huit mentions obligatoires : objet, durée, nature, finalité, types de données, catégories de personnes, obligations et droits du responsable, plus instruction documentée, confidentialité, sécurité, assistance, sort des données, audit et sous-traitance ultérieure." },
      { regulation: 'NIS2', obligationIds: ['NIS2-A21-2d'], requirement: "Intégrer des exigences de sécurité dans les relations avec les fournisseurs et prestataires directs.", nuance: "Aucune clause type n'est imposée : c'est une obligation de résultat sur la maîtrise du risque fournisseur." },
      { regulation: 'DORA', obligationIds: ['DORA-A30', 'DORA-A28'], requirement: "Mentions minimales du paragraphe 2 et mentions renforcées du paragraphe 3 pour les fonctions critiques : niveaux de service quantitatifs, coopération aux tests, accès et audit sans restriction, stratégies de sortie.", nuance: "Le droit d'audit sans restriction est une exigence dure : une clause limitant l'audit à un questionnaire annuel ne satisfait pas l'article 30." },
    ],
    strictest: {
      regulation: 'DORA',
      rule: "Droits d'accès, d'inspection et d'audit illimités, objectifs de performance quantitatifs, et stratégie de sortie assortie d'une période de transition suffisante.",
      rationale:
        "Ces clauses sont les plus difficiles à obtenir des grands fournisseurs d'informatique en nuage, et ce sont celles que les autorités contrôlent en premier. Elles doivent être négociées en amont, car aucune dérogation n'est prévue.",
    },
    recyf: [3],
    evidence: ["Corpus de clauses par bloc", "Grille de conformité contractuelle", "Registre des contrats revus"],
    effort: 5,
  },
  {
    id: 'TIE-02',
    code: 'TIE-02',
    title: 'Registre et cartographie des tiers',
    domain: 'tiers',
    summary:
      "Le RGPD exige de recenser les destinataires au registre des traitements ; DORA impose un registre d'information dont la structure est fixée par quinze modèles liés entre eux ; NIS 2 demande une cartographie de l'écosystème. Les trois portent sur les mêmes prestataires, avec des attributs différents.",
    unifiedAction:
      "Tenir un référentiel fournisseurs unique, dont les attributs sont le sur-ensemble des trois exigences, et générer par extraction le registre d'information DORA, la section destinataires du registre RGPD et la cartographie NIS 2.",
    relation: 'recouvrement',
    mappings: [
      { regulation: 'RGPD', obligationIds: ['RGPD-A30', 'RGPD-A28'], requirement: "Mentionner au registre les catégories de destinataires et les transferts éventuels." },
      { regulation: 'NIS2', obligationIds: ['NIS2-A21-2d'], requirement: "Cartographier l'écosystème de fournisseurs et prestataires directs et qualifier leur criticité." },
      { regulation: 'DORA', obligationIds: ['DORA-A28', 'DORA-A8'], requirement: "Registre d'information de tous les accords TIC, aux niveaux entité, sous-consolidé et consolidé, remis annuellement à l'autorité.", nuance: "Les quinze modèles du règlement d'exécution 2024/2956 sont liés par des identifiants : une incohérence entre tableaux rend le registre irrecevable." },
    ],
    recyf: [3],
    evidence: ["Référentiel fournisseurs unique", "Registre d'information DORA généré", "Cartographie de l'écosystème"],
    effort: 4,
  },
  {
    id: 'TIE-03',
    code: 'TIE-03',
    title: "Sécurité de la chaîne d'approvisionnement",
    domain: 'tiers',
    summary:
      "NIS 2 impose d'évaluer les vulnérabilités propres à chaque fournisseur direct et la qualité de ses pratiques, y compris ses procédures de développement sécurisé. DORA y ajoute la maîtrise des chaînes de sous-traitance ultérieure, encadrée depuis 2025 par une norme technique dédiée.",
    unifiedAction:
      "Mettre en place une évaluation fournisseur proportionnée à la criticité, exigeant la visibilité sur les sous-traitants ultérieurs, et la réexaminer périodiquement plutôt qu'à la seule contractualisation.",
    relation: 'recouvrement',
    mappings: [
      { regulation: 'NIS2', obligationIds: ['NIS2-A21-2d', 'NIS2-A24'], requirement: "Tenir compte des vulnérabilités propres à chaque fournisseur, de la qualité globale de ses pratiques et des évaluations coordonnées des risques au niveau européen." },
      { regulation: 'DORA', obligationIds: ['DORA-A29', 'DORA-A31'], requirement: "Maîtrise des chaînes de sous-traitance, visibilité sur les sous-traitants ultérieurs, prise en compte des recommandations du superviseur principal.", nuance: "Le règlement délégué 2025/532 impose d'évaluer la sous-traitance avant de l'autoriser, et non de la constater après coup." },
      { regulation: 'RGPD', obligationIds: ['RGPD-A28'], requirement: "Autorisation écrite de la sous-traitance ultérieure et répercussion des mêmes obligations contractuelles." },
      { regulation: 'CRA', obligationIds: ['CRA-A13-COMP', 'CRA-ANX1-P2', 'CRA-A19-IMP'], requirement: "Diligence raisonnable sur les composants tiers intégrés, y compris les logiciels libres, et nomenclature des dépendances.", nuance: "Le CRA regarde la chaîne en amont du produit — les composants intégrés — là où NIS 2 et DORA regardent les prestataires." },
    ],
    recyf: [3],
    evidence: ["Grille d'évaluation fournisseur par criticité", "Cartographie des sous-traitants ultérieurs", "Revues périodiques"],
    effort: 4,
  },
  {
    id: 'TIE-04',
    code: 'TIE-04',
    title: 'Concentration et stratégie de sortie',
    domain: 'tiers',
    summary:
      "C'est un apport propre de DORA, sans équivalent dans les trois autres textes : évaluer le risque de concentration avant de contracter, et disposer d'une stratégie de sortie assortie d'une période de transition. Le RGPD ne traite que du sort des données en fin de contrat.",
    unifiedAction:
      "Documenter, pour chaque prestataire soutenant une fonction critique, une analyse de substituabilité et une stratégie de sortie opérationnelle — et non une simple clause de réversibilité.",
    relation: 'recouvrement',
    mappings: [
      { regulation: 'DORA', obligationIds: ['DORA-A29', 'DORA-A30', 'DORA-A31'], requirement: "Évaluation préalable du risque de concentration, stratégies de sortie, périodes de transition, capacité à cesser l'usage sur injonction du superviseur.", nuance: "Le risque de concentration s'apprécie aussi entre prestataires liés entre eux, pas seulement par prestataire isolé." },
      { regulation: 'RGPD', obligationIds: ['RGPD-A28'], requirement: "Suppression ou restitution des données au terme de la prestation, au choix du responsable du traitement.", nuance: "Le RGPD traite la sortie sous l'angle des données, non sous celui de la continuité du service." },
    ],
    evidence: ["Analyses de concentration", "Stratégies de sortie par prestataire critique", "Plans de réversibilité testés"],
    effort: 4,
  },

  // ==========================================================================
  // DONNÉES
  // ==========================================================================
  {
    id: 'DON-01',
    code: 'DON-01',
    title: 'Licéité, finalité et minimisation',
    domain: 'donnees',
    summary:
      "Domaine propre au RGPD, mais qui contraint les trois autres : les journaux, les inventaires d'accès, la supervision de sécurité et les vérifications d'antécédents sont autant de traitements qui doivent reposer sur une base juridique et respecter la minimisation.",
    unifiedAction:
      "Traiter les dispositifs de sécurité et de résilience comme des traitements de données à part entière : les inscrire au registre, leur attribuer une base juridique et borner leur conservation. C'est le point où une démarche cyber mal conduite crée un risque RGPD.",
    relation: 'recouvrement',
    mappings: [
      { regulation: 'RGPD', obligationIds: ['RGPD-A5', 'RGPD-A6', 'RGPD-A7', 'RGPD-A9', 'RGPD-A25'], requirement: "Base juridique, finalité déterminée, minimisation, exactitude, limitation de la conservation." },
      { regulation: 'NIS2', obligationIds: ['NIS2-A21-2i'], requirement: "La gestion des identités et la journalisation créent des traitements soumis au RGPD.", nuance: "L'article 2 § 14 de NIS 2 réserve expressément l'application du droit des données personnelles." },
      { regulation: 'CRA', obligationIds: ['CRA-ANX1-P1'], requirement: "Minimisation des données traitées par le produit au strict nécessaire à son utilisation prévue." },
    ],
    evidence: ["Registre des traitements incluant les dispositifs de sécurité", "Bases juridiques documentées", "Matrice de conservation"],
    effort: 3,
  },
  {
    id: 'DON-02',
    code: 'DON-02',
    title: 'Droits des personnes',
    domain: 'donnees',
    summary:
      "Domaine exclusivement RGPD. Aucun croisement, mais une interaction pratique : les dispositifs de sécurité doivent être conçus pour permettre l'exercice des droits — un journal immuable qui empêche toute rectification crée une impasse juridique.",
    unifiedAction:
      "Vérifier, pour chaque dispositif technique de sécurité et de résilience, qu'il ne fait pas obstacle à l'exercice des droits — en particulier l'effacement dans les sauvegardes et la rectification dans les journaux.",
    relation: 'recouvrement',
    mappings: [
      { regulation: 'RGPD', obligationIds: ['RGPD-A12-14', 'RGPD-A15-22', 'RGPD-A7'], requirement: "Information, accès, rectification, effacement, limitation, portabilité, opposition, encadrement des décisions automatisées." },
      { regulation: 'DORA', obligationIds: ['DORA-A12'], requirement: "Les politiques de sauvegarde doivent être conçues en tenant compte des demandes d'effacement.", nuance: "L'articulation entre conservation prudentielle et droit à l'effacement doit être documentée, la conservation légale primant sur l'effacement." },
    ],
    evidence: ["Procédure de traitement des demandes", "Analyse d'impact des sauvegardes sur le droit à l'effacement"],
    effort: 3,
  },
  {
    id: 'DON-03',
    code: 'DON-03',
    title: 'Transferts internationaux',
    domain: 'donnees',
    summary:
      "Le RGPD encadre les transferts hors Union ; DORA impose de connaître et de notifier la localisation des données et du traitement. Les deux exigences convergent vers une même cartographie, exploitée différemment.",
    unifiedAction:
      "Tenir une cartographie unique des localisations de données et de traitement, incluant les accès distants depuis des pays tiers, et en dériver le fondement de transfert RGPD et la mention contractuelle DORA.",
    relation: 'recouvrement',
    mappings: [
      { regulation: 'RGPD', obligationIds: ['RGPD-A44-49'], requirement: "Décision d'adéquation, garanties appropriées ou dérogation, complétées d'une analyse d'impact du transfert.", nuance: "Un accès distant depuis un pays tiers constitue un transfert, même sans copie des données." },
      { regulation: 'DORA', obligationIds: ['DORA-A30', 'DORA-A29'], requirement: "Mention contractuelle des lieux de fourniture des services et de traitement des données, et notification préalable de tout changement.", nuance: "L'exigence est de traçabilité prudentielle, non de protection des personnes : elle s'applique même à des données non personnelles." },
    ],
    evidence: ["Cartographie des flux et localisations", "Clauses contractuelles types", "Analyses d'impact de transfert"],
    effort: 4,
  },
  {
    id: 'DON-04',
    code: 'DON-04',
    title: 'Localisation et souveraineté',
    domain: 'donnees',
    summary:
      "Aucun des quatre textes n'impose de localiser les données dans l'Union. DORA s'en approche par la voie prudentielle — présence obligatoire dans l'Union pour les prestataires désignés critiques établis en pays tiers — et le ReCyF par la voie de la qualification des prestataires.",
    unifiedAction:
      "Documenter les choix de localisation et leurs justifications, et anticiper les exigences de présence dans l'Union pesant sur les prestataires critiques — sans confondre obligation juridique et recommandation de souveraineté.",
    relation: 'recouvrement',
    mappings: [
      { regulation: 'DORA', obligationIds: ['DORA-A30', 'DORA-A31'], requirement: "Localisation contractuellement connue ; un prestataire désigné critique établi hors Union doit y constituer une filiale sous douze mois." },
      { regulation: 'RGPD', obligationIds: ['RGPD-A44-49'], requirement: "Les garanties appropriées peuvent conduire, en pratique, à privilégier un hébergement dans l'Union.", nuance: "Le règlement n'impose aucune localisation : c'est l'analyse d'impact du transfert qui peut y conduire." },
      { regulation: 'NIS2', obligationIds: ['NIS2-A24'], requirement: "Les États membres peuvent exiger des produits et services certifiés au titre d'un schéma européen." },
    ],
    evidence: ["Registre des localisations", "Justification des choix d'hébergement"],
    effort: 2,
  },

  // ==========================================================================
  // DOCUMENTATION
  // ==========================================================================
  {
    id: 'DOC-01',
    code: 'DOC-01',
    title: 'Corpus documentaire et politiques',
    domain: 'documentation',
    summary:
      "Les quatre textes exigent un corpus documentaire, et c'est ce que les contrôleurs demandent en premier. Le risque n'est pas l'absence de documents mais leur multiplication : trois politiques de sécurité concurrentes valent moins qu'une seule, correctement indexée.",
    unifiedAction:
      "Constituer un corpus unique, avec une politique cadre et des politiques thématiques, chacune portant une table de correspondance vers les articles qu'elle satisfait. C'est cette table qui transforme un document interne en preuve de conformité.",
    relation: 'recouvrement',
    mappings: [
      { regulation: 'RGPD', obligationIds: ['RGPD-A24', 'RGPD-A5', 'RGPD-A12-14'], requirement: "Mesures documentées permettant de démontrer la conformité." },
      { regulation: 'NIS2', obligationIds: ['NIS2-A21-2a', 'NIS2-A32'], requirement: "Politique de sécurité et preuves immédiatement disponibles en cas de contrôle.", nuance: "Les entités essentielles étant soumises à un contrôle a priori, les preuves doivent être tenues prêtes en permanence." },
      { regulation: 'DORA', obligationIds: ['DORA-A6', 'DORA-A5'], requirement: "Cadre documenté couvrant stratégies, politiques, procédures, protocoles et outils TIC." },
      { regulation: 'CRA', obligationIds: ['CRA-A31-DOC', 'CRA-A32-CONF'], requirement: "Documentation technique de l'annexe VII et déclaration UE de conformité, conservées au moins dix ans." },
    ],
    recyf: [2],
    evidence: ["Corpus documentaire indexé", "Table de correspondance document / article", "Plan de gestion documentaire"],
    effort: 3,
  },
  {
    id: 'DOC-02',
    code: 'DOC-02',
    title: 'Registres réglementaires',
    domain: 'documentation',
    summary:
      "Trois registres distincts sont exigés — traitements pour le RGPD, information TIC pour DORA, violations et incidents pour les deux — avec des structures imposées différentes. Ils ne peuvent pas être fusionnés, mais ils peuvent partager leurs sources.",
    unifiedAction:
      "Alimenter les trois registres depuis un socle commun — inventaire des actifs, référentiel fournisseurs, registre des incidents — plutôt que de les tenir séparément. Le format de sortie diffère ; les données d'entrée sont largement les mêmes.",
    relation: 'recouvrement',
    mappings: [
      { regulation: 'RGPD', obligationIds: ['RGPD-A30', 'RGPD-A33'], requirement: "Registre des activités de traitement et registre interne des violations, y compris celles non notifiées." },
      { regulation: 'DORA', obligationIds: ['DORA-A28', 'DORA-A11'], requirement: "Registre d'information des accords TIC et registre des activités pendant les perturbations.", nuance: "Le registre d'information suit quinze modèles normalisés et liés ; il ne tolère aucune incohérence entre tableaux." },
      { regulation: 'NIS2', obligationIds: ['NIS2-A21-2b', 'NIS2-A21-4'], requirement: "Registre des incidents et registre des écarts de conformité." },
    ],
    evidence: ["Registre des traitements", "Registre d'information TIC", "Registres des incidents et des écarts"],
    effort: 4,
  },
  {
    id: 'DOC-03',
    code: 'DOC-03',
    title: 'Cartographie des systèmes et inventaire des actifs',
    domain: 'documentation',
    summary:
      "C'est le prérequis silencieux de presque tout le dispositif : NIS 2 en fait son premier objectif de sécurité, DORA son article 8, et le RGPD le suppose pour tenir un registre exact. Sans inventaire, aucune des autres exigences n'est démontrable.",
    unifiedAction:
      "Établir et maintenir une cartographie unique — activités et services, systèmes les supportant, actifs matériels et logiciels, dépendances internes et externes, responsable désigné par entrée — et la réviser annuellement.",
    relation: 'recouvrement',
    mappings: [
      { regulation: 'NIS2', obligationIds: ['NIS2-A21-1', 'NIS2-A21-2i'], requirement: "Recensement des activités, services et systèmes d'information, et inventaire des actifs.", nuance: "Le ReCyF exige de lister aussi les activités qui ne fondent pas la qualification d'entité, et de justifier toute exclusion de périmètre." },
      { regulation: 'DORA', obligationIds: ['DORA-A8'], requirement: "Recensement des fonctions métier, actifs TIC, dépendances et systèmes en fin de vie, réexaminé annuellement." },
      { regulation: 'RGPD', obligationIds: ['RGPD-A30'], requirement: "Le registre des traitements suppose de connaître les systèmes qui les mettent en œuvre." },
    ],
    recyf: [1, 5],
    evidence: ["Cartographie des activités et services", "Inventaire des actifs avec responsables", "Matrice de dépendances"],
    effort: 4,
  },

  // ==========================================================================
  // HIÉRARCHIE
  // ==========================================================================
  {
    id: 'HIE-01',
    code: 'HIE-01',
    title: 'Lex specialis : DORA prime sur NIS 2',
    domain: 'gouvernance',
    summary:
      "DORA se déclare expressément lex specialis par rapport à NIS 2. L'article 4 de NIS 2 en tire la conséquence : lorsqu'un acte sectoriel impose des exigences d'effet au moins équivalent, les dispositions correspondantes de NIS 2 cessent de s'appliquer. Une entité financière soumise à DORA n'applique donc pas en parallèle le régime de gestion des risques et de notification de NIS 2.",
    unifiedAction:
      "Pour une entité financière, appliquer DORA comme régime de référence en matière de gestion du risque TIC et de notification d'incidents. NIS 2 continue de produire des effets sur les points non couverts par DORA, et l'entité demeure rattachée à l'écosystème NIS 2 — groupe de coopération, CSIRT.",
    relation: 'hierarchie',
    precedence: {
      prevails: 'DORA',
      over: ['NIS2'],
      basis:
        "Considérant 16 de DORA : « le présent règlement constitue une lex specialis en ce qui concerne la directive (UE) 2022/2555 ». Article 4 de NIS 2 : les dispositions de la directive ne s'appliquent pas lorsque des actes sectoriels imposent des exigences d'effet au moins équivalent.",
    },
    mappings: [
      { regulation: 'DORA', obligationIds: ['DORA-A6', 'DORA-A19'], requirement: "Régime complet de gestion du risque TIC et de notification des incidents majeurs, applicable aux entités financières." },
      { regulation: 'NIS2', obligationIds: ['NIS2-A21-1', 'NIS2-A23-1'], requirement: "Régime écarté pour les entités financières sur les points couverts par DORA.", nuance: "L'exclusion est fonctionnelle, non totale : elle vaut pour la gestion des risques et la notification, pas nécessairement pour l'ensemble de la directive." },
    ],
    evidence: ["Note d'articulation DORA / NIS 2", "Analyse d'équivalence article 4"],
    effort: 2,
  },
]

export const CROSSWALK_BY_ID = new Map(CROSSWALK.map((t) => [t.id, t]))
