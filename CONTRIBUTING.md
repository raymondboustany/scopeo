# Contributing

**English** · [Français](#contribuer)

Thank you for your interest in Scopeo. Contributions are welcome: code, corrections to the regulatory corpus, translations or documentation.

## How changes are accepted

The `main` branch is protected. Nobody pushes to it directly: every change, whoever proposes it, goes through a **pull request** that must pass continuous integration and be **reviewed and approved by the maintainer** before it is merged. Fork the repository, work on a branch, then open a pull request.

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
3. Add an entry under "Non publié" in `CHANGELOG.md`.
4. Open a pull request using the template. CI must pass and the maintainer must approve it.

## Conventions

- Interface texts go through `tr('français', 'English')`, so both languages stay in step.
- No new dependency without a reason.
- No real company data or personal data in the repository, tests or screenshots.

## Code of conduct

Taking part in the project means following the [code of conduct](CODE_OF_CONDUCT.md).

---

# Contribuer

Merci de l'intérêt que vous portez à Scopeo. Les contributions sont bienvenues : code, corrections du corpus réglementaire, traductions ou documentation.

## Comment les modifications sont intégrées

La branche `main` est protégée. Personne n'y pousse directement : toute modification passe par une **pull request** qui doit réussir l'intégration continue et être **relue et approuvée par le mainteneur** avant d'être fusionnée. Forkez le dépôt, travaillez sur une branche, puis ouvrez une pull request.

## Périmètre du projet

La plateforme sert au **cadrage et au diagnostic en amont**. Une fonctionnalité qui exige de vérifier des preuves ou de suivre la conformité dans le temps sort du périmètre.

## Signaler une évolution réglementaire

Utilisez le modèle d'issue **« Évolution réglementaire »** en joignant **toujours une source officielle** (EUR-Lex, Légifrance, site de l'autorité compétente).

## Environnement et conventions

Les commandes, l'organisation du code et les conventions sont décrites dans la partie anglaise ci-dessus. Les textes d'interface passent par `tr('français', 'English')` ; la version française du corpus fait référence, la version anglaise se trouve dans `src/i18n/en/`.

## Code de conduite

La participation au projet implique le respect du [code de conduite](CODE_OF_CONDUCT.md).
