# Deploying Scopeo for a team

**English** · [Français](#déployer-scopeo-pour-une-équipe)

This guide is for the IT team installing Scopeo on a server shared by several people: on premises, in the cloud, or both. For use on a single computer, the [installation guide](installation.md) is enough.

## What you need

| | |
|---|---|
| Server | Linux, Windows Server or macOS with Docker (1 vCPU, 1 GB RAM and 5 GB of disk are plenty for a team of a few dozen people) |
| Address | A domain name such as `scopeo.example.com`, pointing to the server |
| Encryption | A TLS certificate: automatic (Let's Encrypt), from your internal certificate authority, or from Caddy's internal authority |
| Optional | Your Active Directory / OpenLDAP directory, or your identity provider (Microsoft Entra ID, Google Workspace, Okta, Keycloak) |

Scopeo keeps everything in one data folder (SQLite database and encryption key). It runs as a **single instance**: no load balancing across several servers.

## 1. Install with Docker and Caddy (recommended)

The [`deploy/`](../deploy) folder holds a ready-to-use configuration: Scopeo behind Caddy, which handles HTTPS.

```bash
git clone https://github.com/raymondboustany/scopeo.git
cd scopeo/deploy
cp .env.example .env        # then set SCOPEO_DOMAIN
docker compose up -d
```

Open `https://<your domain>`. The home page offers to create the **administrator profile**: do it at once, before sharing the address.

**Internal network without public DNS**: in [`deploy/Caddyfile`](../deploy/Caddyfile), add `tls internal` (then trust Caddy's root certificate on the team's computers) or point to a certificate issued by your IT (`tls /certs/scopeo.crt /certs/scopeo.key`, with a volume mounting the certificates).

### Already have a reverse proxy?

Serve Scopeo's image (port 8000) behind your proxy and set these variables:

| Variable | Value |
|---|---|
| `SCOPEO_PUBLIC_URL` | `https://scopeo.example.com` |
| `SCOPEO_COOKIE_SECURE` | `1` |
| `FORWARDED_ALLOW_IPS` | the proxy's address (or `*` if only the proxy can reach Scopeo) |

Nginx example:

```nginx
server {
    listen 443 ssl http2;
    server_name scopeo.example.com;
    ssl_certificate     /etc/ssl/scopeo.crt;
    ssl_certificate_key /etc/ssl/scopeo.key;
    client_max_body_size 6m;
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Without Docker, run the server from the sources: `server/.venv/bin/python -m uvicorn app.main:app --app-dir server --host 127.0.0.1 --port 8000`, as a system service (systemd, Windows service).

## 2. Configure access (Administration space)

Sign in with the administrator profile, then **profile menu → Administration**.

1. **Settings**: enter the **public address** (`https://…`), close **self-service profile creation**, disable **guest mode** if you do not need it, choose the **session length**.
2. **Accounts**: create accounts with a temporary password, or let people sign in through the directory or single sign-on. Appoint a second administrator.
3. **LDAP directory** (on-premises Active Directory, OpenLDAP): address in `ldaps://`, service account with read-only rights, search base, filter, optional group. Use the **Test** button, then switch it on.
4. **Single sign-on (SSO)** (organisations in the cloud or hybrid): see below.
5. **Log**: every administration action is recorded.

Local accounts always remain available: the first administrator can sign in even if the directory or the identity provider is unavailable.

### Single sign-on (OpenID Connect)

In the **Single sign-on** page, copy the **redirect address** (`https://<domain>/api/auth/sso/callback`), then register Scopeo with your provider:

| Provider | Where | Issuer to enter |
|---|---|---|
| Microsoft Entra ID | Entra admin center → App registrations → New registration → Web platform, redirect URI; then Certificates & secrets → New client secret | `https://login.microsoftonline.com/<tenant-id>/v2.0` |
| Google Workspace | Google Cloud console → APIs & Services → Credentials → OAuth client ID → Web application | `https://accounts.google.com` |
| Okta | Admin console → Applications → Create App Integration → OIDC, Web Application | `https://<organisation>.okta.com` |
| Keycloak | Realm → Clients → Create client → OpenID Connect, Client authentication on | `https://<server>/realms/<realm>` |

Enter the issuer, client ID and client secret, restrict access if needed (email domains, required group), **Test**, then switch on. A "Sign in with…" button appears on the home page. Accounts are created at first sign-in as ordinary users; two-factor authentication is handled by the provider.

For group restriction with Entra ID, add the `groups` claim to the ID token (Token configuration) and enter the group's object ID.

## 3. Security checklist

- [ ] HTTPS only, `SCOPEO_COOKIE_SECURE=1`, public address set.
- [ ] Administrator profile created immediately, with two-factor authentication on; a second administrator appointed.
- [ ] Self-service profile creation closed; guest mode off unless needed.
- [ ] LDAP in `ldaps://` or StartTLS, certificate verification on, read-only service account.
- [ ] Scopeo only reachable through the reverse proxy (no published port 8000).
- [ ] Backups scheduled, stored encrypted and off the server, restore tested once.
- [ ] Server and Docker images kept up to date.
- [ ] API tokens left off unless an integration needs them.

## 4. Back up and restore

- **On demand**: Administration → Settings → **Download a backup** (database + key, logged).
- **Scheduled** (Docker):

  ```bash
  docker compose exec scopeo python -m app.backup /data/backups --keep 14
  ```

  Run it daily with cron (Linux) or the Task Scheduler (Windows), then copy `/data/backups` elsewhere. Without Docker: `cd server && .venv/bin/python -m app.backup /path/to/backups`.
- **Restore**: stop Scopeo, put `scopeo.db` and `secret.key` back in the data folder, delete `scopeo.db-wal` and `scopeo.db-shm` if present, start again. Each archive includes these instructions.

## 5. Update

```bash
cd scopeo/deploy
docker compose pull && docker compose up -d
```

The database is migrated automatically at start-up. Take a backup first.

## Cloud, on premises, hybrid

| Setup | How |
|---|---|
| On premises | Docker server in your network, internal certificate, Active Directory through LDAP (or SSO if you use Entra ID). |
| Cloud | Virtual machine or container service with a persistent volume for `/data` and a public HTTPS address; single sign-on with your cloud identity provider. |
| Hybrid | Scopeo in the cloud, directory on premises: open a private link (VPN) so Scopeo reaches the directory over `ldaps://`, or prefer single sign-on, which needs no network opening. |

In every case, scoping data stays on the server you run. Only identity is exchanged with the directory or the identity provider.

---

# Déployer Scopeo pour une équipe

Ce guide s'adresse au service informatique qui installe Scopeo sur un serveur partagé par plusieurs personnes : sur site, dans le cloud, ou les deux. Pour un usage sur un seul poste, le [guide d'installation](installation.md) suffit.

## Ce qu'il faut

| | |
|---|---|
| Serveur | Linux, Windows Server ou macOS avec Docker (1 vCPU, 1 Go de mémoire et 5 Go de disque suffisent largement pour quelques dizaines de personnes) |
| Adresse | Un nom de domaine comme `scopeo.exemple.fr`, pointant vers le serveur |
| Chiffrement | Un certificat TLS : automatique (Let's Encrypt), émis par votre autorité de certification interne, ou par l'autorité interne de Caddy |
| Facultatif | Votre annuaire Active Directory / OpenLDAP, ou votre fournisseur d'identité (Microsoft Entra ID, Google Workspace, Okta, Keycloak) |

Scopeo garde tout dans un seul dossier de données (base SQLite et clé de chiffrement). Il fonctionne en **instance unique** : pas de répartition de charge sur plusieurs serveurs.

## 1. Installer avec Docker et Caddy (recommandé)

Le dossier [`deploy/`](../deploy) contient une configuration prête à l'emploi : Scopeo derrière Caddy, qui gère le HTTPS.

```bash
git clone https://github.com/raymondboustany/scopeo.git
cd scopeo/deploy
cp .env.example .env        # puis renseigner SCOPEO_DOMAIN
docker compose up -d
```

Ouvrez `https://<votre domaine>`. L'accueil propose de créer le **profil administrateur** : faites-le tout de suite, avant de diffuser l'adresse.

**Réseau interne sans DNS public** : dans [`deploy/Caddyfile`](../deploy/Caddyfile), ajoutez `tls internal` (puis faites approuver le certificat racine de Caddy sur les postes de l'équipe) ou indiquez un certificat fourni par votre service informatique (`tls /certs/scopeo.crt /certs/scopeo.key`, avec un volume qui monte les certificats).

### Vous avez déjà un mandataire inverse ?

Servez l'image de Scopeo (port 8000) derrière votre mandataire et définissez ces variables :

| Variable | Valeur |
|---|---|
| `SCOPEO_PUBLIC_URL` | `https://scopeo.exemple.fr` |
| `SCOPEO_COOKIE_SECURE` | `1` |
| `FORWARDED_ALLOW_IPS` | l'adresse du mandataire (ou `*` si seul le mandataire peut joindre Scopeo) |

Exemple Nginx :

```nginx
server {
    listen 443 ssl http2;
    server_name scopeo.exemple.fr;
    ssl_certificate     /etc/ssl/scopeo.crt;
    ssl_certificate_key /etc/ssl/scopeo.key;
    client_max_body_size 6m;
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Sans Docker, lancez le serveur depuis les sources : `server/.venv/bin/python -m uvicorn app.main:app --app-dir server --host 127.0.0.1 --port 8000`, comme service système (systemd, service Windows).

## 2. Configurer les accès (espace Administration)

Connectez-vous avec le profil administrateur, puis **menu du profil → Administration**.

1. **Réglages** : renseignez l'**adresse publique** (`https://…`), fermez la **création libre de profils**, désactivez le **mode invité** si vous n'en avez pas besoin, choisissez la **durée des sessions**.
2. **Comptes** : créez des comptes avec un mot de passe provisoire, ou laissez les personnes se connecter par l'annuaire ou la connexion unique. Nommez un second administrateur.
3. **Annuaire LDAP** (Active Directory sur site, OpenLDAP) : adresse en `ldaps://`, compte de service en lecture seule, base de recherche, filtre, groupe facultatif. Utilisez le bouton **Tester**, puis activez.
4. **Connexion unique (SSO)** (organisations dans le cloud ou hybrides) : voir ci-dessous.
5. **Journal** : chaque action d'administration y est consignée.

Les comptes locaux restent toujours disponibles : le premier administrateur peut se connecter même si l'annuaire ou le fournisseur d'identité est indisponible.

### Connexion unique (OpenID Connect)

Dans la page **Connexion unique**, copiez l'**adresse de retour** (`https://<domaine>/api/auth/sso/callback`), puis déclarez Scopeo chez votre fournisseur :

| Fournisseur | Où | Émetteur à saisir |
|---|---|---|
| Microsoft Entra ID | Centre d'administration Entra → Inscriptions d'applications → Nouvelle inscription → plateforme Web, URI de redirection ; puis Certificats et secrets → Nouveau secret client | `https://login.microsoftonline.com/<id-du-locataire>/v2.0` |
| Google Workspace | Console Google Cloud → API et services → Identifiants → ID client OAuth → Application Web | `https://accounts.google.com` |
| Okta | Console d'administration → Applications → Create App Integration → OIDC, Web Application | `https://<organisation>.okta.com` |
| Keycloak | Realm → Clients → Create client → OpenID Connect, Client authentication activé | `https://<serveur>/realms/<realm>` |

Saisissez l'émetteur, l'identifiant et le secret client, restreignez l'accès si besoin (domaines de courriel, groupe requis), **Testez**, puis activez. Un bouton « Se connecter avec… » apparaît sur l'accueil. Les comptes sont créés à la première connexion, en utilisateur ordinaire ; la double authentification relève du fournisseur.

Pour une restriction par groupe avec Entra ID, ajoutez la revendication `groups` au jeton d'identité (Configuration de jetons) et saisissez l'identifiant d'objet du groupe.

## 3. Points de contrôle de sécurité

- [ ] HTTPS uniquement, `SCOPEO_COOKIE_SECURE=1`, adresse publique renseignée.
- [ ] Profil administrateur créé immédiatement, avec la double authentification ; un second administrateur nommé.
- [ ] Création libre de profils fermée ; mode invité désactivé sauf besoin.
- [ ] LDAP en `ldaps://` ou StartTLS, vérification du certificat active, compte de service en lecture seule.
- [ ] Scopeo joignable uniquement par le mandataire inverse (pas de port 8000 publié).
- [ ] Sauvegardes planifiées, conservées chiffrées et hors du serveur, restauration testée une fois.
- [ ] Serveur et images Docker tenus à jour.
- [ ] Jetons d'API laissés désactivés sauf intégration qui en a besoin.

## 4. Sauvegarder et restaurer

- **À la demande** : Administration → Réglages → **Télécharger une sauvegarde** (base + clé, consigné au journal).
- **Planifiée** (Docker) :

  ```bash
  docker compose exec scopeo python -m app.backup /data/backups --keep 14
  ```

  Lancez-la chaque jour avec cron (Linux) ou le Planificateur de tâches (Windows), puis copiez `/data/backups` ailleurs. Sans Docker : `cd server && .venv/bin/python -m app.backup /chemin/des/sauvegardes`.
- **Restaurer** : arrêtez Scopeo, replacez `scopeo.db` et `secret.key` dans le dossier de données, supprimez `scopeo.db-wal` et `scopeo.db-shm` s'ils existent, relancez. Chaque archive contient ces instructions.

## 5. Mettre à jour

```bash
cd scopeo/deploy
docker compose pull && docker compose up -d
```

La base est migrée automatiquement au démarrage. Faites une sauvegarde avant.

## Cloud, sur site, hybride

| Configuration | Comment |
|---|---|
| Sur site | Serveur Docker dans votre réseau, certificat interne, Active Directory par LDAP (ou SSO si vous utilisez Entra ID). |
| Cloud | Machine virtuelle ou service de conteneurs, avec un volume persistant pour `/data` et une adresse HTTPS publique ; connexion unique avec votre fournisseur d'identité cloud. |
| Hybride | Scopeo dans le cloud, annuaire sur site : ouvrez une liaison privée (VPN) pour que Scopeo joigne l'annuaire en `ldaps://`, ou préférez la connexion unique, qui ne demande aucune ouverture réseau. |

Dans tous les cas, les données de cadrage restent sur le serveur que vous exploitez. Seule l'identité est échangée avec l'annuaire ou le fournisseur d'identité.
