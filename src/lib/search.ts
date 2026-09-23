import Fuse from 'fuse.js'
import { ALL_OBLIGATIONS } from '@/engines/corpus'
import { CROSSWALK } from '@/data/crosswalk'
import { RECYF_OBJECTIVES } from '@/data/recyf'
import { TIMELINE } from '@/data/timeline'

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
      reference: `${o.regulation === 'NIS2' ? 'NIS 2' : o.regulation} · ${o.article}`,
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
      reference: `Croisement · ${t.code}`,
      body: [t.summary, t.unifiedAction, ...t.mappings.map((m) => m.requirement)].join(' '),
      route: `/app/croisements?theme=${encodeURIComponent(t.id)}`,
      tag: t.relation,
    })
  }

  for (const o of RECYF_OBJECTIVES) {
    records.push({
      id: `RECYF-${o.n}`,
      kind: 'recyf',
      title: `Objectif ${o.n} — ${o.title}`,
      reference: `Détail d'implémentation ANSSI · ${o.scope === 'EE' ? 'entités essentielles' : 'toutes entités'}`,
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
      reference: `Échéancier · ${e.date}`,
      body: e.detail,
      route: `/app/echeancier?event=${e.id}`,
      tag: e.regulation,
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
