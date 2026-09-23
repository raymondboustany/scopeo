# Guide d'installation

Ce guide s'adresse à tous les profils, y compris sans connaissance technique. Il suffit de suivre les étapes dans l'ordre. Comptez **10 à 15 minutes** pour une première installation.

L'application fonctionne **sur votre ordinateur** : aucun compte à créer, aucune donnée envoyée sur Internet. Une fois lancée, elle s'utilise dans votre navigateur (Chrome, Edge, Firefox…), à l'adresse **http://localhost:8000**.

Deux méthodes sont proposées :

| | Méthode A — Docker | Méthode B — Archive prête à l'emploi |
|---|---|---|
| Recommandée pour | La plupart des utilisateurs, les équipes | Les postes où Docker n'est pas autorisé |
| Logiciel à installer une fois | Docker Desktop | Python |
| Mises à jour | Une commande | Télécharger la nouvelle archive |

> **Poste professionnel** : l'installation de Docker Desktop ou de Python peut nécessiter des droits d'administrateur. En cas de blocage, rapprochez-vous de votre service informatique.

---

## Méthode A — Docker (recommandée)

Docker est l'outil standard pour faire tourner des applications comme celle-ci. C'est la méthode utilisée par la plupart des outils open source de cybersécurité et de GRC.

### 1. Installer Docker Desktop

1. Téléchargez **Docker Desktop** sur [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) et installez-le.
2. Sous Windows, acceptez l'activation de **WSL 2** si l'installeur la propose, puis redémarrez l'ordinateur.
3. Ouvrez Docker Desktop et attendez que l'indicateur en bas à gauche passe au vert (« Engine running »).

### 2. Récupérer le fichier de configuration

1. Créez un dossier, par exemple `Documents\Scopeo`.
2. Téléchargez le fichier [`compose.yaml`](https://raw.githubusercontent.com/raymondboustany/scopeo/main/compose.yaml) (clic droit sur le lien, « Enregistrer le lien sous… ») et placez-le dans ce dossier.

### 3. Démarrer l'application

1. Ouvrez un terminal **dans ce dossier** :
   - **Windows** : dans l'Explorateur, clic droit dans le dossier, puis « Ouvrir dans le Terminal ».
   - **macOS** : clic droit sur le dossier, puis « Nouveau terminal au dossier ».
2. Tapez la commande suivante, puis Entrée :

   ```
   docker compose up -d
   ```

3. Au premier lancement, Docker télécharge l'application (une à deux minutes). Ouvrez ensuite **http://localhost:8000** dans votre navigateur.

L'application redémarre toute seule avec Docker Desktop : il n'y a rien à relancer les fois suivantes.

### Commandes utiles

À taper dans un terminal ouvert dans le même dossier :

| Action | Commande |
|---|---|
| Arrêter | `docker compose down` |
| Redémarrer | `docker compose up -d` |
| Mettre à jour vers la dernière version | `docker compose pull` puis `docker compose up -d` |

Vos données sont conservées lors des arrêts et des mises à jour.

---

## Méthode B — Archive prête à l'emploi (sans Docker)

### 1. Installer Python

1. Téléchargez **Python** (version 3.11 ou plus récente) sur [python.org/downloads](https://www.python.org/downloads/).
2. **Windows** : sur le premier écran de l'installeur, cochez impérativement **« Add python.exe to PATH »**, puis « Install Now ».

### 2. Télécharger l'application

1. Rendez-vous sur la page des [versions publiées](https://github.com/raymondboustany/scopeo/releases/latest).
2. Dans la rubrique **Assets**, téléchargez `scopeo-vX.Y.Z-portable.zip`.
3. Faites un clic droit sur l'archive, puis « Extraire tout ».

### 3. Démarrer l'application

- **Windows** : ouvrez le dossier extrait et double-cliquez sur **`start.bat`**.
  Si Windows affiche un avertissement de sécurité, confirmez l'exécution (« Exécuter », ou « Informations complémentaires » puis « Exécuter quand même »). Ce message apparaît pour tout script téléchargé sur Internet.
- **macOS / Linux** : ouvrez un terminal dans le dossier extrait et tapez `./start.sh`.

Au premier lancement, une fenêtre de commande installe les composants nécessaires (environ une minute), puis le navigateur s'ouvre sur l'application.

**Pour arrêter l'application**, fermez la fenêtre de commande. **Pour la relancer**, double-cliquez à nouveau sur `start.bat`.

**Pour mettre à jour**, téléchargez la nouvelle archive et copiez-y le dossier `server/data` de l'ancienne version : il contient vos données.

---

## Premiers pas

1. À l'accueil, choisissez **Mode invité** pour découvrir l'outil sur l'entreprise de démonstration *Finexa*. Un parcours guidé présente les écrans.
2. Pour un vrai cadrage, choisissez **Créer un profil**, puis créez une entité : un client, ou votre propre organisation.
3. Suivez les étapes proposées sur le tableau de bord : qualifier, évaluer, prioriser, préparer le signalement, restituer.

## Sauvegarder vos données

Depuis l'application : **Profil et données**, puis **Exporter** une entité. Le fichier obtenu peut être réimporté sur un autre poste.

## En cas de problème

| Symptôme | Solution |
|---|---|
| La page « Le serveur local ne répond pas » s'affiche | L'application n'est pas démarrée : relancez `start.bat` ou `docker compose up -d`. |
| `docker` n'est pas reconnu | Docker Desktop n'est pas démarré, ou le terminal a été ouvert avant son installation : redémarrez le terminal. |
| `start.bat` indique que Python est requis | Réinstallez Python en cochant « Add python.exe to PATH ». |
| Le port 8000 est déjà utilisé | Une autre application occupe ce port : fermez-la, ou reportez-vous à la configuration avancée du README. |

Pour tout autre problème, [ouvrez une issue](https://github.com/raymondboustany/scopeo/issues/new/choose) en décrivant la méthode d'installation utilisée.
