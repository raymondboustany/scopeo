# Textes de référence

Ce dossier conserve une copie locale des textes officiels dont le corpus de l'application est tiré. Seule la version publiée au *Journal officiel de l'Union européenne* fait foi.

Convention : chaque texte européen est conservé en PDF, dans sa version française téléchargée depuis EUR-Lex, sous le nom `Text_<texte>.pdf`. Les actes modificatifs (par exemple l'Omnibus IA, règlement (UE) 2026/1744) sont cités dans l'application avec leur lien EUR-Lex, sans copie locale.

| Texte | Fichier | Source officielle | Conditions de réutilisation |
|---|---|---|---|
| RGPD : Règlement (UE) 2016/679 | `Text_RGPD.pdf` | [EUR-Lex](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32016R0679) | Réutilisation autorisée avec mention de la source ([décision 2011/833/UE](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32011D0833)) |
| NIS2 : Directive (UE) 2022/2555 | `Text_Directive_NIS2.pdf` | [EUR-Lex](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32022L2555) | Idem |
| DORA : Règlement (UE) 2022/2554 | `Text_DORA.pdf` | [EUR-Lex](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32022R2554) | Idem |
| CRA : Règlement (UE) 2024/2847 | `Text_CRA.pdf` | [EUR-Lex](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R2847) | Idem |
| AI Act : Règlement (UE) 2024/1689 | `Text_AI_Act.pdf` | [EUR-Lex](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R1689) | Idem |
| ReCyF v2.5 : ANSSI, 17 mars 2026 | *non versionné* | [cyber.gouv.fr](https://messervices.cyber.gouv.fr/documents-ressources/20260317_NIS_V2_ReCyF_v2.5.pdf) | [Licence ouverte](https://cyber.gouv.fr/mentions-legales), avec mention de l'ANSSI ; l'exploitation commerciale est soumise à l'autorisation préalable de l'agence |

## Pourquoi le ReCyF n'est pas inclus

Le Référentiel Cyber France est publié par l'ANSSI comme **document de travail**, avant l'adoption de la loi de transposition de NIS2 et de ses décrets. Il évoluera. Plutôt que d'en diffuser une copie figée qui pourrait passer pour la version en vigueur, le dépôt renvoie à la source officielle. Pour le télécharger localement :

```bash
curl -o texts/ReCyF_ANSSI_v2.5_2026-03-17.pdf \
  https://messervices.cyber.gouv.fr/documents-ressources/20260317_NIS_V2_ReCyF_v2.5.pdf
```

Les objectifs et mesures du ReCyF repris dans `src/data/recyf.ts` sont cités avec leur source dans l'application et dans les rapports.

Les logos et marques de l'ANSSI ne sont pas utilisés par ce projet.

---

## Reference texts (English)

This folder keeps a local copy of the official texts the corpus is drawn from, as PDF, in their French version downloaded from EUR-Lex (`Text_<text>.pdf`). Only the version published in the *Official Journal of the European Union* is authentic. The ReCyF, a working document published by ANSSI, is referenced by link rather than copied, so that a frozen copy is never mistaken for the version in force.
