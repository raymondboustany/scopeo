import { tr } from '@/i18n'

export type SearchKind = 'obligation' | 'theme' | 'recyf' | 'echeance' | 'iso'

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
  obligation: tr('Obligation', 'Obligation'),
  theme: tr('Croisement', 'Crosswalk'),
  recyf: 'ReCyF',
  echeance: tr('Échéance', 'Deadline'),
  iso: 'ISO 27001',
}
