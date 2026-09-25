# Security policy

**English** · [Français](#politique-de-sécurité)

## Usage model

Scopeo runs **on the user's machine**, or on a server of the organisation behind a reverse proxy. The server listens on `127.0.0.1` by default.

### Accounts

- Each local profile is protected by a password (10 characters minimum), hashed with **bcrypt** and never stored in clear.
- **Two-factor authentication (TOTP)** can be turned on by each user: QR code, six-digit code at every sign-in, ten single-use recovery codes. A code already accepted cannot be replayed; attempts are limited.
- **LDAP directory** (optional): the directory checks the password, Scopeo never stores it. Lookup uses an escaped filter, an empty password is refused, and access can be restricted to one group. Use `ldaps://` or StartTLS.
- Secrets kept in the database (TOTP seeds, LDAP service account password) are **encrypted** (Fernet). The key is read from `SCOPEO_SECRET_KEY` or, failing that, from `secret.key`, created at first start in the data folder. Back it up with the database; without it, two-factor authentication must be reset by an administrator.

### Administration

- The first profile created becomes administrator. Administrators manage accounts, the directory, global settings and the log in a separate space.
- The role is **checked by the server** on every `/api/admin` route. An administrator never reads nor changes other people's entities.
- At least one active administrator always remains; an administrator cannot remove their own rights.
- Administration actions and account security changes are recorded in a log.

### Sessions and requests

- Sign-in opens a **server-side session**: the browser only holds a random token in an `HttpOnly`, `SameSite=Strict` cookie. The session expires after the length set by the administrator (12 hours by default), on sign-out, or when the server stops. Suspending an account or resetting its security closes its sessions.
- Repeated failed sign-ins are throttled. Write requests require a dedicated header, which blocks cross-site requests.
- An entity can only be read or changed by the profile that owns it. The demo entity is read-only.
- Security headers (CSP, `X-Frame-Options`, `Referrer-Policy`, `X-Content-Type-Options`) are sent on every response.

Scoping data (qualification, gaps, escalation contacts) describes an organisation's weaknesses. Treat the data folder (`server/data/`, or the `scopeo-data` Docker volume) as sensitive information.

**Do not expose the server on a network** without a reverse proxy providing TLS. Behind HTTPS, set `SCOPEO_COOKIE_SECURE=1` so the session cookie is only sent over an encrypted connection. The Trust Center is currently a local demo feature.

## Supported versions

| Version | Security fixes |
|---|---|
| 1.x | Yes |

## Reporting a vulnerability

Do not disclose a vulnerability in a public issue. Use **GitHub private reporting**: *Security* tab of the repository, then *Report a vulnerability*.

Please include the affected version, reproduction steps and estimated impact. An acknowledgement is sent within seven days; the fix and disclosure are coordinated with the reporter.

---

# Politique de sécurité

## Modèle d'usage

Scopeo fonctionne **sur le poste de l'utilisateur**, ou sur un serveur de l'organisation derrière un mandataire inverse. Le serveur écoute par défaut sur `127.0.0.1`.

### Comptes

- Chaque profil local est protégé par un mot de passe (10 caractères au moins), haché avec **bcrypt** et jamais conservé en clair.
- La **double authentification (TOTP)** peut être activée par chaque utilisateur : QR code, code à six chiffres à chaque connexion, dix codes de récupération à usage unique. Un code déjà accepté ne peut pas être rejoué ; les essais sont limités.
- **Annuaire LDAP** (facultatif) : l'annuaire vérifie le mot de passe, Scopeo ne le conserve jamais. La recherche utilise un filtre échappé, un mot de passe vide est refusé, et l'accès peut être réservé à un groupe. Utilisez `ldaps://` ou StartTLS.
- Les secrets conservés en base (graines TOTP, mot de passe du compte de service LDAP) sont **chiffrés** (Fernet). La clé est lue dans `SCOPEO_SECRET_KEY` ou, à défaut, dans `secret.key`, créé au premier démarrage dans le dossier de données. Sauvegardez-la avec la base ; sans elle, la double authentification doit être réinitialisée par un administrateur.

### Administration

- Le premier profil créé devient administrateur. Les administrateurs gèrent les comptes, l'annuaire, les réglages globaux et le journal dans un espace séparé.
- Le rôle est **vérifié par le serveur** sur chaque route `/api/admin`. Un administrateur ne lit ni ne modifie jamais les entités des autres.
- Il reste toujours au moins un administrateur actif ; un administrateur ne peut pas se retirer ses propres droits.
- Les actions d'administration et les changements de sécurité des comptes sont consignés dans un journal.

### Sessions et requêtes

- La connexion ouvre une **session tenue côté serveur** : le navigateur ne détient qu'un jeton aléatoire, dans un cookie `HttpOnly` et `SameSite=Strict`. La session expire après la durée fixée par l'administrateur (12 heures par défaut), à la déconnexion, ou à l'arrêt du serveur. Suspendre un compte ou réinitialiser sa sécurité ferme ses sessions.
- Les échecs de connexion répétés sont freinés. Les requêtes d'écriture exigent un en-tête dédié, ce qui bloque les requêtes intersites.
- Une entité n'est lisible et modifiable que par le profil qui la détient. L'entité de démonstration est en lecture seule.
- Des en-têtes de sécurité (CSP, `X-Frame-Options`, `Referrer-Policy`, `X-Content-Type-Options`) accompagnent chaque réponse.

Les données de cadrage décrivent les faiblesses d'une organisation. Traitez le dossier de données (`server/data/`, ou le volume Docker `scopeo-data`) comme une information sensible.

**N'exposez pas le serveur sur un réseau** sans mandataire inverse assurant le chiffrement (TLS). Derrière HTTPS, définissez `SCOPEO_COOKIE_SECURE=1` pour que le cookie de session ne circule que sur une connexion chiffrée. Le Trust Center reste pour l'instant une fonction de démonstration, en local.

## Versions maintenues

| Version | Correctifs de sécurité |
|---|---|
| 1.x | Oui |

## Signaler une vulnérabilité

Ne publiez pas de vulnérabilité dans une issue publique. Utilisez le **signalement privé de GitHub** : onglet *Security* du dépôt, puis *Report a vulnerability*.

Indiquez la version concernée, les étapes pour reproduire et l'impact estimé. Un accusé de réception est adressé sous sept jours ; le correctif et la publication sont coordonnés avec la personne qui signale.
