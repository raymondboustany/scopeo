# Contributing

**English** · [Français](#contribuer)

Thank you for your interest in Scopeo. Contributions are welcome: code, corrections to the regulatory corpus, translations or documentation.

## How changes are accepted

The `main` branch is protected. Nobody but the maintainer pushes to it directly: every change proposed by a contributor goes through a **pull request** that must pass continuous integration and be **reviewed and approved by the maintainer** before it is merged. Fork the repository, work on a branch, then open a pull request.

## Project scope

The platform is for **upstream scoping and diagnosis**: establishing what applies to an organisation, where the texts overlap, and where to start. Before proposing a feature, ask yourself: *does it require verifying evidence or tracking over time?* If so, it belongs to an audit or compliance tracking platform and is out of scope.

## Reporting a regulatory change

Use the **"Regulatory update"** issue template and **always attach an official source** (EUR-Lex, Légifrance, the competent authority's website). Interpretations without a source cannot be merged.

## Development setup

Prerequisites: Node.js 20+, Python 3.11+.

```bash
npm install
npm run setup     # Python environment for the server, test dependencies included
npm run dev       # API (:8000) + interface with hot reload (:5173)
```

| Command | Purpose |
|---|---|
| `npm run lint` | ESLint |
| `npm run typecheck` | Strict TypeScript |
| `npm test` | Regulatory engine tests (Vitest) |
| `npm run test:server` | API tests (pytest) |
| `npm run demo:build` | Regenerate the demo entity after a corpus change |

## Code layout

```
src/data/          Corpus: texts, obligations, crosswalk, ReCyF, ISO 27001, timeline, questionnaire
src/engines/       Pure, tested logic: scoping, scope, prioritisation, scores, deadlines, ISO mapping
src/i18n/          English interface and English versions of the corpus
src/features/      One folder per screen
server/app/        FastAPI API: persistence and authentication, no regulatory logic
```

Every regulatory rule lives in `src/engines` or `src/data`, never in an interface component, and comes with a test citing the article it rests on. French is the reference version of the corpus; the English version lives in `src/i18n/en/`.

## Submitting a change

1. Create a branch from `main`: `feat/…`, `fix/…`, `corpus/…` or `docs/…`.
2. Write clear commit messages, ideally following [Conventional Commits](https://www.conventionalcommits.org/): `feat: …`, `fix: …`, `corpus: …`.
3. Add an entry under "Non publié" in `CHANGELOG.md`, in English and in French.
4. Open a pull request using the template. CI must pass and the maintainer must approve it.

## Conventions

- Interface texts go through `tr('français', 'English')`, so both languages stay in step.
- Documentation and GitHub texts (README, changelog, templates) are written in English and French.
- No new dependency without a reason.
- No real company data or personal data in the repository, tests or screenshots.

## Code of conduct

Taking part in the project means following the [code of conduct](CODE_OF_CONDUCT.md).

---

# Contribuer

Merci de l'intérêt que vous portez à Scopeo. Les contributions sont bienvenues : code, corrections du corpus réglementaire, traductions ou documentation.

## Comment les modifications sont intégrées

La branche `main` est protégée. Seul le mainteneur y pousse directement : toute modification proposée par un contributeur passe par une **pull request** qui doit réussir l'intégration continue et être **relue et approuvée par le mainteneur** avant d'être fusionnée. Forkez le dépôt, travaillez sur une branche, puis ouvrez une pull request.

## Périmètre du projet

La plateforme sert au **cadrage et au diagnostic en amont** : établir ce qui s'applique à une organisation, où les textes se recoupent, et par quoi commencer. Avant de proposer une fonctionnalité, posez-vous une question : *demande-t-elle de vérifier des preuves ou de suivre dans le temps ?* Si oui, elle relève d'une plateforme d'audit ou de suivi de conformité, et sort du périmètre.

## Signaler une évolution réglementaire

Utilisez le modèle d'issue **« Évolution réglementaire »** en joignant **toujours une source officielle** (EUR-Lex, Légifrance, site de l'autorité compétente). Les interprétations sans source ne peuvent pas être intégrées.

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
src/data/          Corpus : textes, obligations, croisements, ReCyF, ISO 27001, échéancier, questionnaire
src/engines/       Logique pure et testée : qualification, périmètre, priorisation, scores, délais, correspondance ISO
src/i18n/          Interface en anglais et versions anglaises du corpus
src/features/      Un dossier par écran
server/app/        API FastAPI : persistance et authentification, aucune logique réglementaire
```

Toute règle réglementaire vit dans `src/engines` ou `src/data`, jamais dans un composant d'interface, et s'accompagne d'un test citant l'article qui la fonde. Le français est la version de référence du corpus ; la version anglaise se trouve dans `src/i18n/en/`.

## Proposer une modification

1. Créez une branche depuis `main` : `feat/…`, `fix/…`, `corpus/…` ou `docs/…`.
2. Rédigez des messages de commit clairs, idéalement au format [Conventional Commits](https://www.conventionalcommits.org/fr/) : `feat: …`, `fix: …`, `corpus: …`.
3. Ajoutez une entrée dans la section « Non publié » de `CHANGELOG.md`, en français et en anglais.
4. Ouvrez une pull request en remplissant le modèle. L'intégration continue doit passer et le mainteneur doit l'approuver.

## Conventions

- Les textes de l'interface passent par `tr('français', 'English')`, pour que les deux langues restent alignées.
- La documentation et les textes GitHub (README, journal des modifications, modèles) sont rédigés en anglais et en français.
- Pas de dépendance nouvelle sans justification.
- Aucune donnée réelle d'entreprise ou donnée personnelle dans le dépôt, les tests ou les captures.

## Code de conduite

La participation au projet implique le respect du [code de conduite](CODE_OF_CONDUCT.md).
