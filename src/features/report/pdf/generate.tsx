import { pdf } from '@react-pdf/renderer'
import type { ReportData } from '../reportData'
import { ComexReport } from './comex'
import { FullReport } from './full'
import { ReflexeSheet } from './reflexe'

export type ReportKind = 'comex' | 'complet' | 'reflexe'

/**
 * Rendu des rapports. Le résultat est mis en cache par entité, type et date
 * de dernière modification : régénérer un rapport inchangé est instantané.
 */
const cache = new Map<string, Blob>()

export async function renderReport(kind: ReportKind, data: ReportData, version: string): Promise<Blob> {
  const key = `${kind}:${data.entity.name}:${version}`
  const hit = cache.get(key)
  if (hit) return hit
  const doc = kind === 'comex' ? <ComexReport d={data} /> : kind === 'reflexe' ? <ReflexeSheet d={data} /> : <FullReport d={data} />
  const blob = await pdf(doc).toBlob()
  cache.set(key, blob)
  if (cache.size > 8) cache.delete(cache.keys().next().value!)
  return blob
}
