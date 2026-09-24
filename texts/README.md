# Reference texts

**English** · [Français](#textes-de-référence)

This folder keeps a local copy of the official texts the platform's corpus is drawn from. Only the version published in the *Official Journal of the European Union* is authentic.

Convention: each European text is kept as a PDF, in its French version downloaded from EUR-Lex, named `Text_<text>.pdf`. Amending acts (for example the AI Omnibus, Regulation (EU) 2026/1744) are cited in the platform with their EUR-Lex link, without a local copy.

| Text | File | Official source | Reuse conditions |
|---|---|---|---|
| GDPR: Regulation (EU) 2016/679 | `Text_RGPD.pdf` | [EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679) | Reuse allowed with acknowledgement of the source ([Decision 2011/833/EU](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32011D0833)) |
| NIS2: Directive (EU) 2022/2555 | `Text_Directive_NIS2.pdf` | [EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555) | Same |
| DORA: Regulation (EU) 2022/2554 | `Text_DORA.pdf` | [EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R2554) | Same |
| CRA: Regulation (EU) 2024/2847 | `Text_CRA.pdf` | [EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R2847) | Same |
| AI Act: Regulation (EU) 2024/1689 | `Text_AI_Act.pdf` | [EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689) | Same |
| ReCyF v2.5: ANSSI, 17 March 2026 | *not versioned* | [cyber.gouv.fr](https://messervices.cyber.gouv.fr/documents-ressources/20260317_NIS_V2_ReCyF_v2.5.pdf) | [Open Licence](https://cyber.gouv.fr/mentions-legales), with acknowledgement of ANSSI; commercial use requires the agency's prior authorisation |

## Why the ReCyF is not included

The Référentiel Cyber France is published by ANSSI as a **working document**, before the NIS2 transposition act and its decrees are adopted. It will change. Rather than distributing a frozen copy that could be mistaken for the version in force, the repository points to the official source. To download it locally:

```bash
curl -o texts/ReCyF_ANSSI_v2.5_2026-03-17.pdf \
  https://messervices.cyber.gouv.fr/documents-ressources/20260317_NIS_V2_ReCyF_v2.5.pdf
```

The ReCyF objectives and measures reproduced in `src/data/recyf.ts` are cited with their source in the platform and in the reports.

ANSSI logos and trademarks are not used by this project.

---

# Textes de référence

Ce dossier conserve une copie locale des textes officiels dont le corpus de la plateforme est tiré. Seule la version publiée au *Journal officiel de l'Union européenne* fait foi.

Convention : chaque texte européen est conservé en PDF, dans sa version française téléchargée depuis EUR-Lex, sous le nom `Text_<texte>.pdf`. Les actes modificatifs (par exemple l'Omnibus IA, règlement (UE) 2026/1744) sont cités dans la plateforme avec leur lien EUR-Lex, sans copie locale.

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

Les objectifs et mesures du ReCyF repris dans `src/data/recyf.ts` sont cités avec leur source dans la plateforme et dans les rapports.

Les logos et marques de l'ANSSI ne sont pas utilisés par ce projet.
