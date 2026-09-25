import { ISO_CONTROL_BY_ID } from '@/data/iso27001'
import type { IsoApplicability, IsoControlEntry, IsoImplementation } from '@/types/domain'

/**
 * Lecture d'une Déclaration d'Applicabilité (DdA, « Statement of
 * Applicability »).
 *
 * Chaque organisation tient la sienne dans un format propre ; la lecture est
 * donc heuristique : une ligne est retenue si elle porte un numéro de contrôle
 * de l'annexe A, puis les autres cellules sont lues à la recherche de mots
 * indiquant l'applicabilité et la mise en œuvre. Rien n'est appliqué sans
 * que l'utilisateur ait vu le résultat.
 *
 * Formats lus : CSV, TSV, texte, XLSX et ODS. Un PDF est conservé comme pièce
 * de référence, sans lecture automatique.
 */

export interface SoaParseResult {
  entries: Record<string, IsoControlEntry>
  /** Contrôles reconnus dans le fichier. */
  recognized: number
  /** Le format ne se prête pas à une lecture automatique. */
  unreadable: boolean
}

const CONTROL_RE = /^\s*(?:annex\s*|annexe\s*)?(?:a\s*[.\s-]?\s*)?([5-8])\s*[.,]\s*(\d{1,2})\b/i

const norm = (s: string) =>
  s
    .replace(/œ/gi, 'oe')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

function controlIdOf(cell: string): string | null {
  const m = CONTROL_RE.exec(cell)
  if (!m) return null
  const id = `${m[1]}.${Number(m[2])}`
  return ISO_CONTROL_BY_ID.has(id) ? id : null
}

const NOT_APPLICABLE = /\b(non[\s-]?applicable|not[\s-]?applicable|n\/a|exclu|excluded|hors perimetre|out of scope)\b/
const APPLICABLE = /^(oui|yes|y|x|applicable|inclus|included|retenu|selected|true|1)$/
const NO = /^(non|no|n|false|0)$/
const IMPL_PARTIAL = /\b(partiel|partielle|partiellement|partial|partially|en cours|in progress|ongoing)\b/
const IMPL_NONE = /\b(non mis en (o|oe)uvre|not implemented|a faire|to do|planned|planifie|absent|missing)\b/
const IMPL_DONE = /\b(mis en (o|oe)uvre|implemented|en place|in place|done|realise|operational|operationnel)\b/

function readRow(cells: string[]): { id: string; entry: IsoControlEntry } | null {
  let id: string | null = null
  let idIndex = -1
  for (let i = 0; i < cells.length && !id; i += 1) {
    id = controlIdOf(cells[i])
    if (id) idIndex = i
  }
  if (!id) return null

  let applicability: IsoApplicability | undefined
  let implementation: IsoImplementation | undefined
  let justification: string | undefined
  const rest = cells.filter((_, i) => i !== idIndex)

  for (const raw of rest) {
    const c = norm(raw)
    if (!c) continue
    if (!applicability && NOT_APPLICABLE.test(c)) applicability = 'non_applicable'
    else if (!applicability && APPLICABLE.test(c)) applicability = 'applicable'
    else if (!applicability && NO.test(c)) applicability = 'non_applicable'
    else if (!implementation && IMPL_NONE.test(c)) implementation = 'non_mis_en_oeuvre'
    else if (!implementation && IMPL_PARTIAL.test(c)) implementation = 'partiel'
    else if (!implementation && IMPL_DONE.test(c)) implementation = 'mis_en_oeuvre'
    else if (!justification && raw.trim().length > 24 && !controlIdOf(raw)) justification = raw.trim().slice(0, 500)
  }
  if (implementation && !applicability) applicability = 'applicable'
  if (applicability === 'non_applicable') implementation = undefined
  if (!applicability) return null
  return { id, entry: { applicability, implementation, justification } }
}

// ---------------------------------------------------------------------------
// Tableurs
// ---------------------------------------------------------------------------

