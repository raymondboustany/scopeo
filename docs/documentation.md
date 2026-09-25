# Scopeo documentation

**English** · [Français](#documentation-de-scopeo)

Everything about Scopeo in one place: what it does, how to use it, how it is secured, how to configure, integrate and adapt it. Related guides: [installation](installation.md) (one computer), [deployment](deployment.md) (team server), [security policy](../SECURITY.md), [contributing](../CONTRIBUTING.md).

## Contents

1. [Overview](#1-overview)
2. [Concepts](#2-concepts)
3. [Running a scoping engagement](#3-running-a-scoping-engagement)
4. [Accounts and access](#4-accounts-and-access)
5. [Security model](#5-security-model)
6. [Configuration reference](#6-configuration-reference)
7. [Integrations and API](#7-integrations-and-api)
8. [Adapting Scopeo to your organisation](#8-adapting-scopeo-to-your-organisation)
9. [Architecture](#9-architecture)
10. [Data, backup and privacy](#10-data-backup-and-privacy)
11. [Frequently asked questions](#11-frequently-asked-questions)

## 1. Overview

Scopeo is a **regulatory scoping and diagnosis platform**. For an organisation, it establishes which texts apply (GDPR, NIS2 detailed by the French ReCyF, DORA, Cyber Resilience Act, AI Act), on what legal basis, where one action covers several texts, and in which order to handle the gaps. It produces three PDF deliverables and prepares incident notification.

It works **upstream** of a compliance tracking (GRC) platform: it frames the decision, it does not track evidence over time. It is not legal advice.

It is **self-hosted**: on one computer, or on your organisation's server. No scoping data is sent to an outside service.

## 2. Concepts

| Term | Meaning |
|---|---|
| Profile (account) | The person using Scopeo. Local password, LDAP directory or single sign-on. |
| Administrator | A profile that also manages accounts and settings in the Administration space. Never sees other people's entities. |
| Entity | The organisation being scoped (client, subsidiary, own company). Each entity belongs to one profile and is private to it. |
| Guest | Password-less trial session on a copy of the Finexa demo, erased on sign-out. |
| Unified requirement | One requirement grouping what several texts ask on the same topic (40 in total), used for the score and the crosswalk. |
| Phase | Treatment horizon of a gap: 0 to 3 months, 3 to 6, 6 to 12, beyond 12. |

## 3. Running a scoping engagement

The navigation follows the exercise; the dashboard shows where you stand.

1. **Entity profile**: company, engagement, contacts (never published).
2. **Scoping**: 35 questions, each tied to the article it establishes; optional ISO 27001 question at the end. The before / after comparator shows what an answer change adds or removes.
3. **Assessment**: each requirement in place, partial or missing; ISO 27001 can pre-fill matching requirements, to be checked.
4. **Prioritisation and roadmap**: gaps ordered by urgency and weight, spread over four phases; weights are adjustable.
5. **Who to notify**: authorities and deadlines per text, internal escalation chain, technical response support (PRIS provider, regional CSIRT, 17Cyber), deadline simulator.
6. **Report**: executive note (2 pages), full scoping report, incident quick-reference sheet.

Reference screens (**Corpus**, **Crosswalk**, **Timeline**) are available at any time. Interview notes attach to questions and requirements (<kbd>Alt</kbd> + <kbd>N</kbd>); global search with <kbd>Ctrl</kbd> + <kbd>K</kbd>. A guided tour opens at first sign-in and can be replayed with the question mark.

## 4. Accounts and access

| Sign-in method | For whom | Password checked by | Two-factor |
|---|---|---|---|
| Local account | Everyone, always available | Scopeo (bcrypt) | Scopeo (TOTP), optional |
| LDAP directory | On-premises Active Directory, OpenLDAP | The directory | Scopeo (TOTP), optional |
| Single sign-on (OIDC) | Entra ID, Google, Okta, Keycloak | The identity provider | The identity provider |

- **First launch**: the home page only offers to create the administrator profile.
- **Administration space** (profile menu → Administration): Accounts, LDAP directory, Single sign-on, Settings, Log. Dedicated guided tour at first visit.
- **Accounts**: create with a temporary password (changed at first sign-in), suspend, make administrator, turn off two-factor authentication for a locked-out person, delete. At least one active administrator always remains.
- **Directory and SSO accounts** are created at first sign-in, as ordinary users.
- **Profile and data** (each user): password, two-factor authentication with recovery codes, API tokens (if allowed), language, entity export and import, profile deletion.

## 5. Security model

- **Authentication**: bcrypt passwords (10 characters minimum); TOTP (RFC 6238) with replay protection and limited attempts; ten single-use recovery codes stored as HMAC digests; LDAP "search then bind" with escaped filter, refusal of empty passwords, Active Directory nested groups and accounts tied to the directory's immutable identifier; OIDC authorization code flow with PKCE, state bound to the browser, nonce, and full ID token validation (signature, issuer, audience, expiry).
- **Sessions**: random token in an `HttpOnly`, `SameSite=Strict` cookie (`Secure` behind HTTPS); only its SHA-256 digest is stored; configurable lifetime; revoked on sign-out, password change, suspension or security reset; survives server restarts.
- **Authorisation**: every entity is checked against its owner on each request; the administrator role is checked by the server on every `/api/admin` route; API tokens cannot reach administration or account security.
- **Requests**: write requests require a dedicated header (cross-site request protection); sign-in throttling; security headers (CSP, `X-Frame-Options`, `Referrer-Policy`, `X-Content-Type-Options`, HSTS behind HTTPS).
- **Secrets at rest**: TOTP seeds, LDAP service account password and SSO client secret are encrypted with Fernet (key in `SCOPEO_SECRET_KEY` or `secret.key`).
- **Traceability**: administration actions and account security changes are logged (last 1,000 events).

Report vulnerabilities privately, as described in [SECURITY.md](../SECURITY.md).

## 6. Configuration reference

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `SCOPEO_PORT` | `8000` | Port (launchers and `npm` scripts) |
| `SCOPEO_HOST` | `127.0.0.1` | Listening address (`npm` scripts) |
| `SCOPEO_DATA_DIR` | `server/data` (`/data` in Docker) | Data folder: database and key |
| `SCOPEO_DATABASE_URL` | SQLite in the data folder | Database address (SQLite is the supported engine) |
| `SCOPEO_SECRET_KEY` | `secret.key` file | Key encrypting security secrets |
| `SCOPEO_PUBLIC_URL` | address of the request | Public `https://` address (also settable in Administration) |
| `SCOPEO_COOKIE_SECURE` | off | `1` behind HTTPS: `Secure` cookie and HSTS |
| `FORWARDED_ALLOW_IPS` | `127.0.0.1` | Reverse proxies trusted for the client address (uvicorn) |
| `SCOPEO_BCRYPT_ROUNDS` | `12` | bcrypt cost (lower only for tests) |

### Settings (Administration → Settings)

Self-service profile creation, guest mode, session length (1 hour to 7 days), public address, personal API tokens (off by default), backup download.

## 7. Integrations and API

Scopeo exposes a REST API (JSON). Its OpenAPI description is published at **`/api/openapi.json`**: import it into Postman, Insomnia, Swagger Editor or a client generator.

### Authenticating a script: personal API tokens

1. An administrator enables **API tokens** in Settings.
2. The user creates a token in **Profile and data** (name, validity); it is shown once.
3. Calls carry the header `Authorization: Bearer scp_…` (no anti-CSRF header needed).

A token acts on its owner's entities only. It cannot reach `/api/admin`, change the password, two-factor authentication or tokens. Revoke it at any time; suspension of the account disables it.

```bash
curl -H "Authorization: Bearer scp_xxx" https://scopeo.example.com/api/auth/me
curl -H "Authorization: Bearer scp_xxx" https://scopeo.example.com/api/users/<user-id>/entities
```

```python
import requests
api = requests.Session()
api.headers["Authorization"] = "Bearer scp_xxx"
me = api.get("https://scopeo.example.com/api/auth/me").json()
for e in api.get(f"https://scopeo.example.com/api/users/{me['id']}/entities").json():
    entity = api.get(f"https://scopeo.example.com/api/entities/{e['id']}").json()
    print(entity["name"], entity["answers"].get("secteur"), len(entity["coverage"]))
```

### Main routes

| Route | Use |
|---|---|
| `GET /api/health` | Health check (monitoring) |
| `GET /api/auth/me` | Current profile |
| `GET /api/users/{id}/entities` | Entities of the profile |
| `POST /api/users/{id}/entities` | Create an entity (`name`, `answers`, `profile`) |
| `GET /api/entities/{id}` | Full entity: answers, assessment (`coverage`), contacts, notes, ISO 27001 |
| `PATCH /api/entities/{id}` | Update fields (answers, coverage, contacts, notes…) |
| `GET /api/entities/{id}/revisions` | Answer history |
| `GET /api/public/{token}` | Public Trust Center snapshot (if shared) |
| `/api/admin/*` | Administration (session of an administrator only) |

Regulatory results (applicable texts, score, priorities) are computed by the interface from the stored answers, with the engines in `src/engines/`. To reuse them in another tool, call these engines from TypeScript or read the stored answers and assessment.

### Files

- **Entity export** (Profile and data → Export): JSON `{"format": "scopeo/entity", "version": 2, "entity": {…}}` with answers, assessment, profile, notes, ISO 27001 data, weights and contacts. Import always creates a new entity.
- **PDF deliverables**: from the Report page.
- **Statement of Applicability**: CSV, XLSX or ODS import in the ISO 27001 module.

### Identity

LDAP (Active Directory, OpenLDAP) and OpenID Connect (Entra ID, Google Workspace, Okta, Keycloak, Auth0, and any compliant provider). See the [deployment guide](deployment.md).

## 8. Adapting Scopeo to your organisation

Scopeo is open source (MIT): you may adapt it. Main entry points:

| To change | Where |
|---|---|
| Questions of the scoping questionnaire | `src/data/questionnaire.ts` (+ English in `src/i18n/en/questionnaire.json`) |
| Obligations and requirements per text | `src/data/obligations/*.ts` (+ `src/i18n/en/obligations.*.json`) |
| Unified requirements and crosswalk | `src/data/crosswalk.ts` |
| ReCyF measures | `src/data/recyf.ts` |
| ISO 27001 mapping | `src/data/iso27001.ts` |
| Timeline, alerts | `src/data/timeline.ts`, `src/engines/alerts.ts` |
| Authorities and notification deadlines | `src/engines/incidents.ts` |
| Scoring and prioritisation | `src/engines/scores.ts`, `src/engines/prioritisation.ts` |
| PDF layout | `src/features/report/pdf/` |
| Colours, theme | `src/styles/theme.css` (tokens; a contrast test checks readability) |
| Logo | `src/components/layout/Brand.tsx`, `public/`, `docs/assets/logo.svg` |
| Demo entity | `scripts/build-demo.ts`, then `npm run demo:build` |

Rules: every regulatory rule lives in `src/engines` or `src/data` with a test citing its article; interface texts go through `tr('français', 'English')`. After a change: `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:server`. Details in [CONTRIBUTING.md](../CONTRIBUTING.md).

To add a text: declare it in `src/data/regulations.ts`, add its obligations, its scoping logic in `src/engines/qualification.ts`, its questions, its authorities in `src/engines/incidents.ts`, and tests. The existing texts are complete examples.

## 9. Architecture

```
Browser ── HTTPS ── (reverse proxy) ── Scopeo server (FastAPI) ── SQLite (data folder)
   │                                       │
   └ interface: React, regulatory engines   ├ LDAP directory (optional)
     and PDF generation                     └ OIDC identity provider (optional)
```

| Folder | Content |
|---|---|
| `src/` | Interface (React 19, TypeScript, Vite, Tailwind CSS 4), regulatory engines, PDF |
| `server/app/` | API: `main.py` (routes), `admin.py`, `auth.py` (passwords, sessions), `security.py` (encryption, TOTP), `directory.py` (LDAP), `sso.py` (OIDC), `backup.py`, `recover.py` (administrator recovery), `models.py`, `db.py` (migrations) |
| `server/tests/` | API tests (pytest) |
| `texts/` | Official texts, French and English |
| `deploy/` | Team deployment (Docker Compose + Caddy) |
| `docs/` | Guides, visuals, sample reports |

Database migrations run automatically at start-up (added columns); no manual step.

## 10. Data, backup and privacy

- **Where**: data folder `server/data` (or the Docker volume): `scopeo.db` and `secret.key`. Both are sensitive.
- **What leaves the server**: nothing, apart from identity exchanges with your directory or identity provider when you enable them, and the GitHub issue a user chooses to open from the feedback button. No telemetry.
- **Backup**: Administration → Settings → Download a backup, or `python -m app.backup <folder>` for scheduled backups. Keep archives encrypted and off the server.
- **Deletion**: deleting a profile deletes its entities, sessions and tokens. Guest data is erased at sign-out or when its session expires.

## 11. Frequently asked questions

**Does my data go to the cloud?** No. Scopeo runs where you install it. If you enable single sign-on with a cloud provider, only identity is exchanged.

**Can several people work on the same entity?** Not at the same time: each entity belongs to one profile. Use export and import to hand over an engagement; managers review the PDF deliverables.

**We lost the administrator.** A new administrator is appointed automatically at start-up if no active administrator can sign in. Otherwise, another administrator can restore access.

**The only administrator is locked out** (phone and recovery codes lost, or `secret.key` lost). On the server, run `python -m app.recover "Account name"` from the `server` folder with the platform's Python (`server/.venv`), or `docker compose exec scopeo python -m app.recover "Account name"`. The account becomes an active administrator again, its two-factor authentication is turned off and a temporary password is shown. The action is recorded in the log.

**Someone lost their phone.** An administrator turns off their two-factor authentication (Accounts → … → Turn off two-factor authentication), after checking their identity by another means.

**Can Scopeo use PostgreSQL?** SQLite is the supported engine and is enough for a team of a few dozen people.

---

# Documentation de Scopeo

Tout Scopeo au même endroit : ce qu'il fait, comment l'utiliser, comment il est sécurisé, comment le configurer, l'intégrer et l'adapter. Guides associés : [installation](installation.md) (un poste), [déploiement](deployment.md) (serveur d'équipe), [politique de sécurité](../SECURITY.md), [contribuer](../CONTRIBUTING.md).

## Sommaire

1. [Présentation](#1-présentation)
2. [Notions](#2-notions)
3. [Mener un cadrage](#3-mener-un-cadrage)
4. [Comptes et accès](#4-comptes-et-accès)
5. [Modèle de sécurité](#5-modèle-de-sécurité)
6. [Référence de configuration](#6-référence-de-configuration)
7. [Intégrations et API](#7-intégrations-et-api)
8. [Adapter Scopeo à votre organisation](#8-adapter-scopeo-à-votre-organisation)
9. [Architecture](#9-architecture-1)
10. [Données, sauvegarde et confidentialité](#10-données-sauvegarde-et-confidentialité)
11. [Questions fréquentes](#11-questions-fréquentes)

## 1. Présentation

Scopeo est une **plateforme de cadrage et de diagnostic réglementaire**. Pour une organisation, elle établit quels textes s'appliquent (RGPD, NIS2 détaillée par le ReCyF, DORA, Cyber Resilience Act, AI Act), sur quel fondement, où une action couvre plusieurs textes, et dans quel ordre traiter les écarts. Elle produit trois livrables PDF et prépare le signalement d'incident.

Elle intervient **en amont** d'une plateforme de suivi de conformité (GRC) : elle structure la décision, elle ne suit pas des preuves dans le temps. Ce n'est pas un avis juridique.

Elle est **auto-hébergée** : sur un poste, ou sur le serveur de votre organisation. Aucune donnée de cadrage n'est envoyée à un service extérieur.

## 2. Notions

| Terme | Sens |
|---|---|
| Profil (compte) | La personne qui utilise Scopeo. Mot de passe local, annuaire LDAP ou connexion unique. |
| Administrateur | Un profil qui gère en plus les comptes et les réglages dans l'espace Administration. Ne voit jamais les entités des autres. |
| Entité | L'organisation cadrée (client, filiale, sa propre société). Chaque entité appartient à un profil et lui reste privée. |
| Invité | Session d'essai sans mot de passe, sur une copie de la démonstration Finexa, effacée à la déconnexion. |
| Exigence unifiée | Une exigence qui regroupe ce que plusieurs textes demandent sur un même sujet (40 au total), base du score et du croisement. |
| Phase | Horizon de traitement d'un écart : 0 à 3 mois, 3 à 6, 6 à 12, au-delà de 12. |

## 3. Mener un cadrage

La navigation suit l'exercice ; le tableau de bord indique où vous en êtes.

1. **Fiche entité** : société, mission, interlocuteurs (jamais publiés).
2. **Qualification** : 35 questions, chacune rattachée à l'article qu'elle établit ; question ISO 27001 facultative à la fin. Le comparateur avant / après montre ce qu'un changement de réponse ajoute ou retire.
3. **Évaluation** : chaque exigence en place, partielle ou absente ; ISO 27001 peut pré-remplir les exigences correspondantes, à vérifier.
4. **Priorisation et feuille de route** : écarts ordonnés selon l'urgence et le poids, répartis en quatre phases ; pondérations ajustables.
5. **Qui notifier** : autorités et délais par texte, chaîne d'escalade interne, appui technique à la réponse (prestataire PRIS, CSIRT territorial, 17Cyber), simulateur de délais.
6. **Rapport** : note de direction (2 pages), rapport de cadrage complet, fiche réflexe incident.

Les écrans de référence (**Corpus**, **Croisements**, **Échéancier**) sont accessibles à tout moment. Les notes d'entretien se rattachent aux questions et aux exigences (<kbd>Alt</kbd> + <kbd>N</kbd>) ; recherche transverse avec <kbd>Ctrl</kbd> + <kbd>K</kbd>. Un parcours guidé s'ouvre à la première connexion et se relance par le point d'interrogation.

## 4. Comptes et accès

| Mode de connexion | Pour qui | Mot de passe vérifié par | Double authentification |
|---|---|---|---|
| Compte local | Tout le monde, toujours disponible | Scopeo (bcrypt) | Scopeo (TOTP), facultative |
| Annuaire LDAP | Active Directory sur site, OpenLDAP | L'annuaire | Scopeo (TOTP), facultative |
| Connexion unique (OIDC) | Entra ID, Google, Okta, Keycloak | Le fournisseur d'identité | Le fournisseur d'identité |

- **Premier lancement** : l'accueil ne propose que la création du profil administrateur.
- **Espace Administration** (menu du profil → Administration) : Comptes, Annuaire LDAP, Connexion unique, Réglages, Journal. Parcours guidé dédié à la première visite.
- **Comptes** : création avec mot de passe provisoire (changé à la première connexion), suspension, rôle administrateur, désactivation de la double authentification d'une personne bloquée, suppression. Il reste toujours au moins un administrateur actif.
- **Les comptes de l'annuaire et de la connexion unique** sont créés à la première connexion, en utilisateur ordinaire.
- **Profil et données** (chaque utilisateur) : mot de passe, double authentification avec codes de récupération, jetons d'API (si autorisés), langue, export et import d'entités, suppression du profil.

## 5. Modèle de sécurité

- **Authentification** : mots de passe bcrypt (10 caractères au moins) ; TOTP (RFC 6238) avec protection contre le rejeu et essais limités ; dix codes de récupération à usage unique conservés en empreintes HMAC ; LDAP « rechercher puis lier » avec filtre échappé, refus des mots de passe vides, groupes imbriqués d'Active Directory et comptes rattachés à l'identifiant immuable de l'annuaire ; OIDC en flux « code d'autorisation » avec PKCE, `state` lié au navigateur, nonce, et validation complète du jeton d'identité (signature, émetteur, audience, échéance).
- **Sessions** : jeton aléatoire dans un cookie `HttpOnly`, `SameSite=Strict` (`Secure` derrière HTTPS) ; seule son empreinte SHA-256 est conservée ; durée réglable ; révocation à la déconnexion, au changement de mot de passe, à la suspension ou à la réinitialisation de la sécurité ; résiste aux redémarrages du serveur.
- **Autorisations** : chaque entité est vérifiée auprès de son propriétaire à chaque requête ; le rôle administrateur est vérifié par le serveur sur chaque route `/api/admin` ; les jetons d'API n'atteignent ni l'administration, ni la sécurité du compte.
- **Requêtes** : les écritures exigent un en-tête dédié (protection contre les requêtes intersites) ; freinage des connexions ; en-têtes de sécurité (CSP, `X-Frame-Options`, `Referrer-Policy`, `X-Content-Type-Options`, HSTS derrière HTTPS).
- **Secrets au repos** : graines TOTP, mot de passe du compte de service LDAP et secret client SSO chiffrés avec Fernet (clé dans `SCOPEO_SECRET_KEY` ou `secret.key`).
- **Traçabilité** : actions d'administration et changements de sécurité des comptes consignés (1 000 derniers événements).

Signalez les vulnérabilités en privé, comme décrit dans [SECURITY.md](../SECURITY.md).

## 6. Référence de configuration

### Variables d'environnement

| Variable | Défaut | Rôle |
|---|---|---|
| `SCOPEO_PORT` | `8000` | Port (lanceurs et scripts `npm`) |
| `SCOPEO_HOST` | `127.0.0.1` | Adresse d'écoute (scripts `npm`) |
| `SCOPEO_DATA_DIR` | `server/data` (`/data` sous Docker) | Dossier de données : base et clé |
| `SCOPEO_DATABASE_URL` | SQLite dans le dossier de données | Adresse de la base (SQLite est le moteur pris en charge) |
| `SCOPEO_SECRET_KEY` | fichier `secret.key` | Clé de chiffrement des secrets de sécurité |
| `SCOPEO_PUBLIC_URL` | adresse de la requête | Adresse publique `https://` (réglable aussi dans l'Administration) |
| `SCOPEO_COOKIE_SECURE` | désactivé | `1` derrière HTTPS : cookie `Secure` et HSTS |
| `FORWARDED_ALLOW_IPS` | `127.0.0.1` | Mandataires inverses de confiance pour l'adresse client (uvicorn) |
| `SCOPEO_BCRYPT_ROUNDS` | `12` | Coût bcrypt (à abaisser seulement pour les tests) |

### Réglages (Administration → Réglages)

Création libre de profils, mode invité, durée des sessions (1 heure à 7 jours), adresse publique, jetons d'API personnels (désactivés par défaut), téléchargement d'une sauvegarde.

## 7. Intégrations et API

Scopeo expose une API REST (JSON). Sa description OpenAPI est publiée à **`/api/openapi.json`** : importez-la dans Postman, Insomnia, Swagger Editor ou un générateur de client.

### Authentifier un script : jetons d'API personnels

1. Un administrateur active les **jetons d'API** dans Réglages.
2. L'utilisateur crée un jeton dans **Profil et données** (nom, validité) ; il n'est affiché qu'une fois.
3. Les appels portent l'en-tête `Authorization: Bearer scp_…` (sans en-tête anti-CSRF).

Un jeton agit sur les seules entités de son titulaire. Il n'atteint pas `/api/admin` et ne peut changer ni le mot de passe, ni la double authentification, ni les jetons. Il se révoque à tout moment ; la suspension du compte le rend inopérant.

```bash
curl -H "Authorization: Bearer scp_xxx" https://scopeo.exemple.fr/api/auth/me
curl -H "Authorization: Bearer scp_xxx" https://scopeo.exemple.fr/api/users/<id-utilisateur>/entities
```

```python
import requests
api = requests.Session()
api.headers["Authorization"] = "Bearer scp_xxx"
me = api.get("https://scopeo.exemple.fr/api/auth/me").json()
for e in api.get(f"https://scopeo.exemple.fr/api/users/{me['id']}/entities").json():
    entity = api.get(f"https://scopeo.exemple.fr/api/entities/{e['id']}").json()
    print(entity["name"], entity["answers"].get("secteur"), len(entity["coverage"]))
```

### Routes principales

| Route | Usage |
|---|---|
| `GET /api/health` | État du service (supervision) |
| `GET /api/auth/me` | Profil courant |
| `GET /api/users/{id}/entities` | Entités du profil |
| `POST /api/users/{id}/entities` | Créer une entité (`name`, `answers`, `profile`) |
| `GET /api/entities/{id}` | Entité complète : réponses, évaluation (`coverage`), contacts, notes, ISO 27001 |
| `PATCH /api/entities/{id}` | Modifier des champs (réponses, évaluation, contacts, notes…) |
| `GET /api/entities/{id}/revisions` | Historique des réponses |
| `GET /api/public/{token}` | Instantané public du Trust Center (s'il est partagé) |
| `/api/admin/*` | Administration (session d'un administrateur uniquement) |

Les résultats réglementaires (textes applicables, score, priorités) sont calculés par l'interface à partir des réponses enregistrées, avec les moteurs de `src/engines/`. Pour les réutiliser dans un autre outil, appelez ces moteurs depuis TypeScript ou lisez les réponses et l'évaluation enregistrées.

### Fichiers

- **Export d'entité** (Profil et données → Exporter) : JSON `{"format": "scopeo/entity", "version": 2, "entity": {…}}` avec réponses, évaluation, fiche, notes, données ISO 27001, pondérations et contacts. L'import crée toujours une nouvelle entité.
- **Livrables PDF** : depuis la page Rapport.
- **Déclaration d'applicabilité** : import CSV, XLSX ou ODS dans le module ISO 27001.

### Identité

LDAP (Active Directory, OpenLDAP) et OpenID Connect (Entra ID, Google Workspace, Okta, Keycloak, Auth0, et tout fournisseur conforme). Voir le [guide de déploiement](deployment.md).

## 8. Adapter Scopeo à votre organisation

Scopeo est open source (MIT) : vous pouvez l'adapter. Principaux points d'entrée :

| À modifier | Où |
|---|---|
| Questions du questionnaire de qualification | `src/data/questionnaire.ts` (+ anglais dans `src/i18n/en/questionnaire.json`) |
| Obligations et exigences par texte | `src/data/obligations/*.ts` (+ `src/i18n/en/obligations.*.json`) |
| Exigences unifiées et croisements | `src/data/crosswalk.ts` |
| Mesures du ReCyF | `src/data/recyf.ts` |
| Correspondance ISO 27001 | `src/data/iso27001.ts` |
| Échéancier, alertes | `src/data/timeline.ts`, `src/engines/alerts.ts` |
| Autorités et délais de notification | `src/engines/incidents.ts` |
| Score et priorisation | `src/engines/scores.ts`, `src/engines/prioritisation.ts` |
| Mise en page des PDF | `src/features/report/pdf/` |
| Couleurs, thème | `src/styles/theme.css` (jetons ; un test de contraste vérifie la lisibilité) |
| Logo | `src/components/layout/Brand.tsx`, `public/`, `docs/assets/logo.svg` |
| Entité de démonstration | `scripts/build-demo.ts`, puis `npm run demo:build` |

Règles : toute règle réglementaire vit dans `src/engines` ou `src/data`, avec un test qui cite son article ; les textes de l'interface passent par `tr('français', 'English')`. Après une modification : `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:server`. Détails dans [CONTRIBUTING.md](../CONTRIBUTING.md).

Pour ajouter un texte : le déclarer dans `src/data/regulations.ts`, ajouter ses obligations, sa logique de qualification dans `src/engines/qualification.ts`, ses questions, ses autorités dans `src/engines/incidents.ts`, et des tests. Les textes existants servent d'exemples complets.

## 9. Architecture

```
Navigateur ── HTTPS ── (mandataire inverse) ── Serveur Scopeo (FastAPI) ── SQLite (dossier de données)
   │                                              │
   └ interface : React, moteurs réglementaires    ├ annuaire LDAP (facultatif)
     et génération des PDF                        └ fournisseur d'identité OIDC (facultatif)
```

| Dossier | Contenu |
|---|---|
| `src/` | Interface (React 19, TypeScript, Vite, Tailwind CSS 4), moteurs réglementaires, PDF |
| `server/app/` | API : `main.py` (routes), `admin.py`, `auth.py` (mots de passe, sessions), `security.py` (chiffrement, TOTP), `directory.py` (LDAP), `sso.py` (OIDC), `backup.py`, `recover.py` (secours administrateur), `models.py`, `db.py` (migrations) |
| `server/tests/` | Tests de l'API (pytest) |
| `texts/` | Textes officiels, en français et en anglais |
| `deploy/` | Déploiement d'équipe (Docker Compose + Caddy) |
| `docs/` | Guides, visuels, rapports d'exemple |

Les migrations de la base s'exécutent automatiquement au démarrage (colonnes ajoutées) ; aucune étape manuelle.

## 10. Données, sauvegarde et confidentialité

- **Où** : dossier de données `server/data` (ou le volume Docker) : `scopeo.db` et `secret.key`. Les deux sont sensibles.
- **Ce qui sort du serveur** : rien, hormis les échanges d'identité avec votre annuaire ou votre fournisseur d'identité quand vous les activez, et l'issue GitHub qu'un utilisateur choisit d'ouvrir depuis le bouton de retour. Aucune télémétrie.
- **Sauvegarde** : Administration → Réglages → Télécharger une sauvegarde, ou `python -m app.backup <dossier>` pour une sauvegarde planifiée. Conservez les archives chiffrées et hors du serveur.
- **Suppression** : supprimer un profil supprime ses entités, ses sessions et ses jetons. Les données d'un invité sont effacées à la déconnexion ou à l'expiration de sa session.

## 11. Questions fréquentes

**Mes données partent-elles dans le cloud ?** Non. Scopeo fonctionne là où vous l'installez. Si vous activez la connexion unique avec un fournisseur cloud, seule l'identité est échangée.

**Plusieurs personnes peuvent-elles travailler sur la même entité ?** Pas simultanément : chaque entité appartient à un profil. L'export et l'import permettent de transmettre une mission ; les responsables relisent les livrables PDF.

**Nous avons perdu l'administrateur.** Un nouvel administrateur est nommé automatiquement au démarrage si aucun administrateur actif ne peut se connecter. Sinon, un autre administrateur peut rétablir l'accès.

**Le seul administrateur est bloqué** (téléphone et codes de récupération perdus, ou `secret.key` perdu). Sur le serveur, lancez `python -m app.recover "Nom du compte"` depuis le dossier `server` avec le Python de la plateforme (`server/.venv`), ou `docker compose exec scopeo python -m app.recover "Nom du compte"`. Le compte redevient administrateur actif, sa double authentification est désactivée et un mot de passe provisoire s'affiche. L'action est inscrite au journal.

**Une personne a perdu son téléphone.** Un administrateur désactive sa double authentification (Comptes → … → Désactiver la double authentification), après avoir vérifié son identité par un autre moyen.

**Scopeo peut-il utiliser PostgreSQL ?** SQLite est le moteur pris en charge et suffit pour une équipe de quelques dizaines de personnes.
