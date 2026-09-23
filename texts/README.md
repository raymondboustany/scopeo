# Textes de référence

Ce dossier conserve une copie locale des textes officiels dont le corpus de l'application est tiré. Seule la version publiée au *Journal officiel de l'Union européenne* fait foi.

| Texte | Fichier | Source officielle | Conditions de réutilisation |
|---|---|---|---|
| RGPD — Règlement (UE) 2016/679 | `Text_RGPD.pdf` | [EUR-Lex](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32016R0679) | Réutilisation autorisée avec mention de la source ([décision 2011/833/UE](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32011D0833)) |
| NIS 2 — Directive (UE) 2022/2555 | `Text_Directive_NIS2.pdf` | [EUR-Lex](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32022L2555) | Idem |
| DORA — Règlement (UE) 2022/2554 | `Text_DORA.pdf` | [EUR-Lex](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32022R2554) | Idem |
| CRA — Règlement (UE) 2024/2847 | `Text_CRA.html` | [EUR-Lex](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R2847) | Idem |
| ReCyF v2.5 — ANSSI, 17 mars 2026 | *non versionné* | [cyber.gouv.fr](https://messervices.cyber.gouv.fr/documents-ressources/20260317_NIS_V2_ReCyF_v2.5.pdf) | [Licence ouverte](https://cyber.gouv.fr/mentions-legales), avec mention de l'ANSSI ; l'exploitation commerciale est soumise à l'autorisation préalable de l'agence |

## Pourquoi le ReCyF n'est pas inclus

Le Référentiel Cyber France est publié par l'ANSSI comme **document de travail**, avant l'adoption de la loi de transposition de NIS 2 et de ses décrets. Il évoluera. Plutôt que d'en diffuser une copie figée qui pourrait passer pour la version en vigueur, le dépôt renvoie à la source officielle. Pour le télécharger localement :

```bash
curl -o texts/ReCyF_ANSSI_v2.5_2026-03-17.pdf \
  https://messervices.cyber.gouv.fr/documents-ressources/20260317_NIS_V2_ReCyF_v2.5.pdf
```

Les objectifs et mesures du ReCyF repris dans `src/data/recyf.ts` sont cités avec leur source dans l'application et dans les rapports.

Les logos et marques de l'ANSSI ne sont pas utilisés par ce projet.