function splitDelimited(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const delimiter = firstLine.includes('\t') ? '\t' : (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ','
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"'
        i += 1
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === delimiter) {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

/** Lecteur ZIP minimal : répertoire central, entrées stockées ou compressées (deflate). */
async function unzip(buffer: ArrayBuffer): Promise<Map<string, string>> {
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)
  let eocd = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('zip')
  const count = view.getUint16(eocd + 10, true)
  let offset = view.getUint32(eocd + 16, true)
  const files = new Map<string, string>()
  const decoder = new TextDecoder('utf-8')
  for (let n = 0; n < count; n += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) break
    const method = view.getUint16(offset + 10, true)
    const compressed = view.getUint32(offset + 20, true)
    const nameLen = view.getUint16(offset + 28, true)
    const extraLen = view.getUint16(offset + 30, true)
    const commentLen = view.getUint16(offset + 32, true)
    const local = view.getUint32(offset + 42, true)
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLen))
    offset += 46 + nameLen + extraLen + commentLen
    if (!/^(xl\/(sharedStrings|worksheets\/sheet\d+)\.xml|content\.xml)$/.test(name)) continue
    const localNameLen = view.getUint16(local + 26, true)
    const localExtraLen = view.getUint16(local + 28, true)
    const start = local + 30 + localNameLen + localExtraLen
    const data = bytes.slice(start, start + compressed)
    if (method === 0) files.set(name, decoder.decode(data))
    else if (method === 8) {
      const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
      files.set(name, await new Response(stream).text())
    }
  }
  return files
}

function xlsxRows(files: Map<string, string>): string[][] {
  const parser = new DOMParser()
  const shared: string[] = []
  const ss = files.get('xl/sharedStrings.xml')
  if (ss) {
    const doc = parser.parseFromString(ss, 'application/xml')
    for (const si of Array.from(doc.getElementsByTagName('si'))) {
      shared.push(Array.from(si.getElementsByTagName('t')).map((t) => t.textContent ?? '').join(''))
    }
  }
  const rows: string[][] = []
  for (const [name, xml] of files) {
    if (!name.startsWith('xl/worksheets/')) continue
    const doc = parser.parseFromString(xml, 'application/xml')
    for (const r of Array.from(doc.getElementsByTagName('row'))) {
      const cells: string[] = []
      for (const c of Array.from(r.getElementsByTagName('c'))) {
        const t = c.getAttribute('t')
        const v = c.getElementsByTagName('v')[0]?.textContent ?? ''
        if (t === 's') cells.push(shared[Number(v)] ?? '')
        else if (t === 'inlineStr') cells.push(Array.from(c.getElementsByTagName('t')).map((x) => x.textContent ?? '').join(''))
        else cells.push(v)
      }
      rows.push(cells)
    }
  }
  return rows
}

function odsRows(files: Map<string, string>): string[][] {
  const xml = files.get('content.xml')
  if (!xml) return []
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const rows: string[][] = []
  for (const r of Array.from(doc.getElementsByTagName('table:table-row'))) {
    rows.push(Array.from(r.getElementsByTagName('table:table-cell')).map((c) => c.textContent ?? ''))
  }
  return rows
}

export async function parseSoa(file: File): Promise<SoaParseResult> {
  const name = file.name.toLowerCase()
  let rows: string[][]
  if (name.endsWith('.pdf')) return { entries: {}, recognized: 0, unreadable: true }
  try {
    if (name.endsWith('.xlsx') || name.endsWith('.ods')) {
      const files = await unzip(await file.arrayBuffer())
      rows = name.endsWith('.ods') ? odsRows(files) : xlsxRows(files)
    } else {
      rows = splitDelimited(await file.text())
    }
  } catch {
    return { entries: {}, recognized: 0, unreadable: true }
  }
  const entries: Record<string, IsoControlEntry> = {}
  for (const row of rows) {
    const read = readRow(row)
    if (read && !entries[read.id]) entries[read.id] = read.entry
  }
  const recognized = Object.keys(entries).length
  return { entries, recognized, unreadable: recognized === 0 }
}
