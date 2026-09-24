import Fuse from 'fuse.js'
import { ALL_OBLIGATIONS } from '@/engines/corpus'
import { CROSSWALK } from '@/data/crosswalk'
import { RECYF_OBJECTIVES } from '@/data/recyf'
import { TIMELINE } from '@/data/timeline'
import { ISO_CONTROLS, ISO_THEME_META } from '@/data/iso27001'
import { REGULATIONS } from '@/data/regulations'
import { COLON, tr } from '@/i18n'

/**
 * Index de recherche transverse.
 *
 * Le corpus tient en mémoire : l'index est construit une fois, au premier
 * accès, et ne fait aucun appel réseau. La recherche porte sur les
 * identifiants autant que sur le texte, parce qu'un professionnel qui cherche
 * « 32 » ou « 21.2.d » attend une réponse immédiate.
 */

import type { SearchRecord } from './search.types'

export type { SearchKind, SearchRecord } from './search.types'
export { KIND_LABEL } from './search.types'

function buildRecords(): SearchRecord[] {
  const records: SearchRecord[] = []

  for (const o of ALL_OBLIGATIONS) {
    records.push({
      id: o.id,
      kind: 'obligation',
      title: o.title,
      reference: `${REGULATIONS[o.regulation].shortName} · ${o.article}`,
      body: [o.statement, o.quote ?? '', ...o.requirements.map((r) => r.text)].join(' '),
      route: `/app/corpus?obligation=${encodeURIComponent(o.id)}`,
      tag: o.regulation,
    })
  }

  for (const t of CROSSWALK) {
    records.push({
      id: t.id,
      kind: 'theme',
      title: t.title,
      reference: `${tr('Croisement', 'Crosswalk')} · ${t.code}`,
      body: [t.summary, t.unifiedAction, ...t.mappings.map((m) => m.requirement)].join(' '),
      route: `/app/croisements?theme=${encodeURIComponent(t.id)}`,
      tag: t.relation,
    })
  }

  for (const o of RECYF_OBJECTIVES) {
    records.push({
      id: `RECYF-${o.n}`,
      kind: 'recyf',
      title: `${tr('Objectif', 'Objective')} ${o.n}${COLON}${o.title}`,
      reference: `NIS2 (ReCyF) · ${o.scope === 'EE' ? tr('entités essentielles', 'essential entities') : tr('toutes entités', 'all entities')}`,
      body: [o.statement, ...o.measures.map((m) => `${m.id} ${m.text}`)].join(' '),
      route: `/app/corpus?recyf=${o.n}`,
      tag: o.pillar,
    })
  }

  for (const e of TIMELINE) {
    records.push({
      id: e.id,
      kind: 'echeance',
      title: e.title,
      reference: `${tr('Échéancier', 'Timeline')} · ${e.date}`,
      body: e.detail,
      route: `/app/echeancier?event=${e.id}`,
      tag: e.regulation,
    })
  }

  for (const c of ISO_CONTROLS) {
    records.push({
      id: `ISO-${c.id}`,
      kind: 'iso',
      title: c.title,
      reference: `ISO/IEC 27001 · A.${c.id} · ${ISO_THEME_META[c.theme].label}`,
      body: c.title,
      route: `/app/iso27001?controle=${c.id}`,
      tag: c.theme,
    })
  }

  return records
}

let cachedIndex: Fuse<SearchRecord> | null = null
let cachedRecords: SearchRecord[] | null = null

export function searchRecords(): SearchRecord[] {
  if (!cachedRecords) cachedRecords = buildRecords()
  return cachedRecords
}

function index(): Fuse<SearchRecord> {
  if (!cachedIndex) {
    cachedIndex = new Fuse(searchRecords(), {
      keys: [
        { name: 'reference', weight: 3 },
        { name: 'title', weight: 2 },
        { name: 'body', weight: 1 },
      ],
      threshold: 0.34,
      ignoreLocation: true,
      minMatchCharLength: 2,
      includeScore: true,
    })
  }
  return cachedIndex
}

export function search(query: string, limit = 24): SearchRecord[] {
  const q = query.trim()
  if (q.length < 2) return []
  return index()
    .search(q, { limit })
    .map((r) => r.item)
}
