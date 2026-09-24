# Journal des modifications

Toutes les évolutions notables du projet sont consignées ici. Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le projet respecte le [versionnage sémantique](https://semver.org/lang/fr/). Les mises à jour du corpus réglementaire figurent dans une rubrique dédiée.

## [Non publié]

## [2.0.0] - 2026-09-24

### Nouveaux textes et référentiels

- **AI Act** (règlement (UE) 2024/1689, modifié par l'Omnibus IA, règlement (UE) 2026/1744) : cinquième texte, avec qualification croisée (fournisseur, déployeur, importateur ; pratiques interdites, haut risque, transparence, modèles à usage général), 18 obligations, échéancier et délais de signalement de l'article 73.
- **NIS2 (ReCyF)** : NIS2 s'affiche partout avec son référentiel d'application, le ReCyF v2.5 de l'ANSSI (version de travail de mars 2026), qui détaille et complète les exigences de la directive.
- **Module ISO/IEC 27001:2022 facultatif** : question facultative à la fin du questionnaire (certifié, conforme sans certification, partiel, aucune démarche), date de validité et périmètre couvert ; pour une entité certifiée ou conforme, proposition de pré-remplissage des exigences NIS2, DORA et CRA correspondantes, signalées « Renseigné via ISO 27001 » avec une fenêtre de vérification ; pour une démarche partielle ou inexistante, renvoi vers la checklist ou l'évaluation. Badge « Certifié ISO 27001 » avec date de validité (tableau de bord, note au comité, Trust Center), déclaration des 93 contrôles de l'annexe A par thème ou contrôle par contrôle, import d'une déclaration d'applicabilité, alertes sur les contrôles exclus, recoupement par référentiel.
- **Carte de croisement** : colonne et fiche ISO 27001 pour chaque exigence unifiée (couvert, partiel, exclu, hors du champ de la norme).

### Plateforme

- Interface en anglais, en plus du français.
- Profils protégés par mot de passe (bcrypt), session tenue côté serveur et révoquée à la déconnexion, protection contre les requêtes intersites et freinage des tentatives de connexion.
- Signalement intégré (problème, idée, erreur du contenu réglementaire) : message relu par l'utilisateur, puis issue GitHub pré-remplie ou copie du texte ; aucune donnée de cadrage jointe.
- Correction de l'affichage sur téléphone (tableau de bord, Trust Center) ; image Docker et modèles GitHub mis à jour.
- Trust Center signalé comme fonction de démonstration, utilisable en local.

### Corpus réglementaire

- Textes officiels du CRA et de l'AI Act ajoutés au format PDF (EUR-Lex, version française).
- 95 obligations, 348 exigences élémentaires, 40 exigences unifiées.
- État du droit arrêté au 24 septembre 2026.

## [1.0.0] - 2026-09-23

Première version publique.

### Cadrage et diagnostic

- Qualification au regard du RGPD, de NIS2, de DORA et du Cyber Resilience Act, chaque verdict étant justifié article par article, avec réserves et valorisation des sanctions plafonds.
- Comparateur avant / après : obligations qui entrent ou sortent du périmètre lorsqu'une réponse change.
- Corpus de 77 obligations et 287 exigences élémentaires ; 35 croisements (recouvrements, divergences, hiérarchies) et vue « Mutualisation ».
- Détail d'implémentation ANSSI (ReCyF v2.5) sous les exigences NIS2, filtré selon la catégorie d'entité.
- Évaluation à trois états, score global et par référentiel, priorisation pondérable et feuille de route en quatre vagues.
- Échéancier réglementaire interactif.

### Préparation au signalement

- Autorités à notifier et délais par régime (RGPD, NIS2, DORA, CRA), y compris la primauté de DORA pour les entités financières.
- Chaîne d'escalade interne et simulation facultative des délais.

### Restitution

- Note au comité de direction (2 pages), rapport de cadrage complet et fiche réflexe incident, en PDF.
- Trust Center : vue publique en lecture seule, par lien révocable, sans donnée sensible.

### Espace de travail

- Profils, entités multiples (cadrage d'un client ou cadrage interne), fiche entité.
- Notes d'entretien attachées aux questions, exigences et articles, journal d'entretien et annexe du rapport.
- Thème clair et thème sombre, parcours guidé, recherche transverse (Ctrl + K).
- Serveur local FastAPI + SQLite ; installation par Docker Compose, Docker, archive sans Docker ou depuis les sources.

### Corpus réglementaire

- État du droit arrêté au 23 septembre 2026.

[Non publié]: https://github.com/raymondboustany/scopeo/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/raymondboustany/scopeo/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/raymondboustany/scopeo/releases/tag/v1.0.0
