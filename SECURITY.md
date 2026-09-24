# Security policy

**English** · [Français](#politique-de-sécurité)

## Usage model

Scopeo is designed to run **on the user's machine**. The server listens on `127.0.0.1` by default.

- Each profile is protected by a password (10 characters minimum), hashed with **bcrypt** and never stored in clear.
- Sign-in opens a **server-side session**: the browser only holds a random token in an `HttpOnly`, `SameSite=Strict` cookie. Signing out revokes the session on the server. Sessions do not survive a server restart.
- Repeated failed sign-ins are throttled. Write requests require a dedicated header, which blocks cross-site requests.
- An entity can only be read or changed by the profile that owns it. The demo entity is read-only.
- Security headers (CSP, `X-Frame-Options`, `Referrer-Policy`, `X-Content-Type-Options`) are sent on every response.

Scoping data (qualification, gaps, escalation contacts) describes an organisation's weaknesses. Treat the `server/data/scopeo.db` database (or the `scopeo-data` Docker volume) as sensitive information.

**Do not expose the server on a network** without a reverse proxy providing TLS. Behind HTTPS, set `SCOPEO_COOKIE_SECURE=1` so the session cookie is only sent over an encrypted connection. The Trust Center is currently a local demo feature.

## Supported versions

| Version | Security fixes |
|---|---|
| 2.x | Yes |
| 1.x | No |

## Reporting a vulnerability

Do not disclose a vulnerability in a public issue. Use **GitHub private reporting**: *Security* tab of the repository, then *Report a vulnerability*.

Please include the affected version, reproduction steps and estimated impact. An acknowledgement is sent within seven days; the fix and disclosure are coordinated with the reporter.

---

# Politique de sécurité

## Modèle d'usage

Scopeo est conçu pour fonctionner **sur le poste de l'utilisateur**. Le serveur écoute par défaut sur `127.0.0.1`.

- Chaque profil est protégé par un mot de passe (10 caractères au moins), haché avec **bcrypt** et jamais conservé en clair.
- La connexion ouvre une **session tenue côté serveur** : le navigateur ne détient qu'un jeton aléatoire, dans un cookie `HttpOnly` et `SameSite=Strict`. La déconnexion révoque la session sur le serveur. Les sessions ne survivent pas à un redémarrage.
- Les échecs de connexion répétés sont freinés. Les requêtes d'écriture exigent un en-tête dédié, ce qui bloque les requêtes intersites.
- Une entité n'est lisible et modifiable que par le profil qui la détient. L'entité de démonstration est en lecture seule.
- Des en-têtes de sécurité (CSP, `X-Frame-Options`, `Referrer-Policy`, `X-Content-Type-Options`) accompagnent chaque réponse.

Les données de cadrage décrivent les faiblesses d'une organisation. Traitez la base `server/data/scopeo.db` (ou le volume Docker `scopeo-data`) comme une information sensible.

**Ne l'exposez pas sur un réseau** sans mandataire inverse assurant le chiffrement (TLS). Derrière HTTPS, définissez `SCOPEO_COOKIE_SECURE=1`. Le Trust Center reste pour l'instant une fonction de démonstration, en local.

## Signaler une vulnérabilité

Ne publiez pas de vulnérabilité dans une issue publique. Utilisez le **signalement privé de GitHub** : onglet *Security* du dépôt, puis *Report a vulnerability*. Un accusé de réception est adressé sous sept jours.
