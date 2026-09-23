# Politique de sécurité

## Modèle d'usage

Scopeo est conçu pour fonctionner **sur le poste de l'utilisateur**. Le serveur écoute par défaut sur `127.0.0.1` et **n'intègre aucune authentification** : toute personne capable de joindre le serveur peut lire et modifier les données.

Les données de cadrage (qualification, écarts, contacts d'escalade) décrivent les faiblesses d'une organisation. Traitez la base `server/data/scopeo.db` (ou le volume Docker `scopeo-data`) comme une information sensible.

**Ne l'exposez pas sur un réseau** sans placer devant lui un mandataire inverse assurant l'authentification et le chiffrement (TLS). Le lien public du Trust Center n'expose qu'un instantané sans donnée sensible, mais il reste servi par la même instance.

## Versions maintenues

| Version | Correctifs de sécurité |
|---|---|
| 1.x | Oui |

## Signaler une vulnérabilité

Ne publiez pas de vulnérabilité dans une issue publique. Utilisez le **signalement privé de GitHub** : onglet *Security* du dépôt, puis *Report a vulnerability*.

Merci d'indiquer la version concernée, les étapes de reproduction et l'impact estimé. Un accusé de réception est adressé sous sept jours ; le correctif et la divulgation sont coordonnés avec l'auteur du signalement.
