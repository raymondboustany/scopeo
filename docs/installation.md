# Installation guide

**English** · [Français](#guide-dinstallation)

This guide is for everyone, including people with no technical background. Just follow the steps in order. Allow **10 to 15 minutes** for a first install.

The platform runs **on your computer**: no data is sent over the internet. Once started, it is used in your browser (Chrome, Edge, Firefox…) at **http://localhost:8000**.

Two methods are offered:

| | Method A: Docker | Method B: portable archive |
|---|---|---|
| Recommended for | Most users, teams | Computers where Docker is not allowed |
| Software to install once | Docker Desktop | Python |
| Updates | One command | Download the new archive |

> **Work computer**: installing Docker Desktop or Python may require administrator rights. If you are blocked, contact your IT department.

---

## Method A: Docker (recommended)

Docker is the standard way to run applications like this one. It is the method used by most open source cybersecurity and GRC platforms.

### 1. Install Docker Desktop

1. Download **Docker Desktop** from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) and install it.
2. On Windows, accept the activation of **WSL 2** if the installer offers it, then restart the computer.
3. Open Docker Desktop and wait for the indicator at the bottom left to turn green ("Engine running").

### 2. Get the configuration file

1. Create a folder, for example `Documents\Scopeo`.
2. Download the file [`compose.yaml`](https://raw.githubusercontent.com/raymondboustany/scopeo/main/compose.yaml) (right-click the link, "Save link as…") and put it in that folder.

### 3. Start the platform

1. Open a terminal **in that folder**:
   - **Windows**: in File Explorer, right-click inside the folder, then "Open in Terminal".
   - **macOS**: right-click the folder, then "New Terminal at Folder".
2. Type the following command, then press Enter:

   ```
   docker compose up -d
   ```

3. On the first launch, Docker downloads the platform (one or two minutes). Then open **http://localhost:8000** in your browser.

The platform restarts on its own with Docker Desktop: there is nothing to relaunch next time.

### Useful commands

To type in a terminal opened in the same folder:

| Action | Command |
|---|---|
| Stop | `docker compose down` |
| Restart | `docker compose up -d` |
| Update to the latest version | `docker compose pull` then `docker compose up -d` |

Your data is kept when you stop and when you update.

---

## Method B: portable archive (no Docker)

### 1. Install Python

1. Download **Python** (version 3.11 or later) from [python.org/downloads](https://www.python.org/downloads/).
2. **Windows**: on the first screen of the installer, be sure to tick **"Add python.exe to PATH"**, then "Install Now".

### 2. Download the platform

1. Go to the [published releases](https://github.com/raymondboustany/scopeo/releases/latest) page.
2. Under **Assets**, download `scopeo-vX.Y.Z-portable.zip`.
3. Right-click the archive, then "Extract all".

### 3. Start the platform

- **Windows**: open the extracted folder and double-click **`start.bat`**.
  If Windows shows a security warning, confirm the run ("Run", or "More info" then "Run anyway"). This message appears for any script downloaded from the internet.
- **macOS / Linux**: open a terminal in the extracted folder and type `./start.sh`.

On the first launch, a command window installs the necessary components (about a minute), then the browser opens on the platform.

**To stop the platform**, close the command window. **To start it again**, double-click `start.bat` again.

**To update**, download the new archive and copy the `server/data` folder of the old version into it: it holds your data.

---

## First steps

1. At first launch, the home page only offers **Create the administrator profile**: name, role and password (10 characters minimum, typed twice). This first profile manages accounts and settings in the **Administration** space (profile menu), and uses the platform like everyone else.
2. Create an entity: a client, or your own organisation. A short guided tour opens at first sign-in; the question mark in the top bar replays it.
3. To discover the platform without an account, **Guest mode** opens the demo company *Finexa*; the guest session is erased on sign-out.
4. Next time, sign in with the profile name and password. **Sign out** (profile menu) closes the session.
5. Recommended: turn on **two-factor authentication** in **Profile and data**, with an app such as Microsoft Authenticator, Google Authenticator or FreeOTP.
6. Follow the steps shown on the dashboard: scope, assess, prioritise, prepare notification, report.

## Sharing Scopeo with a team

In the **Administration** space:

- **Accounts**: create an account with a temporary password (the person replaces it at first sign-in), suspend an account, appoint another administrator, or turn off two-factor authentication for someone who lost their phone.
- **LDAP directory**: connect Scopeo to Active Directory or OpenLDAP (address, service account, search base, filter, optional group). The **Test** button checks each step; once switched on, a directory tab appears on the sign-in page.
- **Settings**: close self-service profile creation, disable guest mode, set the session length.
- **Log**: administration actions and account security changes.

- **Single sign-on**: let people sign in with their Microsoft, Google, Okta or Keycloak account.

Serving Scopeo to several people requires a server and HTTPS: follow the [deployment guide](deployment.md). Everything else is described in the [documentation](documentation.md).

## Backing up your data

- One entity: **Profile and data**, then **Export**. The resulting file can be re-imported on another computer.
- Everything: **Administration → Settings → Download a backup**, or copy the data folder (`server/data`, or the `scopeo-data` Docker volume). It holds the database `scopeo.db` and the key `secret.key`, which encrypts security secrets: keep them together.

## Troubleshooting

| Symptom | Solution |
|---|---|
| The "The local server is not responding" page appears | The platform is not started: run `start.bat` or `docker compose up -d` again. |
| `docker` is not recognised | Docker Desktop is not running, or the terminal was opened before it was installed: restart the terminal. |
| `start.bat` says Python is required | Reinstall Python, ticking "Add python.exe to PATH". |
| Port 8000 is already in use | Another application uses that port: close it, or see the advanced configuration in the README. |

For any other problem, [open an issue](https://github.com/raymondboustany/scopeo/issues/new/choose) describing the installation method you used, or use the feedback button in the platform.

---

# Guide d'installation

Ce guide s'adresse à tous les profils, y compris sans connaissance technique. Il suffit de suivre les étapes dans l'ordre. Comptez **10 à 15 minutes** pour une première installation.

La plateforme fonctionne **sur votre ordinateur** : aucune donnée envoyée sur Internet. Une fois lancée, elle s'utilise dans votre navigateur (Chrome, Edge, Firefox…), à l'adresse **http://localhost:8000**.

Deux méthodes sont proposées :

| | Méthode A : Docker | Méthode B : Archive prête à l'emploi |
|---|---|---|
| Recommandée pour | La plupart des utilisateurs, les équipes | Les postes où Docker n'est pas autorisé |
| Logiciel à installer une fois | Docker Desktop | Python |
| Mises à jour | Une commande | Télécharger la nouvelle archive |

> **Poste professionnel** : l'installation de Docker Desktop ou de Python peut nécessiter des droits d'administrateur. En cas de blocage, rapprochez-vous de votre service informatique.

---

## Méthode A : Docker (recommandée)

Docker est la manière standard de faire tourner des applications comme celle-ci. C'est la méthode utilisée par la plupart des plateformes open source de cybersécurité et de GRC.

### 1. Installer Docker Desktop

1. Téléchargez **Docker Desktop** sur [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) et installez-le.
2. Sous Windows, acceptez l'activation de **WSL 2** si l'installeur la propose, puis redémarrez l'ordinateur.
3. Ouvrez Docker Desktop et attendez que l'indicateur en bas à gauche passe au vert (« Engine running »).

### 2. Récupérer le fichier de configuration

1. Créez un dossier, par exemple `Documents\Scopeo`.
2. Téléchargez le fichier [`compose.yaml`](https://raw.githubusercontent.com/raymondboustany/scopeo/main/compose.yaml) (clic droit sur le lien, « Enregistrer le lien sous… ») et placez-le dans ce dossier.

### 3. Démarrer la plateforme

1. Ouvrez un terminal **dans ce dossier** :
   - **Windows** : dans l'Explorateur, clic droit dans le dossier, puis « Ouvrir dans le Terminal ».
   - **macOS** : clic droit sur le dossier, puis « Nouveau terminal au dossier ».
2. Tapez la commande suivante, puis Entrée :

   ```
   docker compose up -d
   ```

3. Au premier lancement, Docker télécharge la plateforme (une à deux minutes). Ouvrez ensuite **http://localhost:8000** dans votre navigateur.

La plateforme redémarre toute seule avec Docker Desktop : il n'y a rien à relancer les fois suivantes.

### Commandes utiles

À taper dans un terminal ouvert dans le même dossier :

| Action | Commande |
|---|---|
| Arrêter | `docker compose down` |
| Redémarrer | `docker compose up -d` |
| Mettre à jour vers la dernière version | `docker compose pull` puis `docker compose up -d` |

Vos données sont conservées lors des arrêts et des mises à jour.

---

## Méthode B : Archive prête à l'emploi (sans Docker)

### 1. Installer Python

1. Téléchargez **Python** (version 3.11 ou plus récente) sur [python.org/downloads](https://www.python.org/downloads/).
2. **Windows** : sur le premier écran de l'installeur, cochez impérativement **« Add python.exe to PATH »**, puis « Install Now ».

### 2. Télécharger la plateforme

1. Rendez-vous sur la page des [versions publiées](https://github.com/raymondboustany/scopeo/releases/latest).
2. Dans la rubrique **Assets**, téléchargez `scopeo-vX.Y.Z-portable.zip`.
3. Faites un clic droit sur l'archive, puis « Extraire tout ».

### 3. Démarrer la plateforme

- **Windows** : ouvrez le dossier extrait et double-cliquez sur **`start.bat`**.
  Si Windows affiche un avertissement de sécurité, confirmez l'exécution (« Exécuter », ou « Informations complémentaires » puis « Exécuter quand même »). Ce message apparaît pour tout script téléchargé sur Internet.
- **macOS / Linux** : ouvrez un terminal dans le dossier extrait et tapez `./start.sh`.

Au premier lancement, une fenêtre de commande installe les composants nécessaires (environ une minute), puis le navigateur s'ouvre sur la plateforme.

**Pour arrêter la plateforme**, fermez la fenêtre de commande. **Pour la relancer**, double-cliquez à nouveau sur `start.bat`.

**Pour mettre à jour**, téléchargez la nouvelle archive et copiez-y le dossier `server/data` de l'ancienne version : il contient vos données.

---

## Premiers pas

1. Au premier lancement, l'accueil ne propose que **Créer le profil administrateur** : nom, fonction et mot de passe (10 caractères au moins, saisi deux fois). Ce premier profil gère les comptes et les réglages dans l'espace **Administration** (menu du profil), et utilise la plateforme comme tout le monde.
2. Créez une entité : un client, ou votre propre organisation. Un court parcours guidé s'ouvre à la première connexion ; le point d'interrogation de la barre du haut le relance.
3. Pour découvrir la plateforme sans compte, **Mode invité** ouvre l'entreprise de démonstration *Finexa* ; la session invitée est effacée à la déconnexion.
4. Les fois suivantes, connectez-vous avec le nom du profil et son mot de passe. **Se déconnecter** (menu du profil) ferme la session.
5. Recommandé : activez la **double authentification** dans **Profil et données**, avec une application comme Microsoft Authenticator, Google Authenticator ou FreeOTP.
6. Suivez les étapes proposées sur le tableau de bord : qualifier, évaluer, prioriser, préparer le signalement, restituer.

## Partager Scopeo avec une équipe

Dans l'espace **Administration** :

- **Comptes** : créer un compte avec un mot de passe provisoire (la personne le remplace à sa première connexion), suspendre un compte, nommer un autre administrateur, ou désactiver la double authentification d'une personne qui a perdu son téléphone.
- **Annuaire LDAP** : relier Scopeo à Active Directory ou OpenLDAP (adresse, compte de service, base de recherche, filtre, groupe facultatif). Le bouton **Tester** vérifie chaque étape ; une fois activé, un onglet annuaire apparaît sur la page de connexion.
- **Réglages** : fermer la création libre de profils, désactiver le mode invité, fixer la durée des sessions.
- **Journal** : les actions d'administration et les changements de sécurité des comptes.

- **Connexion unique** : permettre de se connecter avec son compte Microsoft, Google, Okta ou Keycloak.

Servir Scopeo à plusieurs personnes suppose un serveur et du HTTPS : suivez le [guide de déploiement](deployment.md#déployer-scopeo-pour-une-équipe). Tout le reste est décrit dans la [documentation](documentation.md#documentation-de-scopeo).

## Sauvegarder vos données

- Une entité : **Profil et données**, puis **Exporter**. Le fichier obtenu peut être réimporté sur un autre poste.
- Tout : **Administration → Réglages → Télécharger une sauvegarde**, ou copiez le dossier de données (`server/data`, ou le volume Docker `scopeo-data`). Il contient la base `scopeo.db` et la clé `secret.key`, qui chiffre les secrets de sécurité : gardez-les ensemble.

## En cas de problème

| Symptôme | Solution |
|---|---|
| La page « Le serveur local ne répond pas » s'affiche | La plateforme n'est pas démarrée : relancez `start.bat` ou `docker compose up -d`. |
| `docker` n'est pas reconnu | Docker Desktop n'est pas démarré, ou le terminal a été ouvert avant son installation : redémarrez le terminal. |
| `start.bat` indique que Python est requis | Réinstallez Python en cochant « Add python.exe to PATH ». |
| Le port 8000 est déjà utilisé | Une autre application occupe ce port : fermez-la, ou reportez-vous à la configuration avancée du README. |

Pour tout autre problème, [ouvrez une issue](https://github.com/raymondboustany/scopeo/issues/new/choose) en décrivant la méthode d'installation utilisée, ou utilisez le bouton de signalement de la plateforme.
