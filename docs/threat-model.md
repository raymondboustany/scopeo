# Modèle de menaces

**Français** · [English](#threat-model)

Ce document décrit ce que Scopeo protège, contre quelles menaces et par quelles mesures. Il sert de référence aux revues de sécurité et se relit à chaque évolution importante : nouvelle fonction exposée au réseau, nouveau mode de connexion, nouvelle donnée conservée.

## Périmètre

- **Application** : interface web servie par le serveur FastAPI, base SQLite dans le dossier de données.
- **Déploiements** : poste local (`127.0.0.1`), serveur d'équipe derrière un mandataire inverse HTTPS, image Docker.
- **Hors périmètre** : la sécurité du poste ou du serveur hôte, du mandataire inverse, de l'annuaire et du fournisseur d'identité.

## Actifs à protéger

| Actif | Pourquoi il compte |
|---|---|
| Données de cadrage (qualification, écarts, contacts d'escalade) | Elles décrivent les faiblesses d'une organisation |
| Comptes et sessions | Ils donnent accès aux données |
| Secrets (graines TOTP, compte de service LDAP, secret client SSO, clé de chiffrement) | Leur fuite permet d'usurper des comptes |
| Journal d'administration | Il garantit la traçabilité des actions sensibles |
| Code et versions publiées | Une version altérée compromettrait chaque installation |

## Frontières de confiance

1. Navigateur et serveur : HTTP, à chiffrer par TLS dès que le trafic quitte le poste.
2. Serveur, annuaire LDAP et fournisseur d'identité OpenID Connect.
3. Serveur et dossier de données : base, clé de chiffrement, sauvegardes.
4. Dépôt GitHub, intégration continue et registre d'images : la chaîne d'approvisionnement.

## Menaces et mesures (STRIDE)

| Catégorie | Menace | Mesures |
|---|---|---|
| Usurpation d'identité | Vol ou devinette d'un mot de passe | bcrypt, mot de passe robuste imposé, freinage des échecs, double authentification TOTP avec refus du rejeu |
| Usurpation d'identité | Détournement de la connexion unique | PKCE, `state` lié au navigateur, nonce, validation complète du jeton d'identité, aucun rapprochement de comptes par le seul courriel |
| Altération | Requête intersites qui modifie des données | En-tête anti-CSRF exigé pour chaque écriture, cookie `SameSite=Strict` |
| Altération | Version publiée modifiée | Actions GitHub épinglées par empreinte, construction sans cache, signature Sigstore, empreintes SHA-256, attestation de provenance |
| Répudiation | Action d'administration contestée | Journal des actions d'administration et des événements de sécurité des comptes |
| Divulgation | Lecture des entités d'un autre profil | Contrôle de propriété par le serveur à chaque requête ; l'administrateur n'accède jamais aux cadrages |
| Divulgation | Fuite d'un secret en base ou dans le code | Chiffrement Fernet au repos, recherche de secrets sur tout l'historique (gitleaks) |
| Divulgation | Écoute du réseau | HTTPS obligatoire en équipe, cookie `Secure`, HSTS |
| Déni de service | Requêtes volumineuses ou répétées | Taille limitée avant lecture (2 Mo, 5 Mo pour une déclaration d'applicabilité), freinage des connexions et des sessions invitées |
| Élévation de privilèges | Accès à l'administration sans le rôle | Rôle vérifié par le serveur sur chaque route `/api/admin`, au moins un administrateur actif garanti |
| Élévation de privilèges | Faille dans une dépendance | npm audit, pip-audit et Grype à chaque modification et chaque semaine |

## Risques acceptés

- Une seule instance du serveur : l'état de la double authentification et de la connexion unique est tenu en mémoire.
- Deux installations sur le même poste partagent le cookie de session du navigateur.
- Le Trust Center est une fonction de démonstration : son lien public est lisible par qui peut joindre le serveur.
- La sécurité de l'hôte, du mandataire inverse et des sauvegardes relève de l'exploitant.

## Vérification

Les mesures applicatives sont vérifiées par les tests de sécurité du serveur (`server/tests/test_security.py`). Les mesures de la chaîne d'approvisionnement sont appliquées par les workflows du dossier `.github/workflows/`, décrits dans [SECURITY.md](../SECURITY.md).

---

# Threat model

This document describes what Scopeo protects, against which threats and with which measures. It is the reference for security reviews and is reread at every significant change: a new network-facing feature, a new sign-in method, new stored data.

## Scope

- **Application**: web interface served by the FastAPI server, SQLite database in the data folder.
- **Deployments**: local machine (`127.0.0.1`), team server behind an HTTPS reverse proxy, Docker image.
- **Out of scope**: the security of the host machine or server, the reverse proxy, the directory and the identity provider.

## Assets

| Asset | Why it matters |
|---|---|
| Scoping data (qualification, gaps, escalation contacts) | It describes an organisation's weaknesses |
| Accounts and sessions | They give access to the data |
| Secrets (TOTP seeds, LDAP service account, SSO client secret, encryption key) | Leaking them allows account takeover |
| Administration log | It keeps sensitive actions traceable |
| Code and published versions | A tampered version would compromise every installation |

## Trust boundaries

1. Browser and server: HTTP, to be encrypted with TLS as soon as traffic leaves the machine.
2. Server, LDAP directory and OpenID Connect identity provider.
3. Server and data folder: database, encryption key, backups.
4. GitHub repository, continuous integration and image registry: the supply chain.

## Threats and measures (STRIDE)

| Category | Threat | Measures |
|---|---|---|
| Spoofing | Password theft or guessing | bcrypt, strong password enforced, throttled failures, TOTP two-factor authentication with replay refused |
| Spoofing | Single sign-on hijacking | PKCE, `state` bound to the browser, nonce, full ID token validation, accounts never matched by email alone |
| Tampering | Cross-site request changing data | Anti-CSRF header required on every write, `SameSite=Strict` cookie |
| Tampering | Modified published version | GitHub Actions pinned by digest, cache-free build, Sigstore signature, SHA-256 checksums, provenance attestation |
| Repudiation | Disputed administration action | Log of administration actions and account security events |
| Information disclosure | Reading another profile's entities | Ownership checked by the server on every request; administrators never access scoping data |
| Information disclosure | Secret leaked in the database or the code | Fernet encryption at rest, secret scanning over the whole history (gitleaks) |
| Information disclosure | Network eavesdropping | HTTPS required for teams, `Secure` cookie, HSTS |
| Denial of service | Large or repeated requests | Size limited before reading (2 MB, 5 MB for a Statement of Applicability), throttled sign-ins and guest sessions |
| Elevation of privilege | Administration access without the role | Role checked by the server on every `/api/admin` route, at least one active administrator guaranteed |
| Elevation of privilege | Vulnerable dependency | npm audit, pip-audit and Grype on every change and every week |

## Accepted risks

- A single server instance: two-factor and single sign-on state is held in memory.
- Two installations on the same machine share the browser's session cookie.
- The Trust Center is a demo feature: its public link can be read by anyone who can reach the server.
- The security of the host, the reverse proxy and the backups is the operator's responsibility.

## Verification

Application measures are verified by the server's security tests (`server/tests/test_security.py`). Supply chain measures are enforced by the workflows in `.github/workflows/`, described in [SECURITY.md](../SECURITY.md#security-policy).
