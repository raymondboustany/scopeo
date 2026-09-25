# Changelog / Journal des modifications

**English.** Notable changes to the project are recorded here, in English then in French for each version. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project follows [semantic versioning](https://semver.org/). Regulatory corpus updates have their own heading.

**Français.** Les évolutions notables du projet sont consignées ici, en anglais puis en français pour chaque version. Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le projet respecte le [versionnage sémantique](https://semver.org/lang/fr/). Les mises à jour du corpus réglementaire figurent dans une rubrique dédiée.

## [1.1.0] - 2026-09-25

### English

#### Added

- Recovery command for a locked-out administrator, run on the server: `python -m app.recover "Account name"`.
- Directory: Active Directory nested groups, sign-in as `DOMAIN\user` or `user@company.com`, internal certificate authority, allowed group by name or DN.
- Account search in the administration space.
- Request size limit and throttling of guest sessions.

#### Fixed

- First start of `start.bat` on a new Windows computer.
- `start.sh`: executable, clear message when `python3-venv` is missing, automatic choice of a recent Python.
- Docker image: runs with any user ID (OpenShift), clear message when the data folder is not writable.
- A person moved in the directory keeps their account.
- Deadlines shown one day early outside mainland France (French Caribbean, French Polynesia, Quebec).
- "Copy" buttons over plain HTTP on a local network.
- Stability under load with many simultaneous users.
- Clear messages for an expired directory password and a damaged encryption key.
- Accessibility of the effort indicator.

#### Maintenance

- Documentation: troubleshooting, proxy and offline installation, single instance, recovery.
- Continuous integration actions updated.

### Français

#### Ajouts

- Commande de secours pour un administrateur bloqué, à lancer sur le serveur : `python -m app.recover "Nom du compte"`.
- Annuaire : groupes imbriqués d'Active Directory, connexion en `DOMAINE\utilisateur` ou `utilisateur@entreprise.fr`, autorité de certification interne, groupe autorisé par nom ou DN.
- Recherche de comptes dans l'espace d'administration.
- Limite de taille des requêtes et freinage des sessions invitées.

#### Corrections

- Premier lancement de `start.bat` sur un poste Windows neuf.
- `start.sh` : exécutable, message clair si `python3-venv` manque, choix automatique d'un Python récent.
- Image Docker : fonctionne avec tout identifiant utilisateur (OpenShift), message clair si le dossier de données n'est pas accessible en écriture.
- Une personne déplacée dans l'annuaire garde son compte.
- Échéances affichées un jour trop tôt hors de la métropole (Antilles, Polynésie, Québec).
- Boutons « Copier » en HTTP simple sur un réseau local.
- Stabilité sous charge avec de nombreux utilisateurs simultanés.
- Messages clairs pour un mot de passe d'annuaire expiré et une clé de chiffrement endommagée.
- Accessibilité de l'indicateur d'effort.

#### Maintenance

- Documentation : dépannage, installation derrière un proxy ou hors ligne, instance unique, procédure de secours.
- Actions d'intégration continue mises à jour.

## [1.0.0] - 2026-09-25

### English

First public release.

#### Scoping and diagnosis

- Scoping against the GDPR, NIS2 (detailed by ANSSI's ReCyF v2.5), DORA, the Cyber Resilience Act and the AI Act: 35 questions, each verdict justified article by article, with caveats and maximum penalties.
- Before / after comparator: obligations that enter or leave the scope when an answer changes.
- Corpus of 95 obligations and 348 elementary requirements; 40 unified requirements on the crosswalk map (overlaps, divergences, precedence) and a "Shared actions" view.
- ReCyF measures under the NIS2 requirements, filtered by entity category (important or essential).
- Three-state assessment (in place, partial, missing), overall and per-text score, adjustable prioritisation and a roadmap in four phases, from 0 to 3 months to beyond 12 months.
- Interactive regulatory timeline.

#### Optional ISO/IEC 27001:2022 module

- Optional question at the end of scoping (certified, compliant without certification, partial, no initiative), with validity date and scope.
- For a certified or compliant entity, pre-filling of the matching NIS2, DORA and CRA requirements, flagged and editable.
- The 93 Annex A controls, Statement of Applicability import, alerts on excluded controls, ISO column on the crosswalk map.

#### Incident notification readiness

- Authorities to notify and deadlines per regime (GDPR, NIS2, DORA, CRA, AI Act), including DORA's precedence for financial entities.
- Internal escalation chain, optional deadline simulation.
- Technical response support: incident response provider (ANSSI PRIS qualification), regional CSIRT, 17Cyber, role of CERT-FR, complaint within 72 hours for cyber insurance.

#### Reporting

- Executive summary (2 pages), full scoping report and incident quick-reference sheet, as PDF.
- Trust Center: read-only view by revocable link, with no sensitive data (local for now).

#### Accounts and security

- Password-protected profiles (bcrypt), server-side sessions with a configurable lifetime, throttling of sign-in attempts, protection against cross-site requests.
- Optional two-factor authentication (TOTP) per user, with QR code and single-use recovery codes.
- Sign-in through an LDAP directory (Active Directory, OpenLDAP), enabled by an administrator, with a step-by-step connection test.
- Single sign-on through OpenID Connect (Microsoft Entra ID, Google Workspace, Okta, Keycloak), with PKCE, full token validation, and optional restriction by email domain and group.
- Separate administration space: accounts, temporary passwords, suspension, administrator role, unlocking of two-factor authentication, LDAP directory, single sign-on, settings, backup and log. The first profile created is the administrator; an administrator never sees other people's entities. The role is checked by the server on every route.
- Sessions stored server-side that survive a restart; security secrets encrypted at rest; HSTS behind HTTPS.

#### Integration and deployment

- REST API described in OpenAPI (`/api/openapi.json`) and personal API tokens (off by default), limited to their owner's entities.
- Team deployment with Docker Compose and Caddy (automatic HTTPS), for on-premises, cloud or hybrid setups.
- Built-in backup (download or scheduled command) with restore instructions.
- Full documentation: usage, security model, configuration, integrations, adaptation.

#### Workspace

- English and French interface, light and dark themes.
- Multiple entities per profile (client or internal scoping), entity profile, interview notes and log.
- Guided tour at first sign-in, and a dedicated tour for the administration space.
- Global search (Ctrl + K), built-in feedback (pre-filled GitHub issue, no scoping data attached).
- Local FastAPI + SQLite server; installation with Docker Compose, a portable archive or from source.

#### Regulatory corpus

- Official texts in French and English (Official Journal of the EU) and the ReCyF v2.5 (ANSSI) in the `texts/` folder.
- State of the law as of 24 September 2026.

### Français

Première version publique.

#### Cadrage et diagnostic

- Qualification au regard du RGPD, de NIS2 (détaillée par le ReCyF v2.5 de l'ANSSI), de DORA, du Cyber Resilience Act et de l'AI Act : 35 questions, chaque verdict justifié article par article, avec réserves et sanctions plafonds.
- Comparateur avant / après : obligations qui entrent dans le périmètre ou en sortent lorsqu'une réponse change.
- Corpus de 95 obligations et 348 exigences élémentaires ; 40 exigences unifiées sur la carte de croisement (recouvrements, divergences, hiérarchies) et vue « Mutualisation ».
- Mesures du ReCyF sous les exigences NIS2, filtrées selon la catégorie d'entité (importante ou essentielle).
- Évaluation à trois états (en place, partiel, absent), score global et par texte, priorisation pondérable et feuille de route en quatre phases, de 0 à 3 mois à plus de 12 mois.
- Échéancier réglementaire interactif.

#### Module ISO/IEC 27001:2022 facultatif

- Question facultative en fin de qualification (certifiée, conforme sans certification, partielle, aucune démarche), avec date de validité et périmètre.
- Pour une entité certifiée ou conforme, pré-remplissage des exigences NIS2, DORA et CRA correspondantes, signalées et modifiables.
- Les 93 contrôles de l'annexe A, import d'une déclaration d'applicabilité, alertes sur les contrôles exclus, colonne ISO sur la carte de croisement.

#### Préparation au signalement d'incident

- Autorités à notifier et délais par régime (RGPD, NIS2, DORA, CRA, AI Act), y compris la primauté de DORA pour les entités financières.
- Chaîne d'escalade interne, simulation facultative des délais.
- Appui technique à la réponse : prestataire de réponse aux incidents (qualification PRIS de l'ANSSI), CSIRT territorial, 17Cyber, rôle du CERT-FR, plainte sous 72 heures en cas d'assurance cyber.

#### Restitution

- Note de direction (2 pages), rapport de cadrage complet et fiche réflexe incident, en PDF.
- Trust Center : vue en lecture seule par lien révocable, sans donnée sensible (en local pour l'instant).

#### Comptes et sécurité

- Profils protégés par mot de passe (bcrypt), sessions tenues côté serveur avec une durée réglable, freinage des tentatives de connexion, protection contre les requêtes intersites.
- Double authentification (TOTP) facultative pour chaque utilisateur, avec QR code et codes de récupération à usage unique.
- Connexion par annuaire LDAP (Active Directory, OpenLDAP), activée par un administrateur, avec un test de connexion pas à pas.
- Connexion unique par OpenID Connect (Microsoft Entra ID, Google Workspace, Okta, Keycloak), avec PKCE, validation complète du jeton, et restriction facultative par domaine de courriel et par groupe.
- Espace d'administration séparé : comptes, mots de passe provisoires, suspension, rôle administrateur, déblocage de la double authentification, annuaire LDAP, connexion unique, réglages, sauvegarde et journal. Le premier profil créé est administrateur ; un administrateur ne voit jamais les entités des autres. Le rôle est vérifié par le serveur sur chaque route.
- Sessions tenues côté serveur et conservées après un redémarrage ; secrets de sécurité chiffrés au repos ; HSTS derrière HTTPS.

#### Intégration et déploiement

- API REST décrite en OpenAPI (`/api/openapi.json`) et jetons d'API personnels (désactivés par défaut), limités aux entités de leur titulaire.
- Déploiement d'équipe avec Docker Compose et Caddy (HTTPS automatique), sur site, dans le cloud ou en hybride.
- Sauvegarde intégrée (téléchargement ou commande planifiable) avec instructions de restauration.
- Documentation complète : usage, modèle de sécurité, configuration, intégrations, adaptation.

#### Espace de travail

- Interface en français et en anglais, thèmes clair et sombre.
- Plusieurs entités par profil (cadrage d'un client ou cadrage interne), fiche entité, notes et journal d'entretien.
- Parcours guidé à la première connexion, et parcours dédié à l'espace d'administration.
- Recherche transverse (Ctrl + K), signalement intégré (issue GitHub pré-remplie, sans donnée de cadrage).
- Serveur local FastAPI + SQLite ; installation par Docker Compose, archive portable ou depuis les sources.

#### Corpus réglementaire

- Textes officiels en français et en anglais (Journal officiel de l'UE) et ReCyF v2.5 (ANSSI) dans le dossier `texts/`.
- État du droit arrêté au 24 septembre 2026.

[1.1.0]: https://github.com/raymondboustany/scopeo/releases/tag/v1.1.0
[1.0.0]: https://github.com/raymondboustany/scopeo/releases/tag/v1.0.0
