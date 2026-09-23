export type SearchKind = 'obligation' | 'theme' | 'recyf' | 'echeance'

export interface SearchRecord {
  id: string
  kind: SearchKind
  title: string
  reference: string
  body: string
  route: string
  tag?: string
}

export const KIND_LABEL: Record<SearchKind, string> = {
  obligation: 'Obligation',
  theme: 'Croisement',
  recyf: 'ReCyF',
  echeance: 'Échéance',
}
