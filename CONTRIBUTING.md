# Contribuer

Merci de l'intérêt que vous portez à Scopeo. Les contributions sont bienvenues, qu'il s'agisse de code, de corrections du corpus réglementaire ou de documentation.

## Périmètre du projet

L'outil sert au **cadrage et au diagnostic en amont** : établir ce qui s'applique à une organisation, où les textes se recoupent, et par quoi commencer. Avant de proposer une fonctionnalité, posez-vous une question : *demande-t-elle de vérifier des preuves ou de suivre dans le temps ?* Si oui, elle relève d'un outil d'audit ou de suivi de conformité, et sort du périmètre.

## Signaler une évolution réglementaire

Le corpus est la partie la plus précieuse du projet, et la plus exposée à l'obsolescence. Utilisez le modèle d'issue **« Évolution réglementaire »** en joignant **toujours une source officielle** (EUR-Lex, Légifrance, site de l'autorité compétente). Les interprétations sans source ne peuvent pas être intégrées.

## Environnement de développement

Prérequis : Node.js 20+, Python 3.11+.

```bash
npm install
npm run setup     # environnement Python du serveur, dépendances de test comprises
npm run dev       # API (:8000) + interface avec rechargement (:5173)
```

| Commande | Rôle |
|---|---|
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript strict |
| `npm test` | Tests des moteurs réglementaires (Vitest) |
| `npm run test:server` | Tests de l'API (pytest) |
| `npm run demo:build` | Régénère l'entité de démonstration après une modification du corpus |

## Organisation du code

```
src/data/          Corpus : textes, obligations, croisements, ReCyF, échéancier, questionnaire
src/engines/       Logique pure et testée : qualification, périmètre, priorisation, scores, délais
src/features/      Un dossier par écran
src/features/report/pdf/   Rapports PDF (note COMEX, rapport complet, fiche réflexe)
server/app/        API FastAPI : persistance seulement, aucune logique réglementaire
```

Toute règle réglementaire vit dans `src/engines` ou `src/data`, jamais dans un composant d'interface, et s'accompagne d'un test citant l'article qui la fonde.

## Proposer une modification

1. Créez une branche depuis `main` : `feat/…`, `fix/…`, `corpus/…` ou `docs/…`.
2. Rédigez des messages de commit clairs, idéalement au format [Conventional Commits](https://www.conventionalcommits.org/fr/) : `feat: …`, `fix: …`, `corpus: …`.
3. Ajoutez une entrée dans la section « Non publié » de `CHANGELOG.md`.
4. Ouvrez une pull request en remplissant le modèle. L'intégration continue doit passer.

## Conventions

- Interface et contenus en français ; code, identifiants techniques et commentaires de code en français également, par cohérence avec l'existant.
- Pas de dépendance nouvelle sans justification.
- Aucune donnée réelle d'entreprise ou donnée personnelle dans le dépôt, les tests ou les captures.

## Code de conduite

La participation au projet implique le respect du [code de conduite](CODE_OF_CONDUCT.md).
