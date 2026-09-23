# Journal des modifications

Toutes les évolutions notables du projet sont consignées ici. Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le projet respecte le [versionnage sémantique](https://semver.org/lang/fr/). Les mises à jour du corpus réglementaire figurent dans une rubrique dédiée.

## [Non publié]

## [1.0.0] — 2026-09-23

Première version publique.

### Cadrage et diagnostic

- Qualification au regard du RGPD, de NIS 2, de DORA et du Cyber Resilience Act, chaque verdict étant justifié article par article, avec réserves et valorisation des sanctions plafonds.
- Comparateur avant / après : obligations qui entrent ou sortent du périmètre lorsqu'une réponse change.
- Corpus de 77 obligations et 287 exigences élémentaires ; 35 croisements (recouvrements, divergences, hiérarchies) et vue « Mutualisation ».
- Détail d'implémentation ANSSI (ReCyF v2.5) sous les exigences NIS 2, filtré selon la catégorie d'entité.
- Évaluation à trois états, score global et par référentiel, priorisation pondérable et feuille de route en quatre vagues.
- Échéancier réglementaire interactif.

### Préparation au signalement

- Autorités à notifier et délais par régime (RGPD, NIS 2, DORA, CRA), y compris la primauté de DORA pour les entités financières.
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

[Non publié]: https://github.com/raymondboustany/scopeo/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/raymondboustany/scopeo/releases/tag/v1.0.0
