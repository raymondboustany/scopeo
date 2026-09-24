import { REGULATIONS } from '@/data/regulations'
import { tr } from '@/i18n'
import type { IsoStatus, RegulationId } from '@/types/domain'

export const ISO_STATUS_OPTIONS: { value: IsoStatus; label: string; hint: string }[] = [
  { value: 'certifie', label: tr('Certifié', 'Certified'), hint: tr('Certificat délivré par un organisme accrédité', 'Certificate issued by an accredited body') },
  { value: 'conforme', label: tr('Conforme sans certification', 'Compliant, not certified'), hint: tr('Système de management en place, sans audit de certification', 'Management system in place, no certification audit') },
  { value: 'partiel', label: tr('Partiel', 'Partial'), hint: tr('Démarche engagée, mise en œuvre incomplète', 'Work under way, implementation incomplete') },
  { value: 'aucune', label: tr('Aucune démarche', 'No initiative'), hint: tr('Pas de démarche ISO 27001', 'No ISO 27001 work') },
]

/** « RGPD, NIS2 (ReCyF) et DORA » : la liste nommée des référentiels applicables. */
export function namedList(ids: RegulationId[]): string {
  const names = ids.map((r) => REGULATIONS[r].shortName)
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} ${tr('et', 'and')} ${names[names.length - 1]}`
}

/** « 8.15 » → « A.8.15 » ; « C6.1 » → « Clause 6.1 ». */
export const controlLabel = (id: string) => (id.startsWith('C') ? id.replace('C', 'Clause ') : `A.${id}`)
