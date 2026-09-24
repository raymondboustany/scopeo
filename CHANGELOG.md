# Changelog / Journal des modifications

**English.** All notable changes to the project are recorded here, in English then in French for each version. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project follows [semantic versioning](https://semver.org/). Regulatory corpus updates have their own heading.

**Français.** Toutes les évolutions notables du projet sont consignées ici, en anglais puis en français pour chaque version. Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le projet respecte le [versionnage sémantique](https://semver.org/lang/fr/). Les mises à jour du corpus réglementaire figurent dans une rubrique dédiée.

## [Non publié]

### English

- Redesigned light and dark themes: application frame with an inset content panel, refined neutral grays, hairline borders and soft layered shadows, clearer selected states, badges with a fine tinted outline, consistent buttons, fields, tabs and dialogs. Every text keeps a contrast of at least 4.5:1, checked by an automated test.
- README visuals redone in high definition: framed product shots, a light and dark hero image, and a full-colour animated walkthrough.

### Français

- Refonte des thèmes clair et sombre : cadre d'application avec panneau de contenu encastré, gris neutres affinés, filets fins et ombres douces superposées, sélections plus lisibles, pastilles au contour teinté, boutons, champs, onglets et fenêtres harmonisés. Chaque texte garde un contraste d'au moins 4,5:1, vérifié par un test automatique.
- Visuels du README refaits en haute définition : captures mises en scène, image d'en-tête en thème clair et sombre, et visite animée en couleurs réelles.

## [2.0.0] - 2026-09-24

### English

#### New texts and frameworks

- **AI Act** (Regulation (EU) 2024/1689, amended by the AI Omnibus, Regulation (EU) 2026/1744): fifth text, with cross-scoping (provider, deployer, importer; prohibited practices, high risk, transparency, general-purpose models), 18 obligations, timeline and Article 73 reporting deadlines.
- **NIS2 (ReCyF)**: NIS2 is shown everywhere with its application framework, ANSSI's ReCyF v2.5 (March 2026 working version), which details and completes the requirements of the directive.
- **Optional ISO/IEC 27001:2022 module**: an optional question at the end of the questionnaire (certified, compliant without certification, partial, no initiative), with validity date and scope covered. For a certified or compliant entity, the platform offers to pre-fill the matching NIS2, DORA and CRA requirements, flags them "Filled in via ISO 27001" and shows a verification window; for a partial or non-existent initiative, it points to the checklist or the assessment. "ISO 27001 certified" badge with validity date (dashboard, executive summary, Trust Center), declaration of the 93 Annex A controls by theme or one by one, Statement of Applicability import, alerts on excluded controls, overlap by framework.
- **Crosswalk map**: ISO 27001 column and sheet for every unified requirement (covered, partial, excluded, outside the scope of the standard).

#### Platform

- English interface, in addition to French.
- Password-protected profiles (bcrypt), server-side session revoked on sign-out, protection against cross-site requests and throttling of sign-in attempts.
- Built-in feedback (problem, idea, error in the regulatory content): the user reviews the message, then opens a pre-filled GitHub issue or copies the text; no scoping data is attached.
- Fixed the display on phones (dashboard, Trust Center); Docker image and GitHub templates updated.
- Trust Center flagged as a demo feature, usable locally.

#### Regulatory corpus

- Official CRA and AI Act texts added as PDF (EUR-Lex, French version).
- 95 obligations, 348 elementary requirements, 40 unified requirements.
- State of the law as of 24 September 2026.

### Français

#### Nouveaux textes et référentiels

- **AI Act** (règlement (UE) 2024/1689, modifié par l'Omnibus IA, règlement (UE) 2026/1744) : cinquième texte, avec qualification croisée (fournisseur, déployeur, importateur ; pratiques interdites, haut risque, transparence, modèles à usage général), 18 obligations, échéancier et délais de signalement de l'article 73.
- **NIS2 (ReCyF)** : NIS2 s'affiche partout avec son référentiel d'application, le ReCyF v2.5 de l'ANSSI (version de travail de mars 2026), qui détaille et complète les exigences de la directive.
- **Module ISO/IEC 27001:2022 facultatif** : question facultative à la fin du questionnaire (certifié, conforme sans certification, partiel, aucune démarche), date de validité et périmètre couvert ; pour une entité certifiée ou conforme, proposition de pré-remplissage des exigences NIS2, DORA et CRA correspondantes, signalées « Renseigné via ISO 27001 » avec une fenêtre de vérification ; pour une démarche partielle ou inexistante, renvoi vers la checklist ou l'évaluation. Badge « Certifié ISO 27001 » avec date de validité (tableau de bord, note au comité, Trust Center), déclaration des 93 contrôles de l'annexe A par thème ou contrôle par contrôle, import d'une déclaration d'applicabilité, alertes sur les contrôles exclus, recoupement par référentiel.
- **Carte de croisement** : colonne et fiche ISO 27001 pour chaque exigence unifiée (couvert, partiel, exclu, hors du champ de la norme).

#### Plateforme

- Interface en anglais, en plus du français.
- Profils protégés par mot de passe (bcrypt), session tenue côté serveur et révoquée à la déconnexion, protection contre les requêtes intersites et freinage des tentatives de connexion.
- Signalement intégré (problème, idée, erreur du contenu réglementaire) : message relu par l'utilisateur, puis issue GitHub pré-remplie ou copie du texte ; aucune donnée de cadrage jointe.
- Correction de l'affichage sur téléphone (tableau de bord, Trust Center) ; image Docker et modèles GitHub mis à jour.
- Trust Center signalé comme fonction de démonstration, utilisable en local.

#### Corpus réglementaire

- Textes officiels du CRA et de l'AI Act ajoutés au format PDF (EUR-Lex, version française).
- 95 obligations, 348 exigences élémentaires, 40 exigences unifiées.
- État du droit arrêté au 24 septembre 2026.

## [1.0.0] - 2026-09-23

### English

First public release.

#### Scoping and diagnosis

- Scoping against the GDPR, NIS2, DORA and the Cyber Resilience Act, every verdict justified article by article, with caveats and maximum penalties.
- Before / after comparator: obligations that enter or leave the scope when an answer changes.
- Corpus of 77 obligations and 287 elementary requirements; 35 crosswalk themes (overlaps, divergences, precedence) and a "Shared actions" view.
- ANSSI implementation detail (ReCyF v2.5) under the NIS2 requirements, filtered by entity category.
- Three-state assessment, overall and per-framework score, adjustable prioritisation and a four-wave roadmap.
- Interactive regulatory timeline.

#### Incident notification readiness

- Authorities to notify and deadlines per regime (GDPR, NIS2, DORA, CRA), including DORA's precedence for financial entities.
- Internal escalation chain and optional deadline simulation.

#### Reporting

- Executive summary (2 pages), full scoping report and incident quick-reference sheet, as PDF.
- Trust Center: read-only public view, by revocable link, with no sensitive data.

#### Workspace

- Profiles, multiple entities (client scoping or internal scoping), entity profile.
- Interview notes attached to questions, requirements and articles, interview log and report appendix.
- Light and dark themes, guided tour, global search (Ctrl + K).
- Local FastAPI + SQLite server; installation with Docker Compose, Docker, a no-Docker archive or from source.

#### Regulatory corpus

- State of the law as of 23 September 2026.

### Français

Première version publique.

#### Cadrage et diagnostic

- Qualification au regard du RGPD, de NIS2, de DORA et du Cyber Resilience Act, chaque verdict étant justifié article par article, avec réserves et valorisation des sanctions plafonds.
- Comparateur avant / après : obligations qui entrent ou sortent du périmètre lorsqu'une réponse change.
- Corpus de 77 obligations et 287 exigences élémentaires ; 35 croisements (recouvrements, divergences, hiérarchies) et vue « Mutualisation ».
- Détail d'implémentation ANSSI (ReCyF v2.5) sous les exigences NIS2, filtré selon la catégorie d'entité.
- Évaluation à trois états, score global et par référentiel, priorisation pondérable et feuille de route en quatre vagues.
- Échéancier réglementaire interactif.

#### Préparation au signalement

- Autorités à notifier et délais par régime (RGPD, NIS2, DORA, CRA), y compris la primauté de DORA pour les entités financières.
- Chaîne d'escalade interne et simulation facultative des délais.

#### Restitution

- Note au comité de direction (2 pages), rapport de cadrage complet et fiche réflexe incident, en PDF.
- Trust Center : vue publique en lecture seule, par lien révocable, sans donnée sensible.

#### Espace de travail

- Profils, entités multiples (cadrage d'un client ou cadrage interne), fiche entité.
- Notes d'entretien attachées aux questions, exigences et articles, journal d'entretien et annexe du rapport.
- Thème clair et thème sombre, parcours guidé, recherche transverse (Ctrl + K).
- Serveur local FastAPI + SQLite ; installation par Docker Compose, Docker, archive sans Docker ou depuis les sources.

#### Corpus réglementaire

- État du droit arrêté au 23 septembre 2026.

[Non publié]: https://github.com/raymondboustany/scopeo/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/raymondboustany/scopeo/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/raymondboustany/scopeo/releases/tag/v1.0.0
